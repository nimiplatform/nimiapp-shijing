import { useAppStore } from '../app-shell/app-store.js';
import { classifyShijingProtectedSessionFailure } from '../app-shell/protected-session-state.js';
import {
  shijingLocalAppRuntimePlatform,
  withShijingLocalAppResponseDeadline,
} from '../local-development/shijing-local-app-runtime.ts';

let bootstrapPromise: Promise<void> | null = null;

export async function runShijingBootstrap(options: { force?: boolean } = {}): Promise<void> {
  if (bootstrapPromise && !options.force) return bootstrapPromise;
  if (options.force) bootstrapPromise = null;
  bootstrapPromise = doRunShijingBootstrap().finally(() => {
    bootstrapPromise = null;
  });
  return bootstrapPromise;
}

export async function ensureShijingBootstrapReady(): Promise<never> {
  await runShijingBootstrap({ force: true });
  const failure = useAppStore.getState().bootstrapFailure;
  throw new Error(failure?.message || 'The protected ShiJing operation set is unavailable.');
}

export async function ensureShijingRuntimeClientReady(): Promise<never> {
  return ensureShijingBootstrapReady();
}

async function doRunShijingBootstrap(): Promise<void> {
  const store = useAppStore.getState();
  store.setBootstrapReady(false);
  store.setBootstrapError(null);
  store.setBootstrapFailure(null);

  try {
    const session = await withShijingLocalAppResponseDeadline(
      shijingLocalAppRuntimePlatform.auth.status(),
      'session status bootstrap',
    );
    if (!session.sessionBound) {
      throw Object.assign(
        new Error(`ShiJing local-development session is ${session.state}.`),
        {
          reasonCode: session.reasonCode,
          actionHint: session.actionHint,
          retryable: session.retryable,
        },
      );
    }
    store.setBootstrapReady(true);
  } catch (error) {
    const failure = classifyShijingProtectedSessionFailure(error);
    store.setBootstrapFailure(failure);
    store.setBootstrapError(failure.message);
  }
}
