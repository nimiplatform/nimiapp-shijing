// Wave-2 — InMemory PersistenceClient adapter tests + bridge wiring tests
// (debounced saver). IndexedDB adapter is exercised structurally only — the
// real DOM IndexedDB lives in the browser/Tauri webview, admitted to wave-4.

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { InMemoryPersistenceAdapter } from '../src/product/persistence/in-memory-adapter.ts';
import {
  IndexedDBPersistenceAdapter,
  SHIJING_INDEXEDDB_DATABASE,
  SHIJING_INDEXEDDB_STORE,
  SHIJING_INDEXEDDB_VERSION,
} from '../src/product/persistence/indexeddb-adapter.ts';
import { createDebouncedSaver, loadInitialSnapshot } from '../src/product/state/persistence-bridge.ts';

import { validShiJingSpace } from './_fixtures.mjs';

function validSnapshot(overrides = {}) {
  return validShiJingSpace(overrides);
}

test('in-memory adapter load returns null when empty', async () => {
  const adapter = new InMemoryPersistenceAdapter();
  const result = await adapter.load();
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.snapshot, null);
});

test('in-memory adapter save+load round-trips a valid snapshot', async () => {
  const adapter = new InMemoryPersistenceAdapter();
  const snapshot = validSnapshot();
  const saveResult = await adapter.save(snapshot);
  assert.equal(saveResult.ok, true);
  const loadResult = await adapter.load();
  assert.equal(loadResult.ok, true);
  if (loadResult.ok) {
    assert.equal(loadResult.snapshot?.user_id, 'u_01');
  }
});

test('in-memory adapter save rejects invalid snapshot via validator', async () => {
  const adapter = new InMemoryPersistenceAdapter();
  const broken = validSnapshot();
  broken.profiles = [];
  const result = await adapter.save(broken);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.kind, 'save_validation_failed');
    assert.equal(result.error.adapter, 'in_memory');
    assert.equal(result.error.validation_error.code, 'space_removed_field_present');
  }
  assert.equal(adapter.peek(), null, 'invalid snapshot must NOT be persisted');
});

test('in-memory adapter load rejects invalid stored snapshot (no silent coerce)', async () => {
  const broken = validSnapshot();
  broken.settings.global_instructions = '';
  const adapter = new InMemoryPersistenceAdapter(broken);
  const result = await adapter.load();
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.kind, 'load_invalid_snapshot');
    assert.equal(result.error.adapter, 'in_memory');
  }
});

test('in-memory adapter clear removes the stored snapshot', async () => {
  const adapter = new InMemoryPersistenceAdapter(validSnapshot());
  const clearResult = await adapter.clear();
  assert.equal(clearResult.ok, true);
  const loadResult = await adapter.load();
  assert.equal(loadResult.ok, true);
  if (loadResult.ok) assert.equal(loadResult.snapshot, null);
});

test('indexeddb adapter exposes stable database / store / version constants', () => {
  assert.equal(SHIJING_INDEXEDDB_DATABASE, 'shijing-app');
  assert.equal(SHIJING_INDEXEDDB_STORE, 'shijing-space');
  assert.equal(SHIJING_INDEXEDDB_VERSION, 1);
});

test('indexeddb adapter isSupported() returns false under node --test', () => {
  assert.equal(IndexedDBPersistenceAdapter.isSupported(), false);
});

test('indexeddb adapter load surfaces typed unsupported-environment error in node', async () => {
  const adapter = new IndexedDBPersistenceAdapter({ user_id: 'u_99' });
  const result = await adapter.load();
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.kind, 'load_unsupported_environment');
    assert.equal(result.error.adapter, 'indexeddb');
  }
});

test('indexeddb adapter save rejects invalid snapshot before reaching IndexedDB', async () => {
  const broken = validSnapshot();
  broken.profiles = [];
  const adapter = new IndexedDBPersistenceAdapter({ user_id: 'u_99' });
  const result = await adapter.save(broken);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.kind, 'save_validation_failed');
});

test('loadInitialSnapshot reports loaded status on success', async () => {
  const adapter = new InMemoryPersistenceAdapter(validSnapshot());
  const outcome = await loadInitialSnapshot(adapter);
  assert.equal(outcome.status.kind, 'loaded');
  if (outcome.status.kind === 'loaded') assert.equal(outcome.status.adapter, 'in_memory');
  assert.ok(outcome.snapshot && outcome.snapshot.user_id === 'u_01');
});

test('loadInitialSnapshot reports typed-error status on invalid stored snapshot', async () => {
  const broken = validSnapshot();
  broken.profiles = [];
  const adapter = new InMemoryPersistenceAdapter(broken);
  const outcome = await loadInitialSnapshot(adapter);
  assert.equal(outcome.snapshot, null);
  assert.equal(outcome.status.kind, 'error');
  if (outcome.status.kind === 'error') {
    assert.equal(outcome.status.error.kind, 'load_invalid_snapshot');
  }
});

test('debounced saver coalesces back-to-back enqueues and saves once', async () => {
  const adapter = new InMemoryPersistenceAdapter();
  const statuses = [];
  let scheduledCallback = null;
  const saver = createDebouncedSaver(adapter, {
    delay_ms: 100,
    schedule: (cb) => {
      scheduledCallback = cb;
      return Symbol('handle');
    },
    cancel: () => {},
    on_status: (status) => statuses.push(status),
  });
  saver.enqueue(validSnapshot({ user_id: 'u_first' }));
  saver.enqueue(validSnapshot({ user_id: 'u_second' }));
  if (scheduledCallback) scheduledCallback();
  await saver.flush();
  const saved = adapter.peek();
  assert.ok(saved);
  assert.equal(saved.user_id, 'u_second');
  assert.ok(statuses.some((s) => s.kind === 'saving'));
  assert.ok(statuses.some((s) => s.kind === 'saved'));
});

test('debounced saver surfaces typed error on save validator failure', async () => {
  const adapter = new InMemoryPersistenceAdapter();
  const statuses = [];
  const saver = createDebouncedSaver(adapter, {
    delay_ms: 0,
    schedule: (cb) => {
      cb();
      return null;
    },
    cancel: () => {},
    on_status: (status) => statuses.push(status),
  });
  const broken = validSnapshot();
  broken.profiles = [];
  saver.enqueue(broken);
  await saver.flush();
  const errorStatus = statuses.find((s) => s.kind === 'error');
  assert.ok(errorStatus, 'saver should emit error status');
  if (errorStatus && errorStatus.kind === 'error') {
    assert.equal(errorStatus.error.kind, 'save_validation_failed');
  }
});

test('debounced saver cancel discards pending enqueue', async () => {
  const adapter = new InMemoryPersistenceAdapter();
  let scheduled = null;
  const saver = createDebouncedSaver(adapter, {
    delay_ms: 100,
    schedule: (cb) => {
      scheduled = cb;
      return Symbol();
    },
    cancel: () => {
      scheduled = null;
    },
    on_status: () => {},
  });
  saver.enqueue(validSnapshot());
  saver.cancel();
  assert.equal(scheduled, null);
  await saver.flush();
  assert.equal(adapter.peek(), null);
});

test('persistence sources never reach for fetch/HTTP/Tauri/Rust', () => {
  const FILES = [
    new URL('../src/product/persistence/persistence-client.ts', import.meta.url),
    new URL('../src/product/persistence/in-memory-adapter.ts', import.meta.url),
    new URL('../src/product/persistence/indexeddb-adapter.ts', import.meta.url),
    new URL('../src/product/state/persistence-bridge.ts', import.meta.url),
  ];
  const FORBIDDEN = [/fetch\s*\(/, /XMLHttpRequest/, /axios/, /grpc/, /WebSocket/, /\binvoke\s*\(/, /@tauri-apps/];
  for (const url of FILES) {
    const source = readFileSync(url, 'utf8');
    for (const pattern of FORBIDDEN) {
      assert.doesNotMatch(source, pattern, `${url.href} contains forbidden primitive ${pattern}`);
    }
  }
});
