import { create } from 'zustand';
import type { ShijingProtectedSessionFailure } from './protected-session-state.js';

interface AppState {
  bootstrapReady: boolean;
  bootstrapError: string | null;
  bootstrapFailure: ShijingProtectedSessionFailure | null;
  setBootstrapReady: (ready: boolean) => void;
  setBootstrapError: (error: string | null) => void;
  setBootstrapFailure: (failure: ShijingProtectedSessionFailure | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  bootstrapReady: false,
  bootstrapError: null,
  bootstrapFailure: null,
  setBootstrapReady: (ready) => set({ bootstrapReady: ready }),
  setBootstrapError: (error) => set({ bootstrapError: error }),
  setBootstrapFailure: (failure) => set({ bootstrapFailure: failure }),
}));
