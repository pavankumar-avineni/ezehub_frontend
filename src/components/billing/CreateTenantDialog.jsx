import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorText, Field, SectionTitle } from '@/components/inventory/common';
import { FeatureChecklist, dependencyProblems } from '@/components/billing/shared';
import { fieldErrors } from '@/lib/errors';
import { useCan } from '@/hooks/useFeature';
import { PERM } from '@/lib/permissions';
import { EmployeeSelect } from '@/components/team/common';
import { formatINR, isCoreFeature } from '@/lib/features';

const EMPTY = { name: '', email: '', phone: '', address: '', city: '', state: '', pincode: '', adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: '' };

export default function CreateTenantDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [customRate, setCustomRate] = useState(false);
  const [rate, setRate] = useState('');
  const [trialDays, setTrialDays] = useState('');
  const [features, setFeatures] = useState([]);
  const [featuresTouched, setFeaturesTouched] = useState(false);

  const { can } = useCan();
  const canSeeBilling = can(PERM.BILLING_READ);
  const canPrice = can(PERM.PRICING_MANAGE);
  const canAssign = can(PERM.ASSIGN_TENANTS);
  const [accountManagerId, setAccountManagerId] = useState('');

  // Billing readers use the admin settings/catalog. Everyone else falls back to the public pricing.
  const { data: adminSettings } = useQuery({
    queryKey: ['billing-settings'],
    queryFn: async () => (await api.get('/subscription/admin/settings')).data.data,
    enabled: open && canSeeBilling,
  });
  const { data: adminCatalog } = useQuery({
    queryKey: ['admin-features'],
    queryFn: async () => (await api.get('/subscription/admin/features')).data.data,
    enabled: open && canSeeBilling,
  });
  const { data: publicPricing } = useQuery({
    queryKey: ['public-pricing'],
    queryFn: async () => (await api.get('/subscription/pricing')).data.data,
    enabled: open && !canSeeBilling,
  });
  // Memoised so the form-reset effect below only runs when the source data changes.
  const settings = useMemo(
    () => (canSeeBilling
      ? adminSettings
      : publicPricing && { defaultRatePerBed: publicPricing.ratePerBed, trialDays: publicPricing.trialDays, defaultFeatures: [] }),
    [canSeeBilling, adminSettings, publicPricing]
  );
  const catalog = canSeeBilling ? adminCatalog : publicPricing?.features;
  useEffect(() => {
    if (open && settings) {
      setForm(EMPTY);
      setCustomRate(false);
      setRate(String(settings.defaultRatePerBed));
      setTrialDays(String(settings.trialDays));
      setFeatures(settings.defaultFeatures || []);
      setFeaturesTouched(false);
    }
  }, [open, settings]);

  const mutation = useMutation({
    mutationFn: (payload) => api.post('/platform/tenants', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['platform-analytics'] });
      onOpenChange(false);
    },
  });
  const errs = fieldErrors(mutation.error);

  const defaultRate = Number(settings?.defaultRatePerBed) || 0;
  const effectiveRate = customRate ? Number(rate) || 0 : defaultRate;
  const problems = dependencyProblems(features, catalog || []);

  const summary = useMemo(() => {
    const picked = (catalog || []).filter((f) => !isCoreFeature(f.code) && features.includes(f.code));
    const perBedAddOns = picked.filter((f) => f.priceType === 'PER_BED').reduce((s, f) => s + (Number(f.price) || 0), 0);
    const flat = picked.filter((f) => f.priceType === 'FLAT').reduce((s, f) => s + (Number(f.price) || 0), 0);
    const perBed = effectiveRate + perBedAddOns;
    return { perBed, flat, example: perBed * 50 + flat };
  }, [catalog, features, effectiveRate]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    const payload = {};
    Object.entries(form).forEach(([k, v]) => { if (typeof v === 'string' && v.trim() !== '') payload[k] = v.trim(); });
    // Only send what the admin changed. Omitted = platform defaults.
    if (customRate && rate !== '' && Number(rate) !== defaultRate) payload.ratePerBed = Number(rate);
    if (trialDays !== '' && Number(trialDays) !== Number(settings?.trialDays)) payload.trialDays = parseInt(trialDays, 10);
    if (featuresTouched) payload.features = features;
    mutation.mutate(payload);
  };

  const err = (k) => errs[k] && <p className="text-xs text-red-500">{errs[k]}</p>;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) mutation.reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Tenant</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-6">
          <div>
            <SectionTitle>1. Business details</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Business Name *">
                <Input value={form.name} onChange={set('name')} required />{err('name')}
              </Field>
              <Field label="Email *"><Input type="email" value={form.email} onChange={set('email')} required />{err('email')}</Field>
              <Field label="Phone (10 digits)"><Input inputMode="numeric" maxLength={10} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="9898989898" />{err('phone')}</Field>
              <Field label="Address"><Input value={form.address} onChange={set('address')} />{err('address')}</Field>
              <Field label="City"><Input value={form.city} onChange={set('city')} /></Field>
              <Field label="State"><Input value={form.state} onChange={set('state')} /></Field>
              <Field label="Pincode"><Input value={form.pincode} onChange={set('pincode')} />{err('pincode')}</Field>
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Admin account</p>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="First Name *"><Input value={form.adminFirstName} onChange={set('adminFirstName')} required />{err('adminFirstName')}</Field>
              <Field label="Last Name *"><Input value={form.adminLastName} onChange={set('adminLastName')} required />{err('adminLastName')}</Field>
              <Field label="Admin Email *"><Input type="email" value={form.adminEmail} onChange={set('adminEmail')} required />{err('adminEmail')}</Field>
              <Field label="Password *">
                <Input type="password" value={form.adminPassword} onChange={set('adminPassword')} required placeholder="Admin@123456" />
                <p className="text-xs text-slate-400">Min 8 chars, uppercase, lowercase, number</p>{err('adminPassword')}
              </Field>
            </div>
          </div>

          {canAssign && (
            <div>
              <SectionTitle>Account manager</SectionTitle>
              <Field label="Maintained by (defaults to you)" error={errs.accountManagerId}>
                <EmployeeSelect value={accountManagerId} onChange={setAccountManagerId} emptyLabel="Me (default)" />
              </Field>
            </div>
          )}

          {canPrice ? (
          <div>
            <SectionTitle>2. Pricing</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Rate per bed / month (₹)">
                <Input type="number" min="0" max="100000" step="0.01" value={customRate ? rate : String(defaultRate)} onChange={(e) => setRate(e.target.value)} disabled={!customRate} />
                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <input type="checkbox" checked={customRate} onChange={(e) => { setCustomRate(e.target.checked); setRate(String(defaultRate)); }} />
                  Custom rate (platform default is {formatINR(defaultRate)})
                </label>
                {err('ratePerBed')}
              </Field>
              <Field label="Free trial (days, 0 = no trial)">
                <Input type="number" min="0" max="365" step="1" value={trialDays} onChange={(e) => setTrialDays(e.target.value)} />{err('trialDays')}
              </Field>
            </div>
          </div>
          ) : (
            <p className="rounded-xl bg-slate-500/10 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
              The platform default rate ({formatINR(defaultRate)} per bed) and a {settings?.trialDays ?? 0}-day trial apply. Changing pricing needs the pricing permission.
            </p>
          )}

          <div>
            <SectionTitle>3. Features</SectionTitle>
            <FeatureChecklist
              features={catalog || []}
              selected={features}
              onChange={(list) => { setFeatures(list); setFeaturesTouched(true); }}
            />
            {problems.length > 0 && <p className="mt-2 text-sm text-red-500">{problems.join('. ')}</p>}
            {err('features')}
          </div>

          <div className="rounded-xl border border-blue-200/60 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-900/10 p-4 text-sm space-y-1">
            <SectionTitle className="mb-1">4. Price summary (before tax)</SectionTitle>
            <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-300">Per-bed total (rate + per-bed add-ons)</span><b>{formatINR(summary.perBed)} / bed</b></div>
            <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-300">Flat add-ons</span><b>{formatINR(summary.flat)} / month</b></div>
            <div className="flex justify-between border-t border-blue-200/50 pt-1 mt-1"><span className="text-slate-600 dark:text-slate-300">Example: 50 beds</span><b>{formatINR(summary.example)} / month</b></div>
          </div>

          <ErrorText error={mutation.error && !Object.keys(errs).length ? mutation.error : null} />
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending || problems.length > 0 || !settings}>{mutation.isPending ? 'Creating...' : 'Create Tenant'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
