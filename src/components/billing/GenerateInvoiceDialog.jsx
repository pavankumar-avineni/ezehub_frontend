import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorText } from '@/components/inventory/common';
import { LineItemsTable } from '@/components/billing/shared';
import { formatDate } from '@/lib/utils';

/** Preview of the next invoice, then generate it from the tenant's CURRENT beds, rate, add-ons and tax. */
export default function GenerateInvoiceDialog({ tenantId, open, onOpenChange, onGenerated }) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-pricing', tenantId],
    queryFn: async () => (await api.get(`/subscription/admin/${tenantId}/pricing`)).data.data,
    enabled: open && !!tenantId,
  });

  const mutation = useMutation({
    mutationFn: () => api.post(`/subscription/admin/invoices/${tenantId}`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-analytics'] });
      onGenerated?.(res.data.data);
      onOpenChange(false);
    },
  });

  const est = data?.estimatedNextInvoice;
  const sub = data?.subscription;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) mutation.reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Invoice{data?.tenant ? ` for ${data.tenant.name}` : ''}</DialogTitle>
          <DialogDescription>
            Uses the current beds, rate, enabled add-ons and tax. The period starts when the trial or paid period ends and lasts 30 days.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? <p className="py-6 text-center text-slate-400">Loading preview...</p>
          : error ? <ErrorText error={error} />
          : est ? (
            <div className="space-y-3">
              {sub?.isTrial && <p className="text-xs text-violet-600">On trial until {formatDate(sub.trialEndsAt)}. The invoice period will start after the trial.</p>}
              <p className="text-xs text-slate-500">{est.beds} billable beds at {est.taxPercent}% tax</p>
              <LineItemsTable lines={est.lines} amount={est.amount} tax={est.tax} taxPercent={est.taxPercent} total={est.total} />
            </div>
          ) : null}
        <ErrorText error={mutation.error} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || isLoading || !est}>{mutation.isPending ? 'Generating...' : 'Generate Invoice'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
