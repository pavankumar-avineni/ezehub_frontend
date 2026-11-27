import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pause, Play, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import { formatINR } from '@/lib/features';
import { useIsSuperAdmin } from '@/hooks/useFeature';
import { ErrorText, Pagination } from '@/components/inventory/common';
import { RateBadge, TrialText } from '@/components/billing/shared';
import CreateTenantDialog from '@/components/billing/CreateTenantDialog';

export default function PlatformTenantsPage() {
  const navigate = useNavigate();
  const canEdit = useIsSuperAdmin();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['tenants', search, page],
    queryFn: async () => (await api.get('/platform/tenants', { params: { search, page, limit: 20 } })).data,
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }) => api.post(`/platform/tenants/${id}/${action}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenants'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/platform/tenants/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenants'] }),
  });

  const tenants = data?.data || [];

  return (
    <div>
      <PageHeader
        title="Tenants"
        description="Manage accommodation businesses on the platform"
        actions={canEdit && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Tenant</Button>}
      />

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input className="pl-9" placeholder="Search tenants..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>
      <ErrorText error={actionMutation.error || deleteMutation.error} />

      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Rate / bed</TableHead>
              <TableHead>Beds</TableHead>
              <TableHead>Add-ons</TableHead>
              <TableHead>Est. monthly</TableHead>
              <TableHead>Trial</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
            ) : tenants.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-slate-400">No tenants found</TableCell></TableRow>
            ) : tenants.map((tenant) => {
              const b = tenant.billing;
              return (
                <TableRow key={tenant.id} className="cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/20" onClick={() => navigate(`/tenants/${tenant.id}`)}>
                  <TableCell>
                    <p className="font-semibold text-slate-800 dark:text-white">{tenant.name}</p>
                    <p className="text-xs text-slate-500">{tenant.email}</p>
                  </TableCell>
                  <TableCell>
                    {b ? <div className="flex items-center gap-2">{formatINR(b.ratePerBed)} <RateBadge custom={b.isCustomRate} /></div> : '-'}
                  </TableCell>
                  <TableCell>{b?.billableBeds ?? '-'}</TableCell>
                  <TableCell>{b?.enabledAddOns?.length ?? '-'}</TableCell>
                  <TableCell>{b ? formatINR(b.estimatedMonthlyAmount) : '-'}</TableCell>
                  <TableCell>{b ? <TrialText billing={b} /> : '-'}</TableCell>
                  <TableCell><StatusBadge status={tenant.status} /></TableCell>
                  <TableCell>{formatDate(tenant.createdAt)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {canEdit && (
                      <div className="flex gap-1">
                        {tenant.status === 'ACTIVE' ? (
                          <Button variant="ghost" size="icon" title="Suspend" onClick={() => actionMutation.mutate({ id: tenant.id, action: 'suspend' })}>
                            <Pause className="h-4 w-4 text-amber-500" />
                          </Button>
                        ) : tenant.status === 'SUSPENDED' ? (
                          <Button variant="ghost" size="icon" title="Activate" onClick={() => actionMutation.mutate({ id: tenant.id, action: 'activate' })}>
                            <Play className="h-4 w-4 text-emerald-500" />
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="icon" title="Delete" onClick={() => { if (confirm(`Delete tenant "${tenant.name}"? This soft-deletes the account.`)) deleteMutation.mutate(tenant.id); }}>
                          <Trash2 className="h-4 w-4 text-red-400 hover:text-red-600" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Pagination pagination={data?.meta?.pagination} onPage={setPage} />
      </div>

      <CreateTenantDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
