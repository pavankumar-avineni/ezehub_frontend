import { useAuthStore } from '@/stores/authStore';
import { isCoreFeature } from '@/lib/features';

const EMPTY = [];

/** Enabled feature codes for the signed-in tenant user. `undefined` while not yet loaded. */
export function useEnabledFeatures() {
  return useAuthStore((s) => s.user?.enabledFeatures);
}

/** All enabled feature codes (empty array if not loaded). */
export function useFeatures() {
  return useEnabledFeatures() || EMPTY;
}

/** True when the tenant has the feature. Core features are always on. */
export function useFeature(code) {
  const list = useEnabledFeatures();
  if (isCoreFeature(code)) return true;
  return Array.isArray(list) && list.includes(code);
}

export function usePermission(code) {
  return useAuthStore((s) => (s.user?.permissions || []).includes(code));
}

export function useIsSuperAdmin() {
  return useAuthStore((s) => s.user?.role?.code === 'platform-super-admin');
}
