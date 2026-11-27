import { Fragment, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Clock, CheckCircle, BedDouble, Upload, ChevronDown, ChevronRight, Lock, Check } from 'lucide-react';
import api, { refreshEnabledFeatures } from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';
import { formatFeaturePrice, formatINR, isCoreFeature } from '@/lib/features';
import { ErrorText, SectionTitle } from '@/components/inventory/common';
import { InvoiceDetail, LineItemsTable, RateBadge, groupFeatures } from '@/components/billing/shared';
import { useMyFeatures } from '@/components/shared/LockedFeature';
import { useMySubscription } from '@/components/shared/TrialBanner';

export default function SubscriptionPage() {
  const [payDialog, setPayDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [payError, setPayError] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useMySubscription();
  const { data: featureData } = useMyFeatures();

  // Opening this page refreshes the enabled feature list.
  useEffect(() => {
    refreshEnabledFeatures();
    queryClient.invalidateQueries({ queryKey: ['my-features'] });
    queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
  }, [queryClient]);

  const payMutation = useMutation({
    mutationFn: async ({ invoiceId, transactionId, file }) => {
      const formData = new FormData();
      formData.append('transactionId', transactionId);
      formData.append('paymentMethod', 'UPI');
      if (file) formData.append('proof', file);
      return api.post(`/subscription/my/pay/${invoiceId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
      setPayDialog(false);
      setTransactionId('');
      setProofFile(null);
    },
  });

  const sub = data?.subscription;
  const pricing = data?.pricing;
  const est = pricing?.estimatedNextInvoice;
  const invoices = data?.invoices || [];
  const pendingInvoice = invoices.find((i) => i.status === 'PENDING');

  const handleRazorpayPayment = async (invoice) => {
    setPayError('');
    try {
      const { data: orderData } = await api.post('/payment/subscription/create-order', { invoiceId: invoice.id });
      const order = orderData.data;
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'EzeHub',
        description: `Subscription - ${invoice.invoiceNumber}`,
        order_id: order.orderId,
        handler: async (response) => {
          try {
            await api.post('/payment/subscription/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              invoiceId: invoice.id,
            });
            queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
            alert('Payment successful! Subscription extended.');
          } catch {
            alert('Payment verification failed. Contact support.');
          }
        },
        prefill: { name: data?.tenant?.name || '', email: data?.tenant?.email || '' },
        theme: { color: '#2563eb' },
      });
      rzp.open();
    } catch (err) {
      setPayError(err.response?.data?.message || 'Failed to initiate payment');
    }
  };

  const daysValue = sub?.isTrial ? sub.trialDaysLeft : sub?.daysLeft;
  const daysTitle = sub?.isTrial ? 'Trial Days Left' : 'Days Left';

  return (
    <div>
      <PageHeader title="Subscription" description="Pay per bed. Price = beds × rate per bed + add-on features (+ tax)." />
      <ErrorText error={error} />

      {sub && pricing && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
          <StatCard title="Status" value={sub.status} icon={sub.status === 'ACTIVE' ? CheckCircle : Clock} />
          <StatCard title="Rate per bed" value={formatINR(pricing.ratePerBed)} subtitle={pricing.isCustomRate ? 'Special rate' : 'per bed / month'} icon={CreditCard} />
          <StatCard title="Billable beds" value={pricing.billableBeds} subtitle={`Tax ${Number(pricing.taxPercent) || 0}%`} icon={BedDouble} />
          <StatCard title={daysTitle} value={daysValue ?? '-'} subtitle={sub.isTrial ? `Ends ${formatDate(sub.trialEndsAt)}` : sub.endDate ? `Until ${formatDate(sub.endDate)}` : undefined} icon={Clock} />
        </div>
      )}

      {pricing && (
        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{formatINR(pricing.ratePerBed)} per bed / month</h3>
              {pricing.isCustomRate && <span className="rounded-lg px-2 py-0.5 text-[11px] font-semibold bg-amber-500/10 text-amber-600">Special rate</span>}
            </div>
            <p className="text-xs text-slate-500 mb-4">Every bed in your live buildings is billed, empty or occupied. Buildings are unlimited.</p>
            <SectionTitle>Beds by building</SectionTitle>
            <div className="rounded-xl border border-blue-100/60 dark:border-blue-900/30 divide-y divide-blue-100/50 dark:divide-blue-900/30 text-sm">
              {(pricing.bedsByBuilding || []).length === 0 && <p className="px-3 py-3 text-center text-slate-400">No beds yet</p>}
              {(pricing.bedsByBuilding || []).map((b) => (
                <div key={b.buildingId} className="flex justify-between px-3 py-2"><span>{b.buildingName}</span><b>{b.beds}</b></div>
              ))}
              <div className="flex justify-between px-3 py-2 bg-blue-50/40 dark:bg-slate-800/40"><span>Total</span><b>{pricing.billableBeds}</b></div>
            </div>
          </div>
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Estimated next invoice</h3>
            {est && <LineItemsTable lines={est.lines} amount={est.amount} tax={est.tax} taxPercent={est.taxPercent} total={est.total} />}
            <p className="mt-3 text-xs text-slate-500">Estimate based on your current beds and features. Changes apply from the next invoice.</p>
          </div>
        </div>
      )}

      {featureData && (
        <div className="glass-card p-6 mb-8">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Features</h3>
          <p className="text-xs text-slate-500 mb-4">
            {featureData.summary?.core} core included · {featureData.summary?.addOnsEnabled} add-ons enabled · {featureData.summary?.addOnsAvailable} available
          </p>
          <div className="space-y-5">
            {groupFeatures(featureData.features).map(([group, list]) => (
              <div key={group}>
                <SectionTitle className="mb-2">{group}</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {list.map((f) => {
                    const core = f.isCore || isCoreFeature(f.code);
                    const locked = !core && !f.enabled;
                    return (
                      <div key={f.code} className={`rounded-xl border px-3 py-2.5 ${locked ? 'border-slate-200/70 dark:border-slate-700/50 opacity-60' : 'border-blue-100/70 dark:border-blue-900/30'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-slate-800 dark:text-white">{f.name}</p>
                          {core ? <span className="flex items-center gap-1 text-xs text-emerald-600"><Check className="h-3.5 w-3.5" /> Included</span>
                            : locked ? <span className="flex items-center gap-1 text-xs text-slate-500"><Lock className="h-3.5 w-3.5" /> Locked</span>
                            : <span className="flex items-center gap-1 text-xs text-emerald-600"><Check className="h-3.5 w-3.5" /> Enabled</span>}
                        </div>
                        {!core && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {formatFeaturePrice(f.effectivePrice, f.priceType)}
                            {f.isCustomPrice && ' · special price'}
                            {!locked && f.monthlyCost != null && ` · ${formatINR(f.monthlyCost)} / month`}
                            {locked && ' · Contact support to enable'}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingInvoice && (
        <div className="glass-card p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Pending Payment</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Invoice</p>
                  <p className="font-semibold text-slate-800 dark:text-white">{pendingInvoice.invoiceNumber}</p>
                </div>
              </div>
              <div className="bg-blue-50/80 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/30">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wider">Amount to Pay</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{formatINR(pendingInvoice.total)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
                  <p className="text-xs text-slate-500">Due Date</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{formatDate(pendingInvoice.dueDate)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
                  <p className="text-xs text-slate-500">Billing Period</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{formatDate(pendingInvoice.billingStart)} → {formatDate(pendingInvoice.billingEnd)}</p>
                </div>
              </div>
              <Button className="w-full h-12 text-base bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700" onClick={() => handleRazorpayPayment(pendingInvoice)}>
                <CreditCard className="h-4 w-4" /> Pay Online (Razorpay)
              </Button>
              {payError && <p className="text-sm text-red-500">{payError}</p>}
              <Button variant="outline" className="w-full h-10 text-sm" onClick={() => { setSelectedInvoice(pendingInvoice); setPayDialog(true); }}>
                <Upload className="h-4 w-4" /> Or Submit UPI Proof Manually
              </Button>
            </div>

            <div className="flex flex-col items-center justify-center">
              <div className="bg-white rounded-2xl p-4 shadow-lg border border-slate-100 dark:border-slate-700 w-fit">
                <p className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Scan to Pay</p>
                {data?.payment?.qrUrl ? (
                  <img src={data.payment.qrUrl} alt="Payment QR" className="w-52 h-52 rounded-lg object-contain" />
                ) : (
                  <div className="w-52 h-52 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center">
                    <p className="text-sm text-slate-400 text-center px-4">QR not configured by admin</p>
                  </div>
                )}
                {data?.payment?.upiId && (
                  <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2 text-center">
                    <p className="text-[10px] text-slate-500 uppercase">UPI ID</p>
                    <p className="text-sm font-bold text-blue-700 dark:text-blue-300 select-all">{data.payment.upiId}</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-3 text-center">Pay using any UPI app<br />(GPay, PhonePe, Paytm)</p>
            </div>
          </div>
        </div>
      )}

      <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Invoice History</h3>
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow><TableHead className="w-8" /><TableHead>Invoice</TableHead><TableHead>Total</TableHead><TableHead>Period</TableHead><TableHead>Status</TableHead><TableHead>Paid</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">Loading...</TableCell></TableRow>
              : invoices.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">No invoices yet</TableCell></TableRow>
              : invoices.map((inv) => {
                const open = expanded === inv.id;
                return (
                  <Fragment key={inv.id}>
                    <TableRow className="cursor-pointer" onClick={() => setExpanded(open ? null : inv.id)}>
                      <TableCell>{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                      <TableCell className="font-semibold text-slate-800 dark:text-white">{inv.invoiceNumber}</TableCell>
                      <TableCell>{formatINR(inv.total)}</TableCell>
                      <TableCell className="text-xs">{formatDate(inv.billingStart)} - {formatDate(inv.billingEnd)}</TableCell>
                      <TableCell><StatusBadge status={inv.status} /></TableCell>
                      <TableCell>{formatDate(inv.paidAt)}</TableCell>
                    </TableRow>
                    {open && (
                      <TableRow><TableCell colSpan={6} className="bg-blue-50/30 dark:bg-slate-900/30"><InvoiceDetail invoice={inv} /></TableCell></TableRow>
                    )}
                  </Fragment>
                );
              })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit Payment Proof</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Pay <span className="font-bold text-slate-800">{formatINR(selectedInvoice?.total)}</span> to the UPI ID shown and submit proof below.</p>
            <div className="space-y-2">
              <Label>Transaction ID / UTR Number</Label>
              <Input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder="Enter UPI transaction ID" />
            </div>
            <div className="space-y-2">
              <Label>Payment Screenshot (optional)</Label>
              <Input type="file" accept="image/*" onChange={(e) => setProofFile(e.target.files?.[0])} />
            </div>
            <ErrorText error={payMutation.error} />
          </div>
          <DialogFooter>
            <Button onClick={() => {
              if (!transactionId.trim()) return;
              payMutation.mutate({ invoiceId: selectedInvoice.id, transactionId: transactionId.trim(), file: proofFile });
            }} disabled={payMutation.isPending}>
              {payMutation.isPending ? 'Submitting...' : 'Submit Proof'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
