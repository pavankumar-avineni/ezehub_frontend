import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CodeChip, DetailField, ErrorText, Pagination, SectionTitle, TabBar, formatDateTime } from '@/components/inventory/common';
import { NoAccessPage, fullName } from '@/components/team/common';
import { ActivityTable, LoginHistoryTable } from '@/components/team/Logs';
import EmployeeActions from '@/components/team/EmployeeActions';
import { useCan } from '@/hooks/useFeature';
import { PERM } from '@/lib/permissions';
import { formatDate } from '@/lib/utils';
import { formatINR } from '@/lib/features';
import { cn } from '@/lib/utils';

function EmployeeTenants({ id }) {
  const [relation, setRelation] = useState('managed');
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useQuery({
    queryKey: ['employee-tenants', id, relation, page],
    queryFn: async () => (await api.get(`/platform/employees/${id}/tenants`, { params: { relation, page, limit: 20 } })).data,
  });
  const rows = data?.data || [];
  return (
    <div className="space-y-4">
      <TabBar
        tabs={[{ value: 'managed', label: 'Maintains' }, { value: 'created', label: 'Created' }, { value: 'all', label: 'All' }]}
        value={relation} onChange={(v) => { setRelation(v); setPage(1); }}
      />
      <ErrorText error={error} />
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Tenant</TableHead><TableHead>Status</TableHead><TableHead>Subscription</TableHead><TableHead>Rate / bed</TableHead><TableHead>Relation</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">No tenants</TableCell></TableRow>
              : rows.map((t) => (
                <TableRow key={t.id}>
                  <TableCell><Link className="font-semibold text-blue-600 hover:underline" to={`/tenants/${t.id}`}>{t.name}</Link><p className="text-xs text-slate-500">{t.email}</p></TableCell>
                  <TableCell><StatusBadge status={t.status} /></TableCell>
                  <TableCell>{t.subscription?.status ? <StatusBadge status={t.subscription.status} /> : '-'}</TableCell>
                  <TableCell>{t.subscription?.ratePerBed != null ? formatINR(t.subscription.ratePerBed) : '-'}</TableCell>
                  <TableCell className="text-xs">{[t.isManager && 'Account manager', t.isCreator && 'Creator'].filter(Boolean).join(' · ')}</TableCell>
                  <TableCell className="text-xs">{formatDate(t.createdAt)}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <Pagination pagination={data?.meta?.pagination} onPage={setPage} />
      </div>
    </div>
  );
}

function AccessTab({ employee }) {
  const perms = employee.permissions || [];
  const items = perms.map((p) => (typeof p === 'string' ? { code: p, name: p, group: 'Permissions' } : { group: 'Permissions', ...p }));
  const groups = items.reduce((acc, p) => { (acc[p.group] ||= []).push(p); return acc; }, {});
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">Role: <b>{employee.role?.name}</b> · {items.length} permissions</p>
      {Object.entries(groups).map(([group, list]) => (
        <div key={group}>
          <SectionTitle className="mb-2">{group}</SectionTitle>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {list.map((p) => (
              <div key={p.code} className="rounded-xl border border-blue-100/70 dark:border-blue-900/30 px-3 py-2">
                <p className="text-sm font-medium text-slate-800 dark:text-white">{p.name}</p>
                <p className="text-[11px] text-slate-500">{p.code}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Overview({ e }) {
  return (
    <div className="space-y-6">
      <div>
        <SectionTitle>Job</SectionTitle>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <DetailField label="Designation" value={e.designation} />
          <DetailField label="Department" value={e.department} />
          <DetailField label="Employment type" value={e.employmentType?.replace('_', ' ')} />
          <DetailField label="Joining date" value={e.joiningDate ? formatDate(e.joiningDate) : null} />
          <DetailField label="Last login" value={e.lastLoginAt ? formatDateTime(e.lastLoginAt) : 'Never'} />
          <DetailField label="Created" value={formatDate(e.createdAt)} />
          <DetailField label="Created by" value={e.createdBy ? fullName(e.createdBy) : null} />
          {e.employeeStatus === 'EXITED' && <DetailField label="Exit date" value={e.exitDate ? formatDate(e.exitDate) : null} />}
          {e.employeeStatus === 'EXITED' && <DetailField label="Exit reason" value={e.exitReason} />}
        </div>
      </div>
      <div>
        <SectionTitle>Reporting line</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <span className="text-xs text-slate-500">Reports to</span>
            <p className="text-sm font-medium">{e.reportsTo ? <Link className="text-blue-600 hover:underline" to={`/employees/${e.reportsTo.id}`}>{e.reportsTo.name} ({e.reportsTo.employeeCode})</Link> : '-'}</p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Direct reports ({e.directReports?.length || 0})</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {(e.directReports || []).length === 0 ? <span className="text-sm">-</span> : e.directReports.map((d) => (
                <Link key={d.id} to={`/employees/${d.id}`} className="rounded-lg bg-blue-50 dark:bg-blue-900/30 px-2 py-1 text-xs text-blue-700 dark:text-blue-300">{d.name} ({d.employeeCode})</Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div>
        <SectionTitle>Contact</SectionTitle>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <DetailField label="Work email" value={e.email} />
          <DetailField label="Work phone" value={e.phone} />
          <DetailField label="Personal email" value={e.personalEmail} />
          <DetailField label="Personal phone" value={e.personalPhone} />
          <DetailField label="Address" value={[e.address, e.city, e.state, e.pincode].filter(Boolean).join(', ')} />
        </div>
      </div>
      <div>
        <SectionTitle>Emergency contact & ID</SectionTitle>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <DetailField label="Emergency contact" value={e.emergencyContact?.name} />
          <DetailField label="Relation" value={e.emergencyContact?.relation} />
          <DetailField label="Phone" value={e.emergencyContact?.phone} />
          <DetailField label="ID proof type" value={e.idProofType} />
          {/* Masked by the API unless you can manage employees. Shown exactly as received. */}
          <DetailField label="ID proof number" value={e.idProofNumber} />
        </div>
      </div>
      <div>
        <SectionTitle>Workload</SectionTitle>
        <div className="grid grid-cols-3 gap-4">
          <DetailField label="Tenants maintained" value={e.stats?.tenantsManaged ?? 0} />
          <DetailField label="Active tenants maintained" value={e.stats?.activeTenantsManaged ?? 0} />
          <DetailField label="Tenants created" value={e.stats?.tenantsCreated ?? 0} />
        </div>
      </div>
      {e.notes && <div><SectionTitle>Notes</SectionTitle><p className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">{e.notes}</p></div>}
    </div>
  );
}

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const { can } = useCan();
  const [tab, setTab] = useState('overview');
  const { data: e, isLoading, error } = useQuery({
    queryKey: ['employee', id],
    queryFn: async () => (await api.get(`/platform/employees/${id}`)).data.data,
  });

  if (error?.response?.status === 404) return <NoAccessPage message="Employee not found." />;
  const tabs = [
    { value: 'overview', label: 'Overview' },
    { value: 'tenants', label: 'Tenants' },
    ...(can(PERM.AUDIT_READ) ? [{ value: 'activity', label: 'Activity' }, { value: 'signins', label: 'Sign-ins' }] : []),
    { value: 'access', label: 'Access' },
  ];

  return (
    <div>
      <Link to="/employees" className="mb-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"><ArrowLeft className="h-4 w-4" /> Back to employees</Link>
      <ErrorText error={error} />
      {isLoading ? <p className="py-10 text-center text-slate-400">Loading...</p> : e && (
        <>
          <PageHeader
            title={e.name}
            description={[e.designation, e.department].filter(Boolean).join(' · ') || e.email}
            actions={
              <>
                <CodeChip>{e.employeeCode}</CodeChip>
                <StatusBadge status={e.employeeStatus} />
                {e.role && <span className="rounded-lg bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-600">{e.role.name}</span>}
                {e.mustChangePassword && <span className="rounded-lg bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600">Password change pending</span>}
                {can(PERM.EMPLOYEES_MANAGE) && <EmployeeActions employee={e} />}
              </>
            }
          />
          <div className={cn('space-y-5', e.employeeStatus === 'EXITED' && 'opacity-90')}>
            <TabBar tabs={tabs} value={tab} onChange={setTab} />
            <div className="glass-card p-6">
              {tab === 'overview' && <Overview e={e} />}
              {tab === 'tenants' && <EmployeeTenants id={id} />}
              {tab === 'activity' && <ActivityTable endpoint={`/platform/employees/${id}/activity`} scopeKey={id} showActorFilter={false} />}
              {tab === 'signins' && <LoginHistoryTable endpoint={`/platform/employees/${id}/logins`} scopeKey={id} showUserFilter={false} />}
              {tab === 'access' && <AccessTab employee={e} />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
