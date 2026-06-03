import {
  clearPlatformClient,
  createNimiAppRuntimePlatformClient,
  getPlatformClient,
  type PlatformClient,
} from '@nimiplatform/sdk';
import {
  AccountCallerMode,
  AccountSessionState,
  type AccountCaller,
  type AccountProjection,
} from '@nimiplatform/sdk/runtime/browser';
import type { Runtime } from '@nimiplatform/sdk/runtime';
import { getShijingRuntimeDefaults } from '../bridge/index.js';
import { useAppStore } from '../app-shell/app-store.js';
import {
  ensureShijingReadingAIConfigFromFirstRunEvidence,
} from '../ai/shijing-ai-config-bootstrap.ts';
import { describeError, logRendererEvent } from './renderer-log.js';
import {
  SHIJING_APP_ID,
  SHIJING_APP_INSTANCE_ID as CANONICAL_SHIJING_APP_INSTANCE_ID,
  SHIJING_DEVICE_ID as CANONICAL_SHIJING_DEVICE_ID,
} from '../../contracts/app-identity.ts';

// SJG-PROD-02 / SJG-DATA-02: Nimi owns the account / session / runtime
// boundary; ShiJing is admitted as an active local first-party Runtime
// account/session consumer. Caller identity is fixed; runtime owns
// refresh-token custody and short-lived access-token projection. No
// app-owned token surface is admitted.

export const SHIJING_RUNTIME_APP_ID = SHIJING_APP_ID;
export const SHIJING_RUNTIME_APP_INSTANCE_ID = CANONICAL_SHIJING_APP_INSTANCE_ID;
export const SHIJING_RUNTIME_DEVICE_ID = CANONICAL_SHIJING_DEVICE_ID;

export const shijingRuntimeAccountCaller: AccountCaller = {
  appId: SHIJING_RUNTIME_APP_ID,
  appInstanceId: SHIJING_RUNTIME_APP_INSTANCE_ID,
  deviceId: SHIJING_RUNTIME_DEVICE_ID,
  mode: AccountCallerMode.LOCAL_FIRST_PARTY_APP,
  scopes: [],
};

let bootstrapPromise: Promise<void> | null = null;

export type ShijingAuthUser = {
  id: string;
  displayName: string;
};

export function normalizeShijingAccountProjection(
  projection: AccountProjection | null | undefined,
): ShijingAuthUser | null {
  const accountId = String(projection?.accountId || '').trim();
  if (!accountId) return null;
  return {
    id: accountId,
    displayName: String(projection?.displayName || '').trim(),
  };
}

export async function loadShijingRuntimeAccountUser(
  runtime: Runtime,
): Promise<ShijingAuthUser | null> {
  const response = await runtime.account.getAccountSessionStatus({
    caller: shijingRuntimeAccountCaller,
  });
  if (response.state !== AccountSessionState.AUTHENTICATED) return null;
  return normalizeShijingAccountProjection(response.accountProjection);
}

export async function runShijingBootstrap(options: { force?: boolean } = {}): Promise<void> {
  if (bootstrapPromise && !options.force) return bootstrapPromise;
  if (options.force) bootstrapPromise = null;
  bootstrapPromise = doRunShijingBootstrap().finally(() => {
    if (!useAppStore.getState().bootstrapReady) bootstrapPromise = null;
  });
  return bootstrapPromise;
}

export async function ensureShijingBootstrapReady(): Promise<void> {
  const store = useAppStore.getState();
  if (store.bootstrapReady) return;
  await runShijingBootstrap();
  const next = useAppStore.getState();
  if (!next.bootstrapReady) {
    throw new Error(next.bootstrapError || 'ShiJing bootstrap did not complete');
  }
}

function hasShijingPlatformClient(): boolean {
  try {
    getPlatformClient();
    return true;
  } catch {
    return false;
  }
}

export async function ensureShijingRuntimeClientReady(): Promise<void> {
  await ensureShijingBootstrapReady();
  if (hasShijingPlatformClient()) return;
  await runShijingBootstrap({ force: true });
  if (!hasShijingPlatformClient()) {
    throw new Error('ShiJing runtime platform client is unavailable after bootstrap retry');
  }
}

async function buildShijingPlatformClient(realmBaseUrl: string): Promise<PlatformClient> {
  // SJG-PROD-02: type-level rejection of any app-owned token surface.
  // Runtime is the sole owner of access/refresh token custody.
  const projection = await createNimiAppRuntimePlatformClient({
    mode: 'local-first-party',
    appId: SHIJING_RUNTIME_APP_ID,
    developerRegistration: import.meta.env?.DEV === true,
    realmBaseUrl,
    runtimeOptions: {
      protectedAccess: {
        autoIssueForAi: true,
      },
    },
    runtimeTransport: {
      type: 'tauri-ipc',
      commandNamespace: 'runtime_bridge',
      eventNamespace: 'runtime_bridge',
    },
    runtimeDefaults: {
      callerId: SHIJING_RUNTIME_APP_ID,
      surfaceId: 'shijing.reading',
    },
  });
  if (projection.status !== 'ready') {
    throw new Error(projection.message);
  }
  return projection.client;
}

async function doRunShijingBootstrap(): Promise<void> {
  const store = useAppStore.getState();
  const flowId = `shijing-bootstrap-${Date.now().toString(36)}`;

  try {
    // Step 1: Runtime defaults (realm base URL, transport).
    const runtimeDefaults = await getShijingRuntimeDefaults();
    store.setRuntimeDefaults(runtimeDefaults);

    // Step 2: Construct the local-first-party-runtime platform client.
    clearPlatformClient();
    const platformClient = await buildShijingPlatformClient(runtimeDefaults.realm.realmBaseUrl);
    const runtime = platformClient.runtime;

    // Step 3: Resolve current account from runtime projection.
    const runtimeAccountUser = runtime
      ? await loadShijingRuntimeAccountUser(runtime).catch((error) => {
          logRendererEvent({
            level: 'warn',
            area: 'shijing-bootstrap.account',
            message: 'action:runtime-account-projection-unavailable',
            flowId,
            details: { error: describeError(error) },
          });
          return null;
        })
      : null;
    if (runtimeAccountUser) {
      store.setAuthSession(runtimeAccountUser);
    } else {
      store.clearAuthSession();
    }

    // Step 4: Runtime SDK readiness. Product surfaces must not mount against a
    // runtime client that cannot answer Runtime app storage projections.
    if (runtime) {
      await runtime.ready();
    }

    const aiConfigInit = await ensureShijingReadingAIConfigFromFirstRunEvidence({
      platformClient,
    });
    if (aiConfigInit.outcome === 'not-initialized') {
      logRendererEvent({
        level: 'warn',
        area: 'shijing-bootstrap.ai-config',
        message: 'action:first-run-ai-config-init-skipped',
        flowId,
        details: {
          reason: aiConfigInit.reason,
          detail: aiConfigInit.detail,
        },
      });
    }

    store.setBootstrapReady(true);
    store.setBootstrapError(null);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logRendererEvent({
      level: 'error',
      area: 'bootstrap',
      message: 'action:bootstrap-failed',
      flowId,
      details: { error: describeError(error) },
    });
    store.setBootstrapError(message);
    store.setBootstrapReady(false);
  }
}

export async function logoutShijingRuntimeAccount(): Promise<void> {
  await ensureShijingRuntimeClientReady();
  await getPlatformClient().runtime.account.logout({
    caller: shijingRuntimeAccountCaller,
    reason: 'shijing_logout',
  });
}
