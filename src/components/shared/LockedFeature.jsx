import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Lock } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useFeatureStore } from '@/stores/featureStore';
import { formatFeaturePrice, formatINR, monthlyCostFor } from '@/lib/features';

/** Tenant feature list. Shared cache key with the Subscription page. */
export function useMyFeatures(enabled = true) {
  return useQuery({
    queryKey: ['my-features'],
    queryFn: async () => (await api.get('/subscription/my/features')).data.data,
    enabled,
  });
}

export function LockedFeatureContent({ code, onBack }) {
  const { data, isLoading } = useMyFeatures();
  const feature = (data?.features || []).find((f) => f.code === code);
  const beds = data?.billableBeds ?? 0;
  const price = feature ? feature.effectivePrice ?? feature.price : null;
  const cost = feature ? feature.monthlyCost ?? monthlyCostFor(price, feature.priceType, beds) : null;

  return (
    <div className="mx-auto max-w-lg text-center py-10 space-y-5">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-blue-100 dark:from-slate-800 dark:to-blue-900/40">
        <Lock className="h-7 w-7 text-blue-600 dark:text-blue-300" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">{feature?.name || (code ? code.replace(/_/g, ' ') : 'This feature')}</h2>
        {feature?.description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{feature.description}</p>}
      </div>
      <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Not included in your account</p>

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading price...</p>
      ) : feature ? (
        <div className="glass-card p-4 text-left space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Price</span>
            <span className="font-semibold text-slate-800 dark:text-white">{formatFeaturePrice(price, feature.priceType)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Estimated monthly cost{feature.priceType === 'PER_BED' ? ` (${beds} beds)` : ''}</span>
            <span className="font-semibold text-slate-800 dark:text-white">{formatINR(cost)}</span>
          </div>
        </div>
      ) : null}

      <p className="text-sm text-slate-600 dark:text-slate-300">Contact support to add this feature.</p>
      {onBack && <Button variant="outline" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Go back</Button>}
    </div>
  );
}

/** Full page version used by route guards. */
export function LockedFeaturePage({ code }) {
  const navigate = useNavigate();
  return (
    <div className="glass-card p-6">
      <LockedFeatureContent code={code} onBack={() => navigate(-1)} />
    </div>
  );
}

/** Global modal shown when any API call returns FEATURE_NOT_ENABLED. Mount once. */
export function LockedFeatureModal() {
  const code = useFeatureStore((s) => s.lockedFeature);
  const clear = useFeatureStore((s) => s.clearLocked);
  const navigate = useNavigate();
  return (
    <Dialog open={!!code} onOpenChange={(o) => !o && clear()}>
      <DialogContent>
        {code && <LockedFeatureContent code={code} onBack={() => { clear(); navigate('/'); }} />}
      </DialogContent>
    </Dialog>
  );
}
