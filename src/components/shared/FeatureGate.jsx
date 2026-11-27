import { Loader2 } from 'lucide-react';
import { Navigate, Outlet } from 'react-router-dom';
import { useEnabledFeatures, useFeature } from '@/hooks/useFeature';
import { useFeatureStore } from '@/stores/featureStore';
import { LockedFeaturePage } from '@/components/shared/LockedFeature';

/** Render children only when the feature is enabled, otherwise `fallback` (default: nothing). */
export function FeatureGate({ code, fallback = null, children }) {
  return useFeature(code) ? children : fallback;
}

/**
 * Route guard. A locked feature renders the Locked Feature page and never mounts the real page,
 * so no gated API calls are fired.
 */
export function FeatureRoute({ code, children }) {
  const enabled = useFeature(code);
  const list = useEnabledFeatures();
  const status = useFeatureStore((s) => s.status);

  if (enabled) return children ?? <Outlet />;
  // List not known yet (old persisted session): wait for the profile refresh.
  if (list === undefined && status === 'idle') {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>;
  }
  // Profile could not be loaded: let the server decide (the global 403 handler covers locks).
  if (list === undefined && status === 'error') return children ?? <Outlet />;
  return <LockedFeaturePage code={code} />;
}

export function PermissionRoute({ allowed, children }) {
  return allowed ? children : <Navigate to="/" replace />;
}
