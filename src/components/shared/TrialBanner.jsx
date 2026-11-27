import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock } from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

export function useMySubscription(enabled = true) {
  return useQuery({
    queryKey: ['my-subscription'],
    queryFn: async () => (await api.get('/subscription/my')).data.data,
    enabled,
  });
}

/** App-wide banner for trial / expiry state. Tenant users only. */
export function TrialBanner() {
  const { data } = useMySubscription();
  const sub = data?.subscription;
  if (!sub) return null;

  const hasPending = (data.invoices || []).some((i) => i.status === 'PENDING');

  let tone = null;
  let text = null;
  let Icon = Clock;
  if (sub.isTrial && !sub.trialEnded) {
    tone = 'border-l-violet-500 bg-violet-50/70 dark:bg-violet-900/20 text-violet-800 dark:text-violet-200';
    text = `Free trial: ${sub.trialDaysLeft} day${sub.trialDaysLeft === 1 ? '' : 's'} left (ends ${formatDate(sub.trialEndsAt)})`;
  } else if (sub.trialEnded && sub.status !== 'ACTIVE') {
    tone = 'border-l-red-500 bg-red-50/70 dark:bg-red-900/20 text-red-800 dark:text-red-200';
    text = 'Your free trial has ended. Please pay your invoice to continue.';
    Icon = AlertTriangle;
  } else if (sub.isExpired) {
    tone = 'border-l-red-500 bg-red-50/70 dark:bg-red-900/20 text-red-800 dark:text-red-200';
    text = 'Your subscription period has ended. Please pay your invoice to continue.';
    Icon = AlertTriangle;
  } else if (sub.isExpiringSoon) {
    tone = 'border-l-amber-500 bg-amber-50/70 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200';
    text = `Your subscription ends in ${sub.daysLeft} day${sub.daysLeft === 1 ? '' : 's'}.`;
    Icon = AlertTriangle;
  }
  if (!text) return null;

  return (
    <div className={`mb-4 flex items-center justify-between gap-3 rounded-xl border-l-4 px-4 py-2.5 text-sm font-medium ${tone}`}>
      <span className="flex items-center gap-2"><Icon className="h-4 w-4 shrink-0" /> {text}</span>
      <Link to="/subscription" className="shrink-0 text-xs font-semibold underline">{hasPending ? 'Pay invoice' : 'View subscription'}</Link>
    </div>
  );
}
