import { create } from 'zustand';

// Session-only state (not persisted). The enabled feature list itself lives on the auth user.
export const useFeatureStore = create((set) => ({
  status: 'idle', // 'idle' | 'loaded' | 'error'
  lockedFeature: null, // feature code that triggered a FEATURE_NOT_ENABLED response
  setStatus: (status) => set({ status }),
  setLocked: (lockedFeature) => set({ lockedFeature }),
  clearLocked: () => set({ lockedFeature: null }),
}));
