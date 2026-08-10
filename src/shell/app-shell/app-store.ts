import { create } from 'zustand';
import type { ShijingRuntimeAccessFailure } from './runtime-access-state.js';

interface AppState {
  bootstrapReady: boolean;
  bootstrapError: string | null;
  bootstrapFailure: ShijingRuntimeAccessFailure | null;
  setBootstrapReady: (ready: boolean) => void;
  setBootstrapError: (error: string | null) => void;
  setBootstrapFailure: (failure: ShijingRuntimeAccessFailure | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  bootstrapReady: false,
  bootstrapError: null,
  bootstrapFailure: null,
  setBootstrapReady: (ready) => set({ bootstrapReady: ready }),
  setBootstrapError: (error) => set({ bootstrapError: error }),
  setBootstrapFailure: (failure) => set({ bootstrapFailure: failure }),
}));
