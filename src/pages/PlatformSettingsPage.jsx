import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorText, Field, SectionTitle } from '@/components/inventory/common';
import { FeatureChecklist, ReadOnlyNote, dependencyProblems } from '@/components/billing/shared';
import { useIsSuperAdmin } from '@/hooks/useFeature';
import { fieldErrors } from '@/lib/errors';
import { formatINR, isCoreFeature } from '@/lib/features';
import { formatDateTime } from '@/components/inventory/common';

const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

export default function PlatformSettingsPage() {
  const canEdit = useIsSuperAdmin();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);
  const [applyExisting, setApplyExisting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['billing-settings'],
    queryFn: async () => (await api.get('/subscription/admin/settings')).data.data,
  });
  const { data: features } = useQuery({
    queryKey: ['admin-features'],
    queryFn: async () => (await api.get('/subscription/admin/features')).data.data,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        defaultRatePerBed: String(settings.defaultRatePerBed ?? ''),
        trialDays: String(settings.trialDays ?? ''),
        taxPercent: String(settings.taxPercent ?? ''),
        defaultFeatures: settings.defaultFeatures || [],
      });
      setApplyExisting(false);
    }
  }, [settings]);

  const changes = useMemo(() => {
    if (!settings || !form) return {};
    const out = {};
    if (form.defaultRatePerBed !== '' && Number(form.defaultRatePerBed) !== Number(settings.defaultRatePerBed)) out.defaultRatePerBed = Number(form.defaultRatePerBed);
    if (form.trialDays !== '' && Number(form.trialDays) !== Number(settings.trialDays)) out.trialDays = parseInt(form.trialDays, 10);
    if (form.taxPercent !== '' && Number(form.taxPercent) !== Number(settings.taxPercent)) out.taxPercent = Number(form.taxPercent);
    if (!sameSet(form.defaultFeatures, settings.defaultFeatures || [])) out.defaultFeatures = form.defaultFeatures;
    return out;
  }, [settings, form]);

  const rateChanged = 'defaultRatePerBed' in changes;
  const problems = dependencyProblems(form?.defaultFeatures || [], features || []);
  const hasChanges = Object.keys(changes).length > 0;

  const mutation = useMutation({
    mutationFn: (payload) => api.put('/subscription/admin/settings', payload),
    onSuccess: (res) => {
      setResult(res.data.data);
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ['billing-settings'] });
      queryClient.invalidateQueries({ queryKey: ['platform-analytics'] });
    },
  });
  const errs = fieldErrors(mutation.error);

  const save = () => mutation.mutate({ ...changes, ...(rateChanged && applyExisting && { applyToExistingTenants: true }) });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  if (isLoading || !form) return <div className="text-center py-12 text-slate-400">Loading...</div>;
  const addOns = (features || []).filter((f) => !isCoreFeature(f.code));

  return (
    <div>
      <PageHeader title="Billing Settings" description="Default pricing for new tenants and invoices. Price = beds × rate per bed + add-on features (+ tax)." />
      <div className="mb-4"><ReadOnlyNote show={!canEdit} /></div>

      <div className="glass-card p-6 space-y-6">
        <div>
          <SectionTitle>Pricing</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Default rate per bed / month (₹)" error={errs.defaultRatePerBed}>
              <Input type="number" min="0" max="100000" step="0.01" value={form.defaultRatePerBed} onChange={set('defaultRatePerBed')} disabled={!canEdit} />
            </Field>
            <Field label="Free trial (days)" error={errs.trialDays}>
              <Input type="number" min="0" max="365" step="1" value={form.trialDays} onChange={set('trialDays')} disabled={!canEdit} />
            </Field>
            <Field label="Tax (%)" error={errs.taxPercent}>
              <Input type="number" min="0" max="100" step="0.01" value={form.taxPercent} onChange={set('taxPercent')} disabled={!canEdit} />
            </Field>
          </div>
          <label className={`mt-3 flex items-center gap-2 text-sm ${rateChanged && canEdit ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}`}>
            <input type="checkbox" checked={applyExisting && rateChanged} disabled={!rateChanged || !canEdit} onChange={(e) => setApplyExisting(e.target.checked)} />
            Also apply the new default rate to existing tenants on the default rate
          </label>
          <p className="mt-1 text-xs text-slate-500">Billing period: {settings.billingPeriodDays} days · Currency: {settings.currency}. Tenants with a custom rate are never changed.</p>
        </div>

        <div>
          <SectionTitle>Default features for new tenants</SectionTitle>
          <p className="text-xs text-slate-500 mb-3">Add-ons given to new tenants when none are chosen (self sign-up, or create-tenant without features).</p>
          <FeatureChecklist
            features={features || []}
            selected={form.defaultFeatures.filter((c) => addOns.some((f) => f.code === c))}
            onChange={(list) => setForm({ ...form, defaultFeatures: list })}
            disabled={!canEdit}
          />
          {problems.length > 0 && <p className="mt-2 text-sm text-red-500">{problems.join('. ')}</p>}
          {errs.defaultFeatures && <p className="mt-2 text-sm text-red-500">{errs.defaultFeatures}</p>}
        </div>

        <ErrorText error={mutation.error && Object.keys(errs).length === 0 ? mutation.error : null} />
        {result && (
          <div className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            Settings saved. {typeof result.tenantsRepriced === 'number' && `${result.tenantsRepriced} existing tenant${result.tenantsRepriced === 1 ? '' : 's'} re-priced.`}
          </div>
        )}
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Last updated {settings.updatedAt ? formatDateTime(settings.updatedAt) : '-'} · Example: 50 beds = {formatINR(50 * (Number(form.defaultRatePerBed) || 0))} before add-ons and tax
          </p>
          {canEdit && (
            <Button disabled={!hasChanges || problems.length > 0 || mutation.isPending} onClick={() => { setResult(null); setConfirmOpen(true); }}>
              <Save className="h-4 w-4" /> Save Settings
            </Button>
          )}
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save billing settings?</DialogTitle>
            <DialogDescription>
              Applies to new tenants and new invoices only. Existing invoices never change.
              {rateChanged && applyExisting && ' The new rate will also be applied to existing tenants on the default rate.'}
            </DialogDescription>
          </DialogHeader>
          <ul className="text-sm space-y-1 text-slate-700 dark:text-slate-300">
            {'defaultRatePerBed' in changes && <li>Rate per bed: {formatINR(settings.defaultRatePerBed)} → {formatINR(changes.defaultRatePerBed)}</li>}
            {'trialDays' in changes && <li>Free trial: {settings.trialDays} → {changes.trialDays} days</li>}
            {'taxPercent' in changes && <li>Tax: {settings.taxPercent}% → {changes.taxPercent}%</li>}
            {'defaultFeatures' in changes && <li>Default features: {changes.defaultFeatures.length} add-ons</li>}
          </ul>
          <ErrorText error={mutation.error} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={mutation.isPending}>{mutation.isPending ? 'Saving...' : 'Confirm & Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
