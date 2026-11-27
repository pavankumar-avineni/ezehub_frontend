import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { StatusBadge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ErrorText, Field, NativeSelect, Pagination, formatDateTime } from '@/components/inventory/common';
import { EmployeeSelect, eventLabel, failureLabel, parseBrowser, personLabel } from '@/components/team/common';

const PAGE_SIZE = 20;

function useTenantOptions() {
  return useQuery({
    queryKey: ['tenant-options'],
    queryFn: async () => (await api.get('/platform/tenants', { params: { limit: 100 } })).data.data,
    staleTime: 60000,
  });
}

const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v !== undefined && v !== null));
// A date input value becomes an ISO range boundary.
const fromIso = (d) => (d ? new Date(`${d}T00:00:00`).toISOString() : '');
const toIso = (d) => (d ? new Date(`${d}T23:59:59.999`).toISOString() : '');

/** Activity log. `endpoint` defaults to the platform log; pass an employee endpoint to scope it. */
export function ActivityTable({ endpoint = '/platform/audit-logs', scopeKey = 'all', showActorFilter = true }) {
  const [filters, setFilters] = useState({ actorId: '', tenantId: '', event: '', from: '', to: '', search: '' });
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const set = (k) => (v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };

  const { data: events } = useQuery({
    queryKey: ['audit-events'],
    queryFn: async () => (await api.get('/platform/audit-logs/events')).data.data,
    staleTime: 5 * 60000,
  });
  const { data: tenants } = useTenantOptions();

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit-logs', scopeKey, filters, page],
    queryFn: async () => (await api.get(endpoint, {
      params: clean({ ...filters, from: fromIso(filters.from), to: toIso(filters.to), page, limit: PAGE_SIZE }),
    })).data,
  });
  const rows = data?.data || [];
  const eventList = Array.isArray(events) ? events.map((e) => (typeof e === 'string' ? e : e.event || e.name)) : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Input placeholder="Search activity..." value={filters.search} onChange={(e) => set('search')(e.target.value)} className="xl:col-span-2" />
        {showActorFilter && <EmployeeSelect value={filters.actorId} onChange={set('actorId')} emptyLabel="All employees" activeOnly={false} />}
        <NativeSelect value={filters.tenantId} onChange={(e) => set('tenantId')(e.target.value)} aria-label="Tenant">
          <option value="">All tenants</option>
          {(tenants || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </NativeSelect>
        <NativeSelect value={filters.event} onChange={(e) => set('event')(e.target.value)} aria-label="Event">
          <option value="">All events</option>
          {eventList.map((e) => <option key={e} value={e}>{eventLabel(e)}</option>)}
        </NativeSelect>
        <div className="flex items-center gap-2">
          <Input type="date" value={filters.from} onChange={(e) => set('from')(e.target.value)} aria-label="From" />
          <Input type="date" value={filters.to} onChange={(e) => set('to')(e.target.value)} aria-label="To" />
        </div>
      </div>
      <ErrorText error={error} />

      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow><TableHead className="w-8" /><TableHead>Activity</TableHead><TableHead>By</TableHead><TableHead>Tenant</TableHead><TableHead>When</TableHead><TableHead>IP</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">No activity found</TableCell></TableRow>
              : rows.map((r) => {
                const isOpen = open === r.id;
                const hasDetails = r.details && Object.keys(r.details).length > 0;
                return (
                  <Fragment key={r.id}>
                    <TableRow className="cursor-pointer" onClick={() => setOpen(isOpen ? null : r.id)}>
                      <TableCell>{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                      <TableCell className="max-w-md">
                        <p className="text-sm text-slate-800 dark:text-white">{r.summary || eventLabel(r.event)}</p>
                        <p className="text-xs text-slate-500">{eventLabel(r.event)}</p>
                      </TableCell>
                      <TableCell>
                        {r.actor ? (
                          <div>
                            <p className="text-sm font-medium">{r.actor.name}{r.actor.employeeCode ? ` (${r.actor.employeeCode})` : ''}</p>
                            <p className="text-xs text-slate-500">{r.actor.role?.name || r.actor.role || r.actor.designation || ''}</p>
                          </div>
                        ) : <span className="text-slate-400">System</span>}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {r.tenant ? <Link className="text-blue-600 hover:underline" to={`/tenants/${r.tenant.id}`}>{r.tenant.name}</Link> : '-'}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{formatDateTime(r.createdAt)}</TableCell>
                      <TableCell className="text-xs">{r.ipAddress || '-'}</TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-blue-50/30 dark:bg-slate-900/30 text-xs space-y-1">
                          <p><b>Entity:</b> {r.entity || '-'} {r.entityId ? `· ${r.entityId}` : ''}</p>
                          <p><b>Browser:</b> {parseBrowser(r.userAgent)}</p>
                          {hasDetails ? <pre className="whitespace-pre-wrap break-words rounded-lg bg-white/60 dark:bg-slate-800/60 p-2">{JSON.stringify(r.details, null, 2)}</pre> : <p className="text-slate-400">No extra details</p>}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
          </TableBody>
        </Table>
        <Pagination pagination={data?.meta?.pagination} onPage={setPage} />
      </div>
    </div>
  );
}

/** Sign-in history. `endpoint` defaults to the platform history. */
export function LoginHistoryTable({ endpoint = '/platform/login-history', scopeKey = 'all', showUserFilter = true }) {
  const [filters, setFilters] = useState({ userId: '', success: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const set = (k) => (v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };

  const { data, isLoading, error } = useQuery({
    queryKey: ['login-history', scopeKey, filters, page],
    queryFn: async () => (await api.get(endpoint, {
      params: clean({ ...filters, from: fromIso(filters.from), to: toIso(filters.to), page, limit: PAGE_SIZE }),
    })).data,
  });
  const rows = data?.data || [];

  // Repeated failures for the same email within the loaded page.
  const failureCounts = useMemo(() => {
    const m = {};
    rows.forEach((r) => { if (!r.success) m[r.email] = (m[r.email] || 0) + 1; });
    return m;
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {showUserFilter && <EmployeeSelect value={filters.userId} onChange={set('userId')} emptyLabel="All employees" activeOnly={false} />}
        <NativeSelect value={filters.success} onChange={(e) => set('success')(e.target.value)} aria-label="Result">
          <option value="">All results</option>
          <option value="true">Successful</option>
          <option value="false">Failed</option>
        </NativeSelect>
        <Field><Input type="date" value={filters.from} onChange={(e) => set('from')(e.target.value)} aria-label="From" /></Field>
        <Field><Input type="date" value={filters.to} onChange={(e) => set('to')(e.target.value)} aria-label="To" /></Field>
      </div>
      <ErrorText error={error} />

      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Employee</TableHead><TableHead>Email</TableHead><TableHead>Result</TableHead><TableHead>IP</TableHead><TableHead>Browser</TableHead><TableHead>When</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">No sign-ins found</TableCell></TableRow>
              : rows.map((r) => {
                const repeated = !r.success && failureCounts[r.email] >= 3;
                return (
                  <TableRow key={r.id} className={repeated ? 'bg-red-50/60 dark:bg-red-900/10' : ''}>
                    <TableCell>{r.employee ? <Link className="text-blue-600 hover:underline" to={`/employees/${r.employee.id}`}>{personLabel(r.employee)}</Link> : <span className="text-slate-400">Unknown</span>}</TableCell>
                    <TableCell className="text-sm">{r.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={r.success ? 'SUCCESS' : 'FAILED'} />
                        {!r.success && r.failureReason && <span className="text-xs text-slate-500">{failureLabel(r.failureReason)}</span>}
                        {repeated && <span className="rounded-md bg-red-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-red-600">{failureCounts[r.email]} failures</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{r.ipAddress || '-'}</TableCell>
                    <TableCell className="text-xs">{parseBrowser(r.userAgent)}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{formatDateTime(r.createdAt)}</TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
        <Pagination pagination={data?.meta?.pagination} onPage={setPage} />
      </div>
    </div>
  );
}
