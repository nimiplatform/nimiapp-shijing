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

// @nimi-authority: rule.shijing.product.r017
export function persistenceReadyForManualGeneration(input: {
  readonly persistence_status: PersistenceLifecycleStatus;
  readonly has_persistence_client: boolean;
}): boolean {
  if (persistenceReadyForAutoGeneration(input)) return true;
  // An explicit attempt can recover a failed write. Loading, validation and
  // account failures remain closed; the new Reading still has to save before
  // it becomes visible or is published.
  return input.persistence_status.kind === 'error'
    && input.persistence_status.error.kind === 'save_write_failed';
}
