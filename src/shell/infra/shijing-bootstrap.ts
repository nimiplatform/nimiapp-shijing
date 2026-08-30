import { useAppStore } from '../app-shell/app-store.js';
import {
  classifyShijingRuntimeAccessFailure,
  shijingRuntimeAccessFromSession,
} from '../app-shell/runtime-access-state.js';
import {
  shijingLocalAppRuntimePlatform,
  withShijingLocalAppResponseDeadline,
} from '../local-development/shijing-local-app-runtime.ts';
import type { NimiAppAuthProjection } from '@nimiplatform/sdk/app';
import { projectShijingAIConfig } from '../ai/shijing-ai-config.ts';

let bootstrapPromise: Promise<void> | null = null;

export async function runShijingBootstrap(
  options: { force?: boolean; preserveReady?: boolean } = {},
): Promise<void> {
  if (bootstrapPromise) return bootstrapPromise;
  bootstrapPromise = doRunShijingBootstrap(options.preserveReady === true).finally(() => {
    bootstrapPromise = null;
  });
  return bootstrapPromise;
}

async function doRunShijingBootstrap(preserveReady: boolean): Promise<void> {
  const store = useAppStore.getState();
  if (!preserveReady) {
    store.setBootstrapReady(false);
    store.setBootstrapError(null);
    store.setBootstrapFailure(null);
  }

  try {
    const session = await withShijingLocalAppResponseDeadline(
      shijingLocalAppRuntimePlatform.auth.status(),
      'session status bootstrap',
    );
    if (session.sessionBound) {
      const aiConfigSnapshot = await withShijingLocalAppResponseDeadline(
        shijingLocalAppRuntimePlatform.aiConfig.get(),
        'App AIConfig access revalidation',
      );
      store.setAiConfigReady(projectShijingAIConfig(aiConfigSnapshot).state === 'ready');
    } else {
      store.setAiConfigReady(null);
    }
    applyShijingSessionProjection(session);
  } catch (error) {
    // Keep the last known AIConfig readiness on transient bootstrap failures:
    // clearing it here would fabricate a not-ready -> ready edge on recovery.
    applyShijingSessionFailure(error);
  }
}

export function applyShijingSessionProjection(session: NimiAppAuthProjection): void {
  const store = useAppStore.getState();
  if (session.sessionBound) {
    store.setBootstrapFailure(null);
    store.setBootstrapError(null);
    store.setBootstrapReady(true);
    return;
  }
  const failure = shijingRuntimeAccessFromSession(session);
  store.setBootstrapReady(false);
  store.setBootstrapFailure(failure);
  store.setBootstrapError(failure.message);
}

export function applyShijingSessionFailure(error: unknown): void {
  const failure = classifyShijingRuntimeAccessFailure(error);
  const store = useAppStore.getState();
  store.setBootstrapReady(false);
  store.setBootstrapFailure(failure);
  store.setBootstrapError(failure.message);
}
