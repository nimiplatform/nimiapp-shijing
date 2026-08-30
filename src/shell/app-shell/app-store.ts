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
  setBootstrapReady: (ready: boolean) => void;
  setBootstrapError: (error: string | null) => void;
  setBootstrapFailure: (failure: ShijingRuntimeAccessFailure | null) => void;
  setAiConfigReady: (ready: boolean | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  bootstrapReady: false,
  bootstrapError: null,
  bootstrapFailure: null,
  aiConfigReady: null,
  setBootstrapReady: (ready) => set({ bootstrapReady: ready }),
  setBootstrapError: (error) => set({ bootstrapError: error }),
  setBootstrapFailure: (failure) => set({ bootstrapFailure: failure }),
  setAiConfigReady: (ready) => set({ aiConfigReady: ready }),
}));
