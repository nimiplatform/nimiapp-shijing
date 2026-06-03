// Wave-2 — typed persistence boundary for ShiJingSpace. Every implementation
// MUST run validateShiJingSpace on read and write; failure surfaces as a
// typed PersistenceError, never silently swallowed.

import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import type { ShijingSpaceValidationError } from '../../contracts/shijing-space-validator.ts';

export type PersistenceAdapterKind = 'in_memory' | 'indexeddb' | 'runtime_app_storage';

export type PersistenceError =
  | { kind: 'load_unsupported_environment'; adapter: PersistenceAdapterKind; reason: string }
  | { kind: 'load_open_failed'; adapter: PersistenceAdapterKind; cause: string }
  | { kind: 'load_read_failed'; adapter: PersistenceAdapterKind; cause: string }
  | { kind: 'load_invalid_snapshot'; adapter: PersistenceAdapterKind; validation_error: ShijingSpaceValidationError }
  | { kind: 'save_validation_failed'; adapter: PersistenceAdapterKind; validation_error: ShijingSpaceValidationError }
  | { kind: 'save_write_failed'; adapter: PersistenceAdapterKind; cause: string }
  | { kind: 'clear_failed'; adapter: PersistenceAdapterKind; cause: string };

export type LoadResult =
  | { ok: true; snapshot: ShiJingSpace | null }
  | { ok: false; error: PersistenceError };

export type SaveResult =
  | { ok: true }
  | { ok: false; error: PersistenceError };

export type ClearResult =
  | { ok: true }
  | { ok: false; error: PersistenceError };

export interface PersistenceClient {
  readonly adapter_kind: PersistenceAdapterKind;
  load(): Promise<LoadResult>;
  save(snapshot: ShiJingSpace): Promise<SaveResult>;
  clear(): Promise<ClearResult>;
}
