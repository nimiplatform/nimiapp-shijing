import { create } from 'zustand';

// SJG-PROD-02: Nimi platform owns identity. The renderer-side app store
// keeps only the runtime-projected account identity. Raw Realm access tokens
// are never exposed to ShiJing.
export type AuthUser = {
  id: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
};

export type AuthStatus = 'bootstrapping' | 'authenticated' | 'unauthenticated';

interface AppState {
  auth: {
    status: AuthStatus;
    user: AuthUser | null;
  };
  bootstrapReady: boolean;
  bootstrapError: string | null;

  setAuthSession: (user: AuthUser) => void;
  clearAuthSession: () => void;
  setBootstrapReady: (ready: boolean) => void;
  setBootstrapError: (error: string | null) => void;
}

declare global {
  interface ImportMeta {
    readonly env?: { readonly DEV?: boolean };
  }
  interface Window {
    __SHIJING_APP_STORE__?: typeof useAppStore;
  }
}

export const useAppStore = create<AppState>((set) => ({
  auth: {
    status: 'bootstrapping',
    user: null,
  },
  bootstrapReady: false,
  bootstrapError: null,

  setAuthSession(user) {
    set({ auth: { status: 'authenticated', user } });
  },
  clearAuthSession() {
    set({ auth: { status: 'unauthenticated', user: null } });
  },
  setBootstrapReady: (ready) => set({ bootstrapReady: ready }),
  setBootstrapError: (error) => set({ bootstrapError: error }),
}));

// Expose the store under window during dev so we can drive the authenticated
// state from a debug console without a real Runtime — never read this from
// product source.
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  window.__SHIJING_APP_STORE__ = useAppStore;
}
