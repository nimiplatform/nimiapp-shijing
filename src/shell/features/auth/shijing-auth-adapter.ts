import type { AuthPlatformAdapter } from '@nimiplatform/kit/auth';
import { getPlatformClient } from '@nimiplatform/sdk';
import { shijingTauriOAuthBridge } from '../../bridge/index.js';
import {
  ensureShijingRuntimeClientReady,
  loadShijingRuntimeAccountUser,
  logoutShijingRuntimeAccount,
  shijingRuntimeAccountCaller,
  type ShijingAuthUser,
} from '../../infra/shijing-bootstrap.js';

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
  return loadShijingRuntimeAccountUser(getPlatformClient().runtime);
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
    },
    oauthBridge: shijingTauriOAuthBridge,
    syncAfterLogin: async () => {},
  };
}

export function createShijingRuntimeAccountBrowserBroker() {
  return {
    begin: async (input: { callbackUrl: string; baseUrl?: string; timeoutMs: number }) => {
      await ensureShijingRuntimeClientReady();
      const response = await getPlatformClient().runtime.account.beginLogin({
        caller: shijingRuntimeAccountCaller,
        redirectUri: input.callbackUrl,
        callbackOrigin: new URL(input.callbackUrl).origin,
        requestedScopes: [],
        ttlSeconds: Math.max(10, Math.ceil(input.timeoutMs / 1000)),
      });
      if (
        !response.accepted
        || !response.loginAttemptId
        || !response.oauthAuthorizationUrl
        || !response.state
        || !response.nonce
      ) {
        throw new Error(
          `Runtime account login could not start: ${String(response.accountReasonCode || response.reasonCode || 'unknown')}`,
        );
      }
      return {
        loginAttemptId: response.loginAttemptId,
        authorizationUrl: response.oauthAuthorizationUrl,
        state: response.state,
        nonce: response.nonce,
      };
    },
    complete: async (input: {
      loginAttemptId: string;
      code: string;
      state: string;
      nonce: string;
      callbackUrl: string;
    }) => {
      await ensureShijingRuntimeClientReady();
      const response = await getPlatformClient().runtime.account.completeLogin({
        caller: shijingRuntimeAccountCaller,
        loginAttemptId: input.loginAttemptId,
        code: input.code,
        // R-OAUTH-008 / SJG-PROD-02: refreshToken MUST be empty here.
        refreshToken: '',
        state: input.state,
        nonce: input.nonce,
        redirectUri: input.callbackUrl,
        callbackOrigin: new URL(input.callbackUrl).origin,
        uxTraceId: '',
        sealedCompletionTicket: '',
      });
      if (!response.accepted) {
        throw new Error(
          `Runtime account login could not complete: ${String(response.accountReasonCode || response.reasonCode || 'unknown')}`,
        );
      }
      const accountId = String(response.accountProjection?.accountId || '').trim();
      return {
        user: accountId
          ? {
              id: accountId,
              displayName: String(response.accountProjection?.displayName || '').trim(),
            }
          : null,
      };
    },
  };
}
