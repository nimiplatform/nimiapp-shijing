// Wave-2 — bridges the in-memory store and the PersistenceClient.
// Pure TypeScript (no React) so it is unit-testable via `node --test`.
// The bridge is invoked from the React store provider on mount + on
// snapshot/replace via a debounced save scheduler.

import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import type { PersistenceClient, PersistenceError } from '../persistence/persistence-client.ts';

export type PersistenceLifecycleStatus =
  | { kind: 'idle' }
  | { kind: 'loading'; adapter: string }
  | { kind: 'loaded'; adapter: string; loaded_at: string }
  | { kind: 'saving'; adapter: string }
  | { kind: 'saved'; adapter: string; saved_at: string }
  | { kind: 'error'; adapter: string; error: PersistenceError };

export interface PersistenceLoadOutcome {
  readonly snapshot: ShiJingSpace | null;
  readonly status: PersistenceLifecycleStatus;
}

export async function loadInitialSnapshot(client: PersistenceClient): Promise<PersistenceLoadOutcome> {
  const result = await client.load();
  if (!result.ok) {
    return { snapshot: null, status: { kind: 'error', adapter: client.adapter_kind, error: result.error } };
  }
  return {
    snapshot: result.snapshot,
    status: {
      kind: 'loaded',
      adapter: client.adapter_kind,
      loaded_at: new Date().toISOString(),
    },
  };
}

export async function saveSnapshotNow(
  client: PersistenceClient,
  snapshot: ShiJingSpace,
  onStatus: (status: PersistenceLifecycleStatus) => void,
): Promise<PersistenceLifecycleStatus> {
  onStatus({ kind: 'saving', adapter: client.adapter_kind });
  const result = await client.save(snapshot);
  if (!result.ok) {
    const status: PersistenceLifecycleStatus = { kind: 'error', adapter: client.adapter_kind, error: result.error };
    onStatus(status);
    return status;
  }
  const status: PersistenceLifecycleStatus = {
    kind: 'saved',
    adapter: client.adapter_kind,
    saved_at: new Date().toISOString(),
  };
  onStatus(status);
  return status;
}

export interface DebouncedSaverOptions {
  readonly delay_ms: number;
  readonly schedule?: (callback: () => void, delay_ms: number) => unknown;
  readonly cancel?: (handle: unknown) => void;
  readonly on_status: (status: PersistenceLifecycleStatus) => void;
}

export interface DebouncedSaver {
  enqueue(snapshot: ShiJingSpace): void;
  flush(): Promise<PersistenceLifecycleStatus>;
  cancel(): void;
}

export function createDebouncedSaver(
  client: PersistenceClient,
  options: DebouncedSaverOptions,
): DebouncedSaver {
  const schedule = options.schedule ?? ((callback, delay) => setTimeout(callback, delay));
  const cancel = options.cancel ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  let pendingHandle: unknown = null;
  let pendingSnapshot: ShiJingSpace | null = null;
  let inFlight: Promise<PersistenceLifecycleStatus> | null = null;

  async function runSave(snapshot: ShiJingSpace): Promise<PersistenceLifecycleStatus> {
    return saveSnapshotNow(client, snapshot, options.on_status);
  }

  function fire(snapshot: ShiJingSpace): void {
    inFlight = runSave(snapshot).finally(() => {
      inFlight = null;
    });
  }

  return {
    enqueue(snapshot) {
      pendingSnapshot = snapshot;
      if (pendingHandle !== null) cancel(pendingHandle);
      pendingHandle = schedule(() => {
        pendingHandle = null;
        const snap = pendingSnapshot;
        pendingSnapshot = null;
        if (snap !== null) fire(snap);
      }, options.delay_ms);
    },
    async flush() {
      if (pendingHandle !== null) {
        cancel(pendingHandle);
        pendingHandle = null;
      }
      const snap = pendingSnapshot;
      pendingSnapshot = null;
      if (snap !== null) {
        fire(snap);
      }
      const pending = inFlight;
      if (!pending) return { kind: 'idle' };
      return pending;
    },
    cancel() {
      if (pendingHandle !== null) {
        cancel(pendingHandle);
        pendingHandle = null;
      }
      pendingSnapshot = null;
    },
  };
}
