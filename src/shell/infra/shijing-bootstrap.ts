import { useAppStore } from '../app-shell/app-store.js';
import { classifyShijingProtectedSessionFailure } from '../app-shell/protected-session-state.js';

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

  const error = Object.assign(
    new Error('ShiJing operations require a separately admitted protected installed session.'),
    {
      reasonCode: 'shijing-protected-operation-set-not-admitted',
      actionHint: 'wait_for_shijing_protected_operation_admission',
    },
  );
  const failure = classifyShijingProtectedSessionFailure(error);
  store.setBootstrapFailure(failure);
  store.setBootstrapError(failure.message);
}
