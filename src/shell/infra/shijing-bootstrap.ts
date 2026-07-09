import { useAppStore } from '../app-shell/app-store.js';
import {
  ensureShijingReadingAIConfigFromFirstLaunchProfile,
} from '../ai/shijing-ai-config-bootstrap.ts';
import { hydrateShijingAIConfigFromShell } from '../ai/shijing-ai-config.ts';
import { describeError, logRendererEvent } from './renderer-log.js';
import { hasShijingNimiClient, setShijingNimiClient } from './shijing-nimi-client.js';
import {
  clearShijingRuntimeSession,
  configureShijingRuntimeSession,
  loadShijingRuntimeAccountUser,
  logoutShijingRuntimeAccount as logoutCurrentShijingRuntimeAccount,
  type ShijingAuthUser,
} from './shijing-runtime-session.ts';
import {
  SHIJING_RUNTIME_APP_ID,
  SHIJING_RUNTIME_APP_INSTANCE_ID,
  SHIJING_RUNTIME_DEVICE_ID,
} from '../../contracts/app-identity.ts';

let bootstrapPromise: Promise<void> | null = null;

export {
  SHIJING_RUNTIME_APP_ID,
  SHIJING_RUNTIME_APP_INSTANCE_ID,
  SHIJING_RUNTIME_DEVICE_ID,
  loadShijingRuntimeAccountUser,
  type ShijingAuthUser,
};

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

export async function ensureShijingRuntimeClientReady(): Promise<void> {
  await ensureShijingBootstrapReady();
  if (hasShijingNimiClient()) return;
  await runShijingBootstrap({ force: true });
  if (!hasShijingNimiClient()) {
    throw new Error('ShiJing Nimi client is unavailable after bootstrap retry');
  }
}

async function doRunShijingBootstrap(): Promise<void> {
  const store = useAppStore.getState();
  const flowId = `shijing-bootstrap-${Date.now().toString(36)}`;

  try {
    // Step 1: Construct the host-owned installed app Runtime client.
    setShijingNimiClient(null);
    clearShijingRuntimeSession();
    const session = await configureShijingRuntimeSession();
    setShijingNimiClient(session.client);

    // Step 2: Resolve current account from runtime projection.
    const runtimeAccountUser = await loadShijingRuntimeAccountUser(session.accountRuntime)
      .catch((error) => {
        logRendererEvent({
          level: 'warn',
          area: 'shijing-bootstrap.account',
          message: 'action:runtime-account-projection-unavailable',
          flowId,
          details: { error: describeError(error) },
        });
        return null;
      });
    if (runtimeAccountUser) {
      store.setAuthSession(runtimeAccountUser);
    } else {
      store.clearAuthSession();
    }

    // Step 3: Runtime SDK readiness. Product surfaces must not mount against a
    // runtime client that cannot answer Runtime app storage projections.
    await session.runtime.ready();

    await hydrateShijingAIConfigFromShell();
    const aiConfigInit = await ensureShijingReadingAIConfigFromFirstLaunchProfile();
    if (aiConfigInit.outcome === 'setup-required') {
      logRendererEvent({
        level: 'error',
        area: 'shijing-bootstrap.ai-config',
        message: 'action:first-launch-ai-config-setup-required',
        flowId,
        details: {
          reason: aiConfigInit.reason,
          detail: aiConfigInit.detail,
        },
      });
      throw new Error(`ShiJing first-launch AIConfig setup required: ${aiConfigInit.reason}${
        aiConfigInit.detail ? ` (${aiConfigInit.detail})` : ''
      }`);
    }

    store.setBootstrapReady(true);
    store.setBootstrapError(null);
  } catch (error) {
    setShijingNimiClient(null);
    clearShijingRuntimeSession();
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
  await logoutCurrentShijingRuntimeAccount();
}
