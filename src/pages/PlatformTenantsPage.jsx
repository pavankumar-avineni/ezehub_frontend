import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pause, Play, Trash2, UserCog } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import { formatINR } from '@/lib/features';
import { useCan } from '@/hooks/useFeature';
import { PERM } from '@/lib/permissions';
import { ErrorText, Pagination } from '@/components/inventory/common';
import { RateBadge, TrialText } from '@/components/billing/shared';
import CreateTenantDialog from '@/components/billing/CreateTenantDialog';
import AssignManagerDialog from '@/components/team/AssignManagerDialog';
import { EmployeeSelect } from '@/components/team/common';
import { PersonLink } from '@/components/team/OwnerCard';

export default function PlatformTenantsPage() {
  const navigate = useNavigate();
  const { can } = useCan();
  const [sp, setSp] = useSearchParams();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [assignOpen, setAssignOpen] = useState(false);
  const queryClient = useQueryClient();

  const accountManagerId = sp.get('accountManagerId') || '';
  const createdById = sp.get('createdById') || '';
  const unassigned = sp.get('unassigned') === 'true';
  const setFilter = (key, value) => {
    const next = new URLSearchParams(sp);
    if (value) next.set(key, value); else next.delete(key);
    // "unassigned only" and a specific manager cannot both apply
    if (key === 'unassigned' && value) next.delete('accountManagerId');
    if (key === 'accountManagerId' && value) next.delete('unassigned');
    setSp(next, { replace: true });
    setPage(1);
  };

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // The API already limits the list for employees without platform:tenants:view_all.
  const canViewAll = can(PERM.VIEW_ALL_TENANTS);
  const params = {
    page, limit: 20,
    ...(search && { search }),
    ...(accountManagerId && { accountManagerId }),
    ...(createdById && { createdById }),
    ...(unassigned && { unassigned: true }),
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['tenants', params],
    queryFn: async () => (await api.get('/platform/tenants', { params })).data,
  });

  useEffect(() => { setSelected(new Set()); }, [search, accountManagerId, createdById, unassigned, page]);

  const actionMutation = useMutation({
    mutationFn: ({ id, action }) => api.post(`/platform/tenants/${id}/${action}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenants'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/platform/tenants/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenants'] }),
  });

  const tenants = data?.data || [];
  const canBulk = can(PERM.ASSIGN_TENANTS) && canViewAll;
  const allSelected = tenants.length > 0 && tenants.every((t) => selected.has(t.id));
  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const showActions = can(PERM.TENANTS_SUSPEND) || can(PERM.TENANTS_ACTIVATE) || can(PERM.TENANTS_DELETE);
  const colSpan = 10 + (canBulk ? 1 : 0);

  return (
    <div>
      <PageHeader
        title="Tenants"
        description={canViewAll ? 'Manage accommodation businesses on the platform' : 'Tenants you created or maintain'}
        actions={can(PERM.TENANTS_CREATE) && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Tenant</Button>}
      />

      <div className="mb-4 flex flex-wrap items-start gap-3">
        <div className="relative min-w-[16rem] max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" placeholder="Search tenants..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
        {canViewAll && (
          <>
            <div className="w-64"><EmployeeSelect value={accountManagerId} onChange={(v) => setFilter('accountManagerId', v)} emptyLabel="Any account manager" activeOnly={false} /></div>
            <div className="w-64"><EmployeeSelect value={createdById} onChange={(v) => setFilter('createdById', v)} emptyLabel="Created by anyone" activeOnly={false} /></div>
            <label className="flex h-10 items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={unassigned} onChange={(e) => setFilter('unassigned', e.target.checked ? 'true' : '')} /> Unassigned only
            </label>
          </>
        )}
      </div>

      {canBulk && selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-blue-200/60 dark:border-blue-800/40 bg-blue-50/60 dark:bg-blue-900/20 px-4 py-2.5">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button size="sm" onClick={() => setAssignOpen(true)}><UserCog className="h-4 w-4" /> Assign to...</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}
      <ErrorText error={error || actionMutation.error || deleteMutation.error} />

      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {canBulk && <TableHead className="w-8"><input type="checkbox" aria-label="Select all" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(tenants.map((t) => t.id)))} /></TableHead>}
              <TableHead>Name</TableHead>
              <TableHead>Account manager</TableHead>
              <TableHead>Created by</TableHead>
              <TableHead>Rate / bed</TableHead>
              <TableHead>Beds</TableHead>
              <TableHead>Add-ons</TableHead>
              <TableHead>Est. monthly</TableHead>
              <TableHead>Trial</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              {showActions && <TableHead className="w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={colSpan + 1} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
            ) : tenants.length === 0 ? (
              <TableRow><TableCell colSpan={colSpan + 1} className="text-center py-8 text-slate-400">No tenants found</TableCell></TableRow>
            ) : tenants.map((tenant) => {
              const b = tenant.billing;
              return (
                <TableRow key={tenant.id} className="cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/20" onClick={() => navigate(`/tenants/${tenant.id}`)}>
                  {canBulk && <TableCell onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${tenant.name}`} checked={selected.has(tenant.id)} onChange={() => toggle(tenant.id)} /></TableCell>}
                  <TableCell>
                    <p className="font-semibold text-slate-800 dark:text-white">{tenant.name}</p>
                    <p className="text-xs text-slate-500">{tenant.email}</p>
                  </TableCell>
                  <TableCell className="text-sm"><PersonLink person={tenant.accountManager} /></TableCell>
                  <TableCell className="text-sm"><PersonLink person={tenant.createdBy} empty="Self sign-up" /></TableCell>
                  <TableCell>{b ? <div className="flex items-center gap-2">{formatINR(b.ratePerBed)} <RateBadge custom={b.isCustomRate} /></div> : '-'}</TableCell>
                  <TableCell>{b?.billableBeds ?? '-'}</TableCell>
                  <TableCell>{b?.enabledAddOns?.length ?? '-'}</TableCell>
                  <TableCell>{b ? formatINR(b.estimatedMonthlyAmount) : '-'}</TableCell>
                  <TableCell>{b ? <TrialText billing={b} /> : '-'}</TableCell>
                  <TableCell><StatusBadge status={tenant.status} /></TableCell>
                  <TableCell>{formatDate(tenant.createdAt)}</TableCell>
                  {showActions && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        {tenant.status === 'ACTIVE' && can(PERM.TENANTS_SUSPEND) && (
                          <Button variant="ghost" size="icon" title="Suspend" onClick={() => actionMutation.mutate({ id: tenant.id, action: 'suspend' })}><Pause className="h-4 w-4 text-amber-500" /></Button>
                        )}
                        {tenant.status === 'SUSPENDED' && can(PERM.TENANTS_ACTIVATE) && (
                          <Button variant="ghost" size="icon" title="Activate" onClick={() => actionMutation.mutate({ id: tenant.id, action: 'activate' })}><Play className="h-4 w-4 text-emerald-500" /></Button>
                        )}
                        {can(PERM.TENANTS_DELETE) && (
                          <Button variant="ghost" size="icon" title="Delete" onClick={() => { if (confirm(`Delete tenant "${tenant.name}"? This soft-deletes the account.`)) deleteMutation.mutate(tenant.id); }}>
                            <Trash2 className="h-4 w-4 text-red-400 hover:text-red-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Pagination pagination={data?.meta?.pagination} onPage={setPage} />
      </div>

      <CreateTenantDialog open={open} onOpenChange={setOpen} />
      <AssignManagerDialog open={assignOpen} onOpenChange={setAssignOpen} tenantIds={[...selected]} onDone={() => setSelected(new Set())} />
    </div>
  );
}
