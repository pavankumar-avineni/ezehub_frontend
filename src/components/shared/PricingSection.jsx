import { useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import api from '@/lib/api';
import { formatFeaturePrice, formatINR } from '@/lib/features';
import { groupFeatures } from '@/components/billing/shared';

export function usePublicPricing() {
  return useQuery({
    queryKey: ['public-pricing'],
    queryFn: async () => (await api.get('/subscription/pricing')).data.data,
    staleTime: 5 * 60 * 1000,
  });
}

/** Public pricing: per-bed rate, trial, examples and feature table. All values come from the API. */
export default function PricingSection({ onGetStarted }) {
  const { data, isLoading, error } = usePublicPricing();

  if (isLoading) return <p className="text-center py-10 text-slate-400">Loading pricing...</p>;
  if (error || !data) return <p className="text-center py-10 text-slate-400">Pricing is unavailable right now.</p>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Pricing</span>
        <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mt-3">
          {formatINR(data.ratePerBed)} <span className="text-2xl md:text-3xl font-semibold text-slate-500">per bed / month</span>
        </h2>
        {data.trialDays > 0 && (
          <p className="mt-4 inline-flex rounded-full bg-violet-500/10 px-4 py-1.5 text-sm font-semibold text-violet-700 dark:text-violet-300">
            {data.trialDays}-day free trial
          </p>
        )}
        <p className="mt-4 text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Unlimited buildings. Every bed in your property is billed, empty or occupied. Add-on features are priced separately.
          {Number(data.taxPercent) > 0 ? ` Prices exclude ${Number(data.taxPercent)}% tax.` : ''}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-12">
        {(data.examples || []).map((ex) => (
          <div key={ex.beds} className="rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 p-6 text-center shadow-sm">
            <p className="text-sm text-slate-500">{ex.beds} beds</p>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{formatINR(ex.monthlyAmount)}</p>
            <p className="text-xs text-slate-500 mt-1">per month</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 overflow-hidden">
        {groupFeatures(data.features).map(([group, list]) => (
          <div key={group}>
            <p className="px-5 py-2 bg-slate-50 dark:bg-slate-900/40 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">{group}</p>
            {list.map((f) => (
              <div key={f.code} className="flex items-center justify-between gap-4 px-5 py-3 border-t border-slate-100 dark:border-slate-800">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{f.name}</p>
                  {f.description && <p className="text-xs text-slate-500">{f.description}</p>}
                </div>
                {f.isCore
                  ? <span className="flex items-center gap-1 text-sm font-medium text-emerald-600 shrink-0"><Check className="h-4 w-4" /> Included</span>
                  : <span className="text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0">{formatFeaturePrice(f.price, f.priceType)}</span>}
              </div>
            ))}
          </div>
        ))}
      </div>

      {onGetStarted && (
        <div className="text-center mt-10">
          <button onClick={onGetStarted} className="rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-3 text-white font-semibold shadow-lg shadow-blue-500/30">
            Start your {data.trialDays > 0 ? `${data.trialDays}-day free trial` : 'account'}
          </button>
        </div>
      )}
    </div>
  );
}
