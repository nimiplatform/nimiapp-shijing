import {
  createRuntimeAccountBrowserBroker,
  type AuthPlatformAdapter,
} from '@nimiplatform/kit/auth';
import { shijingTauriOAuthBridge } from '../../bridge/index.js';
import {
  ensureShijingRuntimeClientReady,
  logoutShijingRuntimeAccount,
  type ShijingAuthUser,
} from '../../infra/shijing-bootstrap.js';
import {
  getShijingRuntimeSession,
  loadShijingRuntimeAccountUser,
  shijingRuntimeAccountCaller,
} from '../../infra/shijing-runtime-session.ts';
import { useAppStore } from '../../app-shell/app-store.ts';

const SHIJING_EMBEDDED_AUTH_UNSUPPORTED =
  'Embedded auth flow is not supported in ShiJing desktop-browser mode.';

const SHIJING_TOKEN_PROXY_FORBIDDEN =
  'ShiJing does not own access/refresh token custody (SJG-PROD-02). '
  + 'Runtime is the sole owner — login through the desktop browser broker.';

function unsupported<T>(): Promise<T> {
  return Promise.reject(new Error(SHIJING_EMBEDDED_AUTH_UNSUPPORTED));
}

export async function loadCurrentUser(): Promise<ShijingAuthUser | null> {
  await ensureShijingRuntimeClientReady();
  return loadShijingRuntimeAccountUser(getShijingRuntimeSession().accountRuntime);
}

async function syncAuthSessionFromRuntime(): Promise<void> {
  const user = await loadCurrentUser();
  const store = useAppStore.getState();
  if (user) {
    store.setAuthSession(user);
  } else {
    store.clearAuthSession();
  }
}

export function createShijingDesktopBrowserAuthAdapter(): AuthPlatformAdapter {
  return {
    checkEmail: unsupported,
    passwordLogin: unsupported,
    requestEmailOtp: unsupported,
    verifyEmailOtp: unsupported,
    verifyTwoFactor: unsupported,
    walletChallenge: unsupported,
    walletLogin: unsupported,
    oauthLogin: unsupported,
    updatePassword: unsupported,
    loadCurrentUser,
    applyToken: async () => {
      throw new Error(SHIJING_TOKEN_PROXY_FORBIDDEN);
    },
    persistSession: async () => {
      throw new Error(SHIJING_TOKEN_PROXY_FORBIDDEN);
    },
    clearPersistedSession: async () => {
      await logoutShijingRuntimeAccount();
      useAppStore.getState().clearAuthSession();
    },
    oauthBridge: shijingTauriOAuthBridge,
    syncAfterLogin: syncAuthSessionFromRuntime,
    onLoginComplete: syncAuthSessionFromRuntime,
  };
}

export function createShijingRuntimeAccountBrowserBroker() {
  return createRuntimeAccountBrowserBroker({
    caller: shijingRuntimeAccountCaller,
    beforeRequest: ensureShijingRuntimeClientReady,
    getClient: () => getShijingRuntimeSession().client,
    projectUser: (projection) => {
      const accountId = String(projection.accountId || '').trim();
      return accountId
        ? {
            id: accountId,
            displayName: String(projection.displayName || '').trim(),
          }
        : null;
    },
  });
}
