import { useAppStore } from '../app-shell/app-store.js';
import {
  classifyShijingRuntimeAccessFailure,
  shijingRuntimeAccessFromSession,
} from '../app-shell/runtime-access-state.js';
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
    if (session.sessionBound) {
      store.setBootstrapReady(true);
      return;
    }
    const failure = shijingRuntimeAccessFromSession(session);
    store.setBootstrapFailure(failure);
    store.setBootstrapError(failure.message);
  } catch (error) {
    const failure = classifyShijingRuntimeAccessFailure(error);
    store.setBootstrapFailure(failure);
    store.setBootstrapError(failure.message);
  }
}
