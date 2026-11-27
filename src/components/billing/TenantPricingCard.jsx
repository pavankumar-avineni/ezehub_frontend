import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import api from '@/lib/api';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DetailField, ErrorText, Field, SectionTitle, formatDateTime } from '@/components/inventory/common';
import { LineItemsTable, RateBadge } from '@/components/billing/shared';
import { fieldErrors } from '@/lib/errors';
import { formatINR } from '@/lib/features';
import { formatDate } from '@/lib/utils';

function useAdminMutation(tenantId, request, onDone) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-pricing', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['admin-tenant-features', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['platform-tenant', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      onDone?.(res);
    },
  });
}

function RateDialog({ tenantId, pricing, open, onOpenChange }) {
  const sub = pricing.subscription;
  const [mode, setMode] = useState('custom');
  const [rate, setRate] = useState('');
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (open) { setMode('custom'); setRate(String(sub.ratePerBed ?? '')); setReason(''); }
  }, [open, sub.ratePerBed]);

  const m = useAdminMutation(
    tenantId,
    (body) => api.put(`/subscription/admin/${tenantId}/rate`, body),
    () => onOpenChange(false)
  );
  const errs = fieldErrors(m.error);

  const submit = (e) => {
    e.preventDefault();
    const body = mode === 'default' ? { useDefault: true } : { ratePerBed: Number(rate) };
    if (reason.trim()) body.reason = reason.trim();
    m.mutate(body);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) m.reset(); onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Rate per Bed</DialogTitle>
          <DialogDescription>Applies to new invoices only. Platform default is {formatINR(sub.defaultRatePerBed)}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <label className="flex items-center gap-2 text-sm"><input type="radio" checked={mode === 'custom'} onChange={() => setMode('custom')} /> Custom rate</label>
          <Field label="Rate per bed / month (₹)" error={errs.ratePerBed}>
            <Input type="number" min="0" max="100000" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} disabled={mode !== 'custom'} required={mode === 'custom'} />
          </Field>
          <label className="flex items-center gap-2 text-sm"><input type="radio" checked={mode === 'default'} onChange={() => setMode('default')} /> Use platform default</label>
          <Field label="Reason (optional)"><Input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <ErrorText error={m.error && !Object.keys(errs).length ? m.error : null} />
          <DialogFooter><Button type="submit" disabled={m.isPending}>{m.isPending ? 'Saving...' : 'Save'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TrialDialog({ tenantId, pricing, open, onOpenChange }) {
  const [mode, setMode] = useState('extend');
  const [days, setDays] = useState('7');
  const [date, setDate] = useState('');
  useEffect(() => { if (open) { setMode('extend'); setDays('7'); setDate(''); } }, [open]);

  const m = useAdminMutation(
    tenantId,
    (body) => api.put(`/subscription/admin/${tenantId}/trial`, body),
    () => onOpenChange(false)
  );
  const errs = fieldErrors(m.error);

  const submit = (e) => {
    e.preventDefault();
    m.mutate(mode === 'extend' ? { extendDays: parseInt(days, 10) } : { trialEndsAt: new Date(`${date}T23:59:59`).toISOString() });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) m.reset(); onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Trial</DialogTitle>
          <DialogDescription>Trial currently ends {formatDate(pricing.subscription.trialEndsAt)}. The maximum is 365 days from today.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <label className="flex items-center gap-2 text-sm"><input type="radio" checked={mode === 'extend'} onChange={() => setMode('extend')} /> Extend by days</label>
          <Field error={errs.extendDays}><Input type="number" min="1" max="365" step="1" value={days} onChange={(e) => setDays(e.target.value)} disabled={mode !== 'extend'} required={mode === 'extend'} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="radio" checked={mode === 'date'} onChange={() => setMode('date')} /> Set end date</label>
          <Field error={errs.trialEndsAt}><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={mode !== 'date'} required={mode === 'date'} /></Field>
          <ErrorText error={m.error && !Object.keys(errs).length ? m.error : null} />
          <DialogFooter><Button type="submit" disabled={m.isPending}>{m.isPending ? 'Saving...' : 'Save'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TenantPricingCard({ tenantId, pricing, canEdit, canGenerate, onGenerate }) {
  const [rateOpen, setRateOpen] = useState(false);
  const [trialOpen, setTrialOpen] = useState(false);
  const sub = pricing.subscription;
  const est = pricing.estimatedNextInvoice;

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Pricing</h3>
        <Button variant="outline" size="sm" onClick={onGenerate} disabled={!canGenerate} title={canGenerate ? '' : 'Needs the billing management permission'}>Generate Invoice</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
        <div>
          <span className="text-xs text-slate-500">Rate per bed</span>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-white">
            {formatINR(sub.ratePerBed)} <RateBadge custom={sub.isCustomRate} />
            {canEdit && <button type="button" aria-label="Edit rate" onClick={() => setRateOpen(true)}><Pencil className="h-3.5 w-3.5 text-blue-500" /></button>}
          </div>
        </div>
        <div><span className="text-xs text-slate-500">Subscription</span><div className="mt-0.5"><StatusBadge status={sub.status} /></div></div>
        <DetailField label="Billable beds" value={pricing.billableBeds} />
        <DetailField label="Period ends" value={formatDate(sub.endDate)} />
        <DetailField label="Platform default rate" value={formatINR(sub.defaultRatePerBed)} />
        <DetailField label="Billing cycle" value={sub.billingCycle} />
        <div className="col-span-2">
          <span className="text-xs text-slate-500">Trial</span>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-white">
            {sub.isTrial ? `Ends ${formatDate(sub.trialEndsAt)} (${sub.trialDaysLeft} days left)` : sub.trialEndsAt ? `Ended ${formatDate(sub.trialEndsAt)}` : 'No trial'}
            {canEdit && sub.isTrial && <Button size="sm" variant="outline" onClick={() => setTrialOpen(true)}>Extend / set date</Button>}
          </div>
        </div>
      </div>

      <div>
        <SectionTitle>Beds by building</SectionTitle>
        <div className="rounded-xl border border-blue-100/60 dark:border-blue-900/30 overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Building</TableHead><TableHead className="text-right">Beds</TableHead></TableRow></TableHeader>
            <TableBody>
              {(pricing.bedsByBuilding || []).length === 0
                ? <TableRow><TableCell colSpan={2} className="text-center text-slate-400 py-4">No beds yet</TableCell></TableRow>
                : pricing.bedsByBuilding.map((b) => (
                  <TableRow key={b.buildingId}><TableCell>{b.buildingName}</TableCell><TableCell className="text-right">{b.beds}</TableCell></TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <SectionTitle>Estimated next invoice</SectionTitle>
        <LineItemsTable lines={est.lines} amount={est.amount} tax={est.tax} taxPercent={est.taxPercent} total={est.total} />
      </div>

      <div>
        <SectionTitle>Rate history</SectionTitle>
        {(pricing.rateHistory || []).length === 0 ? <p className="text-sm text-slate-400">No rate changes</p> : (
          <div className="rounded-xl border border-blue-100/60 dark:border-blue-900/30 overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Change</TableHead><TableHead>Type</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
              <TableBody>
                {pricing.rateHistory.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-xs">{formatDateTime(h.createdAt)}</TableCell>
                    <TableCell>{h.oldRate == null ? '-' : formatINR(h.oldRate)} → {formatINR(h.newRate)}</TableCell>
                    <TableCell><RateBadge custom={h.isCustomRate} />{!h.isCustomRate && <span className="text-xs text-slate-500">Default</span>}</TableCell>
                    <TableCell className="text-xs">{h.reason || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <RateDialog tenantId={tenantId} pricing={pricing} open={rateOpen} onOpenChange={setRateOpen} />
      <TrialDialog tenantId={tenantId} pricing={pricing} open={trialOpen} onOpenChange={setTrialOpen} />
    </div>
  );
}
