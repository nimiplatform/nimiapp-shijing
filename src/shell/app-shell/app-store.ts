import { create } from 'zustand';
import type { ShijingRuntimeAccessFailure } from './runtime-access-state.js';

interface AppState {
  bootstrapReady: boolean;
  bootstrapError: string | null;
  bootstrapFailure: ShijingRuntimeAccessFailure | null;
  // Tri-state app AIConfig readiness: null = not yet observed (or session
  // lost), false = observed not-ready, true = observed ready. Readiness edges
  // (false -> true) drive product-layer refresh behavior.
  aiConfigReady: boolean | null;
  // Set when the Host reports the Nimi session invalidated; the product stays
  // unmounted until ShiJing is reopened.
  sessionInvalidated: boolean;
  setBootstrapReady: (ready: boolean) => void;
  setBootstrapError: (error: string | null) => void;
  setBootstrapFailure: (failure: ShijingRuntimeAccessFailure | null) => void;
  setAiConfigReady: (ready: boolean | null) => void;
  setSessionInvalidated: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  bootstrapReady: false,
  bootstrapError: null,
  bootstrapFailure: null,
  aiConfigReady: null,
  sessionInvalidated: false,
  setBootstrapReady: (ready) => set({ bootstrapReady: ready }),
  setBootstrapError: (error) => set({ bootstrapError: error }),
  setBootstrapFailure: (failure) => set({ bootstrapFailure: failure }),
  setAiConfigReady: (ready) => set({ aiConfigReady: ready }),
  setSessionInvalidated: () => set({ sessionInvalidated: true }),
}));
