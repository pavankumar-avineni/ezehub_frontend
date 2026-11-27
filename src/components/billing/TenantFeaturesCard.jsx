import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import api from '@/lib/api';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorText, Field, SectionTitle, formatDateTime } from '@/components/inventory/common';
import { FeatureChecklist, dependencyProblems, groupFeatures } from '@/components/billing/shared';
import { fieldErrors } from '@/lib/errors';
import { formatFeaturePrice, formatINR, isCoreFeature, PRICE_TYPE_LABEL } from '@/lib/features';

const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

function useFeatureMutation(tenantId, request, onDone) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenant-features', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['admin-pricing', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['platform-tenant', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['admin-features'] });
      onDone?.(res);
    },
  });
}

function ToggleDialog({ tenantId, target, onClose }) {
  const [reason, setReason] = useState('');
  useEffect(() => { setReason(''); }, [target]);
  const enabling = target && !target.enabled;
  const m = useFeatureMutation(
    tenantId,
    () => api.post(`/subscription/admin/${tenantId}/features/${target.code}/${enabling ? 'enable' : 'disable'}`, reason.trim() ? { reason: reason.trim() } : undefined),
    onClose
  );
  if (!target) return null;
  return (
    <Dialog open onOpenChange={(o) => { if (!o) { m.reset(); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{enabling ? 'Enable' : 'Disable'} {target.name}?</DialogTitle>
          <DialogDescription>
            {enabling
              ? 'Access is restored immediately. Billing changes from the next invoice.'
              : 'Access is blocked immediately, data is kept, billing changes from the next invoice.'}
          </DialogDescription>
        </DialogHeader>
        <Field label="Reason (optional)"><Input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <ErrorText error={m.error} />
        <DialogFooter>
          <Button variant={enabling ? 'default' : 'destructive'} onClick={() => m.mutate()} disabled={m.isPending}>
            {m.isPending ? 'Saving...' : enabling ? 'Enable' : 'Disable'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PriceDialog({ tenantId, target, onClose }) {
  const [price, setPrice] = useState('');
  const [reason, setReason] = useState('');
  useEffect(() => { if (target) { setPrice(String(target.effectivePrice ?? target.price ?? '')); setReason(''); } }, [target]);
  const m = useFeatureMutation(
    tenantId,
    (body) => api.put(`/subscription/admin/${tenantId}/features/${target.code}/price`, body),
    onClose
  );
  const errs = fieldErrors(m.error);
  if (!target) return null;
  const withReason = (b) => (reason.trim() ? { ...b, reason: reason.trim() } : b);
  return (
    <Dialog open onOpenChange={(o) => { if (!o) { m.reset(); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Special price for {target.name}</DialogTitle>
          <DialogDescription>
            Catalog price: {formatFeaturePrice(target.catalogPrice ?? target.price, target.priceType)}. The special price uses the same price type ({PRICE_TYPE_LABEL[target.priceType]}).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); m.mutate(withReason({ price: Number(price) })); }} className="space-y-4">
          <Field label="Price (₹)" error={errs.price}><Input type="number" min="0" max="1000000" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required /></Field>
          <Field label="Reason (optional)"><Input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <ErrorText error={m.error && !Object.keys(errs).length ? m.error : null} />
          <DialogFooter className="gap-2 sm:gap-0">
            {target.isCustomPrice && (
              <Button type="button" variant="outline" disabled={m.isPending} onClick={() => m.mutate(withReason({ useCatalogPrice: true }))}>Reset to catalog price</Button>
            )}
            <Button type="submit" disabled={m.isPending}>{m.isPending ? 'Saving...' : 'Set price'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BulkDialog({ tenantId, view, open, onOpenChange }) {
  const [selected, setSelected] = useState([]);
  const [reason, setReason] = useState('');
  useEffect(() => { if (open) { setSelected(view.enabledCodes.filter((c) => !isCoreFeature(c))); setReason(''); } }, [open, view.enabledCodes]);
  const m = useFeatureMutation(
    tenantId,
    () => api.put(`/subscription/admin/${tenantId}/features`, { features: selected, ...(reason.trim() && { reason: reason.trim() }) }),
    () => onOpenChange(false)
  );
  const current = view.enabledCodes.filter((c) => !isCoreFeature(c));
  const problems = dependencyProblems(selected, view.features);
  const added = selected.filter((c) => !current.includes(c));
  const removed = current.filter((c) => !selected.includes(c));
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) m.reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Feature selection</DialogTitle>
          <DialogDescription>This is the complete list of add-ons for the tenant. Disabled features are blocked immediately and keep their data.</DialogDescription>
        </DialogHeader>
        <FeatureChecklist features={view.features} selected={selected} onChange={setSelected} />
        {problems.length > 0 && <p className="text-sm text-red-500">{problems.join('. ')}</p>}
        <p className="text-xs text-slate-500">{added.length} to enable · {removed.length} to disable</p>
        <Field label="Reason (optional)"><Input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <ErrorText error={m.error} />
        <DialogFooter>
          <Button onClick={() => m.mutate()} disabled={m.isPending || problems.length > 0 || sameSet(selected, current)}>{m.isPending ? 'Saving...' : 'Save feature selection'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TenantFeaturesCard({ tenantId, view, canEdit }) {
  const [toggle, setToggle] = useState(null);
  const [priceTarget, setPriceTarget] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const enabled = new Set(view.enabledCodes);

  // A feature cannot be switched off while another enabled feature requires it.
  const dependents = (code) => view.features.filter((f) => enabled.has(f.code) && (f.requires || []).includes(code));
  const missingRequirement = (f) => (f.requires || []).filter((r) => !isCoreFeature(r) && !enabled.has(r));

  return (
    <div className="glass-card p-6 space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Features</h3>
          <p className="text-xs text-slate-500">
            {view.summary?.core} core · {view.summary?.addOnsEnabled} add-ons enabled · {view.summary?.addOnsAvailable} available · {view.billableBeds} billable beds
          </p>
        </div>
        {canEdit && <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>Edit selection</Button>}
      </div>

      {groupFeatures(view.features).map(([group, list]) => (
        <div key={group}>
          <SectionTitle className="mb-2">{group}</SectionTitle>
          <div className="divide-y divide-blue-100/50 dark:divide-blue-900/30 rounded-xl border border-blue-100/60 dark:border-blue-900/30">
            {list.map((f) => {
              const core = f.isCore || isCoreFeature(f.code);
              const blockedBy = f.enabled ? dependents(f.code) : missingRequirement(f);
              const cantEnable = !f.enabled && (f.canBeEnabled === false || blockedBy.length > 0);
              const switchDisabled = core || !canEdit || (f.enabled && blockedBy.length > 0) || cantEnable;
              const why = core ? 'Core feature' : f.enabled && blockedBy.length ? `Required by ${blockedBy.map((b) => b.name).join(', ')}` : cantEnable ? (blockedBy.length ? `Requires ${blockedBy.join(', ')}` : 'Not available') : '';
              return (
                <div key={f.code} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-white">{f.name}</p>
                    <p className="text-xs text-slate-500">
                      {core ? 'Included in the per-bed rate' : `${formatFeaturePrice(f.effectivePrice, f.priceType)}${f.monthlyCost != null && f.enabled ? ` · ${formatINR(f.monthlyCost)} / month` : ''}`}
                      {why && !core && ` · ${why}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {f.isCustomPrice && <span className="rounded-lg px-2 py-0.5 text-[11px] font-semibold bg-amber-500/10 text-amber-600">Special price</span>}
                    {!core && f.enabled && canEdit && <Button size="sm" variant="ghost" onClick={() => setPriceTarget(f)}>Price</Button>}
                    {core ? <Lock className="h-4 w-4 text-slate-400" /> : (
                      <input
                        type="checkbox" role="switch" aria-label={`${f.enabled ? 'Disable' : 'Enable'} ${f.name}`} title={why}
                        checked={!!f.enabled} disabled={switchDisabled} onChange={() => setToggle(f)}
                        className="h-4 w-4"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div>
        <SectionTitle>Feature history</SectionTitle>
        {(view.history || []).length === 0 ? <p className="text-sm text-slate-400">No changes yet</p> : (
          <ol className="relative border-l border-blue-200/60 dark:border-blue-800/40 ml-2 space-y-3">
            {view.history.map((h) => (
              <li key={h.id} className="ml-4">
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-blue-400" />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <StatusBadge status={h.action} /><b>{h.featureCode}</b>
                  <span className="text-xs text-slate-500">{formatDateTime(h.createdAt)}</span>
                </div>
                {(h.oldValue != null || h.newValue != null) && (
                  <p className="text-xs text-slate-500">{h.oldValue ?? '-'} → {h.newValue ?? '-'}</p>
                )}
                {h.reason && <p className="text-xs text-slate-600 dark:text-slate-300">Reason: {h.reason}</p>}
              </li>
            ))}
          </ol>
        )}
      </div>

      <ToggleDialog tenantId={tenantId} target={toggle} onClose={() => setToggle(null)} />
      <PriceDialog tenantId={tenantId} target={priceTarget} onClose={() => setPriceTarget(null)} />
      <BulkDialog tenantId={tenantId} view={view} open={bulkOpen} onOpenChange={setBulkOpen} />
    </div>
  );
}
