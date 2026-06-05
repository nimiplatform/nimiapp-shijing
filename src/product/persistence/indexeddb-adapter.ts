// Wave-2 — IndexedDB-backed PersistenceClient for browser/Tauri webview.
// Persistence stays in the browser process; no Tauri command / Rust /
// network. Every load / save runs validateShiJingSpace.

import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import { dropIncompatibleReadings } from './sanitize-loaded-space.ts';
import type {
  ClearResult,
  LoadResult,
  PersistenceClient,
  SaveResult,
} from './persistence-client.ts';

export const SHIJING_INDEXEDDB_DATABASE = 'shijing-app';
export const SHIJING_INDEXEDDB_STORE = 'shijing-space';
// v2: SJG-FEATURE-v2 envelope refactor (common + method_evidence). Pre-release
// hard cut — the upgrade drops any store written under the old snapshot shape.
export const SHIJING_INDEXEDDB_VERSION = 2;

function getIndexedDB(): IDBFactory | null {
  return typeof globalThis !== 'undefined' && 'indexedDB' in globalThis
    ? (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB
    : null;
}

function snapshotKey(userId: string): string {
  return `space:${userId}`;
}

function openDatabase(): Promise<IDBDatabase> {
  const idb = getIndexedDB();
  if (!idb) {
    return Promise.reject(new Error('IndexedDB is not available in this environment'));
  }
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = idb.open(SHIJING_INDEXEDDB_DATABASE, SHIJING_INDEXEDDB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      // Hard cut: drop a store persisted under the old feature-snapshot shape
      // and recreate empty. No migration is owed (pre-release).
      if (db.objectStoreNames.contains(SHIJING_INDEXEDDB_STORE)) {
        db.deleteObjectStore(SHIJING_INDEXEDDB_STORE);
      }
      db.createObjectStore(SHIJING_INDEXEDDB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
  });
}

function readSnapshot(db: IDBDatabase, key: string): Promise<unknown> {
  return new Promise<unknown>((resolve, reject) => {
    const tx = db.transaction(SHIJING_INDEXEDDB_STORE, 'readonly');
    const store = tx.objectStore(SHIJING_INDEXEDDB_STORE);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed'));
  });
}

function writeSnapshot(db: IDBDatabase, key: string, snapshot: ShiJingSpace): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SHIJING_INDEXEDDB_STORE, 'readwrite');
    const store = tx.objectStore(SHIJING_INDEXEDDB_STORE);
    const request = store.put(snapshot, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('IndexedDB write failed'));
  });
}

function deleteSnapshot(db: IDBDatabase, key: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SHIJING_INDEXEDDB_STORE, 'readwrite');
    const store = tx.objectStore(SHIJING_INDEXEDDB_STORE);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('IndexedDB delete failed'));
  });
}

export interface IndexedDBPersistenceAdapterOptions {
  readonly user_id: string;
}

export class IndexedDBPersistenceAdapter implements PersistenceClient {
  readonly adapter_kind = 'indexeddb' as const;
  private readonly storage_key: string;

  constructor(options: IndexedDBPersistenceAdapterOptions) {
    this.storage_key = snapshotKey(options.user_id);
  }

  static isSupported(): boolean {
    return getIndexedDB() !== null;
  }

  async load(): Promise<LoadResult> {
    if (!IndexedDBPersistenceAdapter.isSupported()) {
      return {
        ok: false,
        error: { kind: 'load_unsupported_environment', adapter: 'indexeddb', reason: 'globalThis.indexedDB is missing' },
      };
    }
    let db: IDBDatabase;
    try {
      db = await openDatabase();
    } catch (cause) {
      return {
        ok: false,
        error: { kind: 'load_open_failed', adapter: 'indexeddb', cause: errorMessage(cause) },
      };
    }
    let raw: unknown;
    try {
      raw = await readSnapshot(db, this.storage_key);
    } catch (cause) {
      db.close();
      return {
        ok: false,
        error: { kind: 'load_read_failed', adapter: 'indexeddb', cause: errorMessage(cause) },
      };
    }
    db.close();
    if (raw === undefined || raw === null) return { ok: true, snapshot: null };
    const sanitized = dropIncompatibleReadings(raw as ShiJingSpace).space;
    const validation = validateShiJingSpace(sanitized);
    if (!validation.ok) {
      return {
        ok: false,
        error: { kind: 'load_invalid_snapshot', adapter: 'indexeddb', validation_error: validation.error },
      };
    }
    return { ok: true, snapshot: sanitized };
  }

  async save(snapshot: ShiJingSpace): Promise<SaveResult> {
    const validation = validateShiJingSpace(snapshot);
    if (!validation.ok) {
      return {
        ok: false,
        error: { kind: 'save_validation_failed', adapter: 'indexeddb', validation_error: validation.error },
      };
    }
    if (!IndexedDBPersistenceAdapter.isSupported()) {
      return {
        ok: false,
        error: { kind: 'save_write_failed', adapter: 'indexeddb', cause: 'IndexedDB is not available' },
      };
    }
    let db: IDBDatabase;
    try {
      db = await openDatabase();
    } catch (cause) {
      return {
        ok: false,
        error: { kind: 'save_write_failed', adapter: 'indexeddb', cause: errorMessage(cause) },
      };
    }
    try {
      await writeSnapshot(db, this.storage_key, snapshot);
    } catch (cause) {
      db.close();
      return {
        ok: false,
        error: { kind: 'save_write_failed', adapter: 'indexeddb', cause: errorMessage(cause) },
      };
    }
    db.close();
    return { ok: true };
  }

  async clear(): Promise<ClearResult> {
    if (!IndexedDBPersistenceAdapter.isSupported()) {
      return {
        ok: false,
        error: { kind: 'clear_failed', adapter: 'indexeddb', cause: 'IndexedDB is not available' },
      };
    }
    let db: IDBDatabase;
    try {
      db = await openDatabase();
    } catch (cause) {
      return {
        ok: false,
        error: { kind: 'clear_failed', adapter: 'indexeddb', cause: errorMessage(cause) },
      };
    }
    try {
      await deleteSnapshot(db, this.storage_key);
    } catch (cause) {
      db.close();
      return {
        ok: false,
        error: { kind: 'clear_failed', adapter: 'indexeddb', cause: errorMessage(cause) },
      };
    }
    db.close();
    return { ok: true };
  }
}

function errorMessage(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  if (typeof cause === 'string') return cause;
  return 'unknown error';
}
