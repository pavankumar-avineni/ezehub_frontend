import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { useFeatureStore } from '@/stores/featureStore';
import { isFeatureLockedError, lockedFeatureCode } from '@/lib/errors';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Reload the enabled feature list from the profile endpoint (tenant users only). */
export async function refreshEnabledFeatures() {
  const { user } = useAuthStore.getState();
  if (!user || user.scope === 'PLATFORM') return;
  try {
    const { data } = await api.get('/auth/profile');
    const list = data?.data?.enabledFeatures;
    if (Array.isArray(list)) useAuthStore.getState().setEnabledFeatures(list);
    useFeatureStore.getState().setStatus('loaded');
  } catch {
    useFeatureStore.getState().setStatus('error');
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Global handler: a feature that is not enabled for this tenant.
    if (isFeatureLockedError(error)) {
      const code = lockedFeatureCode(error);
      if (useAuthStore.getState().user?.scope !== 'PLATFORM') {
        useFeatureStore.getState().setLocked(code);
        // The cached list is stale: reload it so menus lock themselves.
        const current = useAuthStore.getState().user?.enabledFeatures;
        if (Array.isArray(current) && code && current.includes(code)) {
          useAuthStore.getState().setEnabledFeatures(current.filter((c) => c !== code));
        }
        refreshEnabledFeatures();
      }
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
          useAuthStore.getState().setTokens(data.data.accessToken, data.data.refreshToken);
          original.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(original);
        } catch {
          useAuthStore.getState().logout();
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
