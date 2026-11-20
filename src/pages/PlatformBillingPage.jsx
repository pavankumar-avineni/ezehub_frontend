import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Check, X, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function PlatformBillingPage() {
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [rejectDialog, setRejectDialog] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
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

  const generateMutation = useMutation({
    mutationFn: (tenantId) => api.post(`/subscription/admin/invoices/${tenantId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenant-invoices'] }),
  });

  const confirmMutation = useMutation({
    mutationFn: (invoiceId) => api.post(`/subscription/admin/invoices/${invoiceId}/confirm`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenant-invoices', 'subscription-analytics'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ invoiceId, reason }) => api.post(`/subscription/admin/invoices/${invoiceId}/reject`, { reason }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tenant-invoices'] }); setRejectDialog(null); setRejectReason(''); },
  });

  const holdMutation = useMutation({
    mutationFn: (tenantId) => api.post(`/subscription/admin/${tenantId}/hold`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenants-for-billing'] }),
  });

  const dismissMutation = useMutation({
    mutationFn: (tenantId) => api.post(`/subscription/admin/${tenantId}/dismiss`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenants-for-billing'] }),
  });

  return (
    <div>
      <PageHeader title="Billing & Subscriptions" description="Generate invoices, confirm payments, manage tenant access" />

      {/* Analytics */}
      {analytics && (
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <StatCard title="Active" value={analytics.active} icon={Check} />
          <StatCard title="On Hold" value={analytics.onHold} icon={AlertTriangle} />
          <StatCard title="Expiring Soon" value={analytics.expiringSoon} icon={AlertTriangle} />
          <StatCard title="Monthly Revenue" value={formatCurrency(analytics.monthlyRevenue)} icon={Plus} />
        </div>
      )}

      {/* Tenant Selector */}
      <div className="mb-6">
        <Label className="mb-2 block">Select Tenant</Label>
        <div className="flex gap-3">
          <select className="flex h-10 flex-1 rounded-xl border border-blue-200/50 dark:border-blue-800/30 bg-white/70 dark:bg-slate-800/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40" value={selectedTenantId} onChange={(e) => setSelectedTenantId(e.target.value)}>
            <option value="">Choose a tenant...</option>
            {(tenants || []).map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.status}) — {t.subscription?.plan || 'No plan'}</option>
            ))}
          </select>
          {selectedTenantId && (
            <>
              <Button onClick={() => generateMutation.mutate(selectedTenantId)} disabled={generateMutation.isPending}>
                <Plus className="h-4 w-4" /> Generate Invoice
              </Button>
              <Button variant="outline" onClick={() => holdMutation.mutate(selectedTenantId)}>Hold</Button>
              <Button variant="destructive" onClick={() => { if (confirm('Permanently dismiss this tenant?')) dismissMutation.mutate(selectedTenantId); }}>Dismiss</Button>
            </>
          )}
        </div>
      </div>

      {/* Invoices Table */}
      {selectedTenantId && (
        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Invoice</TableHead><TableHead>Plan</TableHead><TableHead>Amount</TableHead><TableHead>Period</TableHead><TableHead>Status</TableHead><TableHead>Proof</TableHead><TableHead>Actions</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
                : !invoices?.length ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">No invoices. Generate one above.</TableCell></TableRow>
                : invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-semibold text-slate-800 dark:text-white">{inv.invoiceNumber}</TableCell>
                    <TableCell>{inv.plan}</TableCell>
                    <TableCell>{formatCurrency(inv.total)}</TableCell>
                    <TableCell className="text-xs">{formatDate(inv.billingStart)} — {formatDate(inv.billingEnd)}</TableCell>
                    <TableCell><StatusBadge status={inv.status} /></TableCell>
                    <TableCell>
                      {inv.paymentProofUrl ? <a href={inv.paymentProofUrl} target="_blank" rel="noreferrer" className="text-blue-600 text-xs underline">View</a> : '-'}
                      {inv.transactionId && <p className="text-xs text-slate-500">TXN: {inv.transactionId}</p>}
                    </TableCell>
                    <TableCell>
                      {(inv.status === 'PENDING' || inv.status === 'PARTIAL') && inv.transactionId && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" title="Confirm" onClick={() => confirmMutation.mutate(inv.id)}><Check className="h-4 w-4 text-emerald-500" /></Button>
                          <Button variant="ghost" size="icon" title="Reject" onClick={() => setRejectDialog(inv.id)}><X className="h-4 w-4 text-red-500" /></Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Reason for rejection</Label>
            <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Invalid transaction, amount mismatch..." />
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={() => rejectMutation.mutate({ invoiceId: rejectDialog, reason: rejectReason })} disabled={!rejectReason.trim()}>Reject & Notify Tenant</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
