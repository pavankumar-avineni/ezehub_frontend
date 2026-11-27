import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Check, X, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';
import { formatINR } from '@/lib/features';
import { useIsSuperAdmin } from '@/hooks/useFeature';
import { ErrorText, NativeSelect } from '@/components/inventory/common';
import { InvoiceDetail, ReadOnlyNote } from '@/components/billing/shared';
import GenerateInvoiceDialog from '@/components/billing/GenerateInvoiceDialog';

export default function PlatformBillingPage() {
  const canEdit = useIsSuperAdmin();
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [rejectDialog, setRejectDialog] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [generateOpen, setGenerateOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const queryClient = useQueryClient();

  const { data: analytics } = useQuery({
    queryKey: ['subscription-analytics'],
    queryFn: async () => (await api.get('/subscription/admin/analytics')).data.data,
  });

  const { data: tenants } = useQuery({
    queryKey: ['tenants-for-billing'],
    queryFn: async () => (await api.get('/platform/tenants', { params: { limit: 200 } })).data.data,
  });

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['tenant-invoices', selectedTenantId],
    queryFn: async () => (await api.get(`/subscription/admin/invoices/${selectedTenantId}`)).data.data,
    enabled: !!selectedTenantId,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['tenant-invoices'] });
    queryClient.invalidateQueries({ queryKey: ['subscription-analytics'] });
  };

  const confirmMutation = useMutation({
    mutationFn: (invoiceId) => api.post(`/subscription/admin/invoices/${invoiceId}/confirm`),
    onSuccess: refresh,
  });

  const rejectMutation = useMutation({
    mutationFn: ({ invoiceId, reason }) => api.post(`/subscription/admin/invoices/${invoiceId}/reject`, { reason }),
    onSuccess: () => { refresh(); setRejectDialog(null); setRejectReason(''); },
  });

  const holdMutation = useMutation({
    mutationFn: (tenantId) => api.post(`/subscription/admin/${tenantId}/hold`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tenants-for-billing'] }); refresh(); },
  });

  const dismissMutation = useMutation({
    mutationFn: (tenantId) => api.post(`/subscription/admin/${tenantId}/dismiss`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tenants-for-billing'] }); refresh(); },
  });

  return (
    <div>
      <PageHeader title="Billing & Subscriptions" description="Generate invoices, confirm payments, manage tenant access" />
      <div className="mb-4"><ReadOnlyNote show={!canEdit} /></div>

      {analytics && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
          <StatCard title="Active" value={analytics.active} icon={Check} />
          <StatCard title="On Hold" value={analytics.onHold} icon={AlertTriangle} />
          <StatCard title="Expiring Soon" value={analytics.expiringSoon} icon={AlertTriangle} />
          <StatCard title="Monthly Revenue" value={formatINR(analytics.monthlyRevenue)} icon={Plus} />
        </div>
      )}

      <div className="mb-6">
        <Label className="mb-2 block">Select Tenant</Label>
        <div className="flex flex-wrap gap-3">
          <NativeSelect className="flex-1 min-w-[16rem]" value={selectedTenantId} onChange={(e) => { setSelectedTenantId(e.target.value); setExpanded(null); }}>
            <option value="">Choose a tenant...</option>
            {(tenants || []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.status}){t.billing ? ` — ${formatINR(t.billing.ratePerBed)}/bed, ${t.billing.billableBeds} beds` : ''}
              </option>
            ))}
          </NativeSelect>
          {selectedTenantId && (
            <>
              <Button variant="outline" asChild><Link to={`/tenants/${selectedTenantId}`}>Billing & Features</Link></Button>
              {canEdit && (
                <>
                  <Button onClick={() => setGenerateOpen(true)}><Plus className="h-4 w-4" /> Generate Invoice</Button>
                  <Button variant="outline" onClick={() => holdMutation.mutate(selectedTenantId)} disabled={holdMutation.isPending}>Hold</Button>
                  <Button variant="destructive" onClick={() => { if (confirm('Permanently dismiss this tenant?')) dismissMutation.mutate(selectedTenantId); }}>Dismiss</Button>
                </>
              )}
            </>
          )}
        </div>
        <div className="mt-2"><ErrorText error={confirmMutation.error || holdMutation.error || dismissMutation.error} /></div>
      </div>

      {selectedTenantId && (
        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" /><TableHead>Invoice</TableHead><TableHead>Beds × Rate</TableHead><TableHead>Total</TableHead><TableHead>Period</TableHead><TableHead>Status</TableHead><TableHead>Proof</TableHead><TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
                : !invoices?.length ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-400">No invoices. Generate one above.</TableCell></TableRow>
                : invoices.map((inv) => {
                  const open = expanded === inv.id;
                  const legacy = !inv.lineItems?.length;
                  return (
                    <Fragment key={inv.id}>
                      <TableRow className="cursor-pointer" onClick={() => setExpanded(open ? null : inv.id)}>
                        <TableCell>{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                        <TableCell className="font-semibold text-slate-800 dark:text-white">{inv.invoiceNumber}</TableCell>
                        <TableCell>{legacy ? <span className="text-xs text-slate-500">{inv.legacyPlan ? `${inv.legacyPlan} (legacy)` : 'Legacy'}</span> : `${inv.bedCount} × ${formatINR(inv.ratePerBed)}`}</TableCell>
                        <TableCell>{formatINR(inv.total)}</TableCell>
                        <TableCell className="text-xs">{formatDate(inv.billingStart)} — {formatDate(inv.billingEnd)}</TableCell>
                        <TableCell><StatusBadge status={inv.status} /></TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {inv.paymentProofUrl ? <a href={inv.paymentProofUrl} target="_blank" rel="noreferrer" className="text-blue-600 text-xs underline">View</a> : '-'}
                          {inv.transactionId && <p className="text-xs text-slate-500">TXN: {inv.transactionId}</p>}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {canEdit && (inv.status === 'PENDING' || inv.status === 'PARTIAL') && inv.transactionId && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" title="Confirm" onClick={() => confirmMutation.mutate(inv.id)}><Check className="h-4 w-4 text-emerald-500" /></Button>
                              <Button variant="ghost" size="icon" title="Reject" onClick={() => setRejectDialog(inv.id)}><X className="h-4 w-4 text-red-500" /></Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                      {open && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-blue-50/30 dark:bg-slate-900/30"><InvoiceDetail invoice={inv} /></TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      )}

      <GenerateInvoiceDialog tenantId={selectedTenantId} open={generateOpen} onOpenChange={setGenerateOpen} />

      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Reason for rejection</Label>
            <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Invalid transaction, amount mismatch..." />
            <ErrorText error={rejectMutation.error} />
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={() => rejectMutation.mutate({ invoiceId: rejectDialog, reason: rejectReason })} disabled={!rejectReason.trim()}>Reject & Notify Tenant</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
