import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Network, Plus, Search } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ErrorText, NativeSelect, Pagination, formatDateTime } from '@/components/inventory/common';
import { CodeChip } from '@/components/inventory/common';
import { EMPLOYEE_STATUSES } from '@/components/team/common';
import EmployeeFormDialog, { useRoles } from '@/components/team/EmployeeFormDialog';
import { useCan } from '@/hooks/useFeature';
import { PERM } from '@/lib/permissions';
import { cn } from '@/lib/utils';

export default function EmployeesPage() {
  const navigate = useNavigate();
  const { can } = useCan();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: '', roleId: '', department: '', isActive: '' });
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const { data: roles } = useRoles();

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const set = (k) => (e) => { setFilters((f) => ({ ...f, [k]: e.target.value })); setPage(1); };
  const params = { page, limit: 20, sortBy: 'employeeCode', sortOrder: 'asc', ...(search && { search }), ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')) };

  const { data, isLoading, error } = useQuery({
    queryKey: ['employees', params],
    queryFn: async () => (await api.get('/platform/employees', { params })).data,
  });
  const rows = data?.data || [];

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Your platform team"
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/org-chart')}><Network className="h-4 w-4" /> Org chart</Button>
            {can(PERM.EMPLOYEES_MANAGE) && <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Add employee</Button>}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[16rem] max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" placeholder="Search name, email, code, department..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
        <NativeSelect className="w-40" value={filters.status} onChange={set('status')} aria-label="Status">
          <option value="">All statuses</option>
          {EMPLOYEE_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </NativeSelect>
        <NativeSelect className="w-48" value={filters.roleId} onChange={set('roleId')} aria-label="Role">
          <option value="">All roles</option>
          {(roles || []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </NativeSelect>
        <Input className="w-44" placeholder="Department" value={filters.department} onChange={set('department')} />
        <NativeSelect className="w-36" value={filters.isActive} onChange={set('isActive')} aria-label="Active">
          <option value="">Active + inactive</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </NativeSelect>
      </div>
      <ErrorText error={error} />

      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead><TableHead>Designation</TableHead><TableHead>Department</TableHead><TableHead>Role</TableHead>
              <TableHead>Reports to</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Tenants</TableHead><TableHead>Last login</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-400">No employees found</TableCell></TableRow>
              : rows.map((e) => (
                <TableRow key={e.id} className={cn('cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/20', e.employeeStatus === 'EXITED' && 'opacity-50')} onClick={() => navigate(`/employees/${e.id}`)}>
                  <TableCell>
                    <div className="flex items-center gap-2"><CodeChip>{e.employeeCode}</CodeChip></div>
                    <p className="font-semibold text-slate-800 dark:text-white mt-1">{e.name}</p>
                    <p className="text-xs text-slate-500">{e.email}</p>
                  </TableCell>
                  <TableCell>{e.designation || '-'}</TableCell>
                  <TableCell>{e.department || '-'}</TableCell>
                  <TableCell>{e.role?.name || '-'}</TableCell>
                  <TableCell>{e.reportsTo ? `${e.reportsTo.name}` : '-'}</TableCell>
                  <TableCell><StatusBadge status={e.employeeStatus} /></TableCell>
                  <TableCell className="text-right">{e.tenantsManaged ?? '-'}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{e.lastLoginAt ? formatDateTime(e.lastLoginAt) : 'Never'}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <Pagination pagination={data?.meta?.pagination} onPage={setPage} />
      </div>

      <EmployeeFormDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={(emp) => emp?.id && navigate(`/employees/${emp.id}`)} />
    </div>
  );
}
