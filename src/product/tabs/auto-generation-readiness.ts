import type { PersistenceLifecycleStatus } from '../state/persistence-bridge.ts';

export function persistenceReadyForAutoGeneration(input: {
  readonly persistence_status: PersistenceLifecycleStatus;
  readonly has_persistence_client: boolean;
}): boolean {
  if (!input.has_persistence_client) return true;
  switch (input.persistence_status.kind) {
    case 'loaded':
    case 'saved':
      return true;
    case 'idle':
    case 'loading':
    case 'saving':
    case 'error':
      return false;
  }
}
