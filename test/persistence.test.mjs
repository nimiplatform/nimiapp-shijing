// W04 — persistence adapter tests under Mirror Architecture v1.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { SHIJING_INDEXEDDB_VERSION } from '../src/product/persistence/indexeddb-adapter.ts';
import {
  snapshotAccountMismatchError,
  validateLoadedSnapshotForAccount,
} from '../src/product/persistence/account-scope.ts';
import { InMemoryPersistenceAdapter } from '../src/product/persistence/in-memory-adapter.ts';
import {
  createDebouncedSaver,
  loadInitialSnapshot,
  saveSnapshotNow,
} from '../src/product/state/persistence-bridge.ts';
import {
  validConcernTag,
  validEventMemory,
  validPlanItem,
  validReading,
  validShiJingSpace,
} from './_fixtures.mjs';

const TAURI_MAIN_SOURCE = readFileSync(
  new URL('../src-tauri/src/main.rs', import.meta.url),
  'utf8',
);
const INDEXEDDB_ADAPTER_SOURCE = readFileSync(
  new URL('../src/product/persistence/indexeddb-adapter.ts', import.meta.url),
  'utf8',
);
const RUNTIME_APP_STORAGE_ADAPTER_SOURCE = readFileSync(
  new URL('../src/shell/persistence/runtime-app-storage-adapter.ts', import.meta.url),
  'utf8',
);
const PRODUCT_AREA_SOURCE = readFileSync(
  new URL('../src/shell/routes/product-area.tsx', import.meta.url),
  'utf8',
);

test('runtime app storage scopes ShiJingSpace files to the current Nimi account', () => {
  assert.equal(SHIJING_INDEXEDDB_VERSION, 3);
  assert.match(
    TAURI_MAIN_SOURCE,
    /SHIJING_SPACE_ACCOUNT_FILE_PREFIX: &str = "shijing-space\.account\."/,
  );
  assert.doesNotMatch(TAURI_MAIN_SOURCE, /SHIJING_SPACE_FILE_CANDIDATES/);
  assert.match(TAURI_MAIN_SOURCE, /ensure_snapshot_user_matches\(&parsed, &payload\.user_id\)/);
  assert.match(
    RUNTIME_APP_STORAGE_ADAPTER_SOURCE,
    /payload: \{ storageRoot: root, userId: this\.user_id \}/,
  );
  assert.match(
    PRODUCT_AREA_SOURCE,
    /new RuntimeAppStoragePersistenceAdapter\(\{ user_id: userId \}\)/,
  );
  assert.match(PRODUCT_AREA_SOURCE, /\(userId \? pickPersistenceClient\(userId\) : null\)/);
  assert.match(PRODUCT_AREA_SOURCE, /<ShijingStoreProvider\s+key=\{userId\}/);
  assert.match(INDEXEDDB_ADAPTER_SOURCE, /this\.storage_key = snapshotKey\(this\.user_id\)/);
});

test('IndexedDB generation upgrade preserves existing user-data store', () => {
  assert.equal(SHIJING_INDEXEDDB_VERSION, 3);
  assert.doesNotMatch(INDEXEDDB_ADAPTER_SOURCE, /\.deleteObjectStore\(/);
  assert.match(
    INDEXEDDB_ADAPTER_SOURCE,
    /if \(!db\.objectStoreNames\.contains\(SHIJING_INDEXEDDB_STORE\)\) \{\s*db\.createObjectStore\(SHIJING_INDEXEDDB_STORE\);/s,
  );
});

test('persistence account scope accepts only snapshots owned by the expected account', () => {
  const result = validateLoadedSnapshotForAccount(
    validShiJingSpace({ user_id: 'account-1' }),
    'runtime_app_storage',
    ' account-1 ',
  );
  assert.equal(result.ok, true);

  const mismatch = validateLoadedSnapshotForAccount(
    validShiJingSpace({ user_id: 'account-2' }),
    'runtime_app_storage',
    'account-1',
  );
  assert.equal(mismatch.ok, false);
  if (!mismatch.ok) {
    assert.equal(mismatch.error.kind, 'load_account_mismatch');
    assert.equal(mismatch.error.expected_user_id, 'account-1');
    assert.equal(mismatch.error.snapshot_user_id, 'account-2');
  }
});

test('persistence account scope blocks saving snapshots under another account key', () => {
  const mismatch = snapshotAccountMismatchError(
    'save',
    'indexeddb',
    validShiJingSpace({ user_id: 'account-2' }),
    'account-1',
  );
  assert.equal(mismatch?.kind, 'save_account_mismatch');
});

test('in-memory adapter round-trips a valid mirror-architecture ShiJingSpace', async () => {
  const adapter = new InMemoryPersistenceAdapter();
  const space = validShiJingSpace({
    concern_tags: [validConcernTag('tag_love')],
    event_memories: [validEventMemory('m1', { concern_tag_refs: ['tag_love'] })],
    plan_items: [validPlanItem('p1', { concern_tag_refs: ['tag_love'] })],
    readings: [validReading()],
  });
  const save = await adapter.save(space);
  assert.equal(save.ok, true);
  const load = await adapter.load();
  assert.equal(load.ok, true);
  if (load.ok) {
    assert.equal(load.snapshot?.concern_tags.length, 1);
    assert.equal(load.snapshot?.event_memories.length, 1);
    assert.equal(load.snapshot?.plan_items.length, 1);
    assert.equal(load.snapshot?.readings.length, 1);
  }
});

test('in-memory adapter fails-closed on old View-shaped payload', async () => {
  const adapter = new InMemoryPersistenceAdapter();
  const broken = { ...validShiJingSpace(), views: [] };
  const save = await adapter.save(broken);
  assert.equal(save.ok, false);
  if (!save.ok) {
    assert.equal(save.error.kind, 'save_validation_failed');
  }
});

test('in-memory adapter fails-closed on old Relation-shaped payload', async () => {
  const adapter = new InMemoryPersistenceAdapter();
  const broken = { ...validShiJingSpace(), relations: [] };
  const save = await adapter.save(broken);
  assert.equal(save.ok, false);
});

test('in-memory adapter fails-closed on old Event-shaped payload', async () => {
  const adapter = new InMemoryPersistenceAdapter();
  const broken = { ...validShiJingSpace(), events: [] };
  const save = await adapter.save(broken);
  assert.equal(save.ok, false);
});

test('in-memory adapter fails-closed on settings.global_instructions', async () => {
  const adapter = new InMemoryPersistenceAdapter();
  const broken = validShiJingSpace();
  broken.settings = { ...broken.settings, global_instructions: '' };
  const save = await adapter.save(broken);
  assert.equal(save.ok, false);
});

test('in-memory adapter fails-closed on more than five active concern tags', async () => {
  const adapter = new InMemoryPersistenceAdapter();
  const tags = Array.from({ length: 6 }, (_, i) => validConcernTag(`t_${i}`, { sort_order: i }));
  const space = validShiJingSpace({ concern_tags: tags });
  const save = await adapter.save(space);
  assert.equal(save.ok, false);
});

test('loadInitialSnapshot surfaces typed error when stored snapshot fails validation', async () => {
  const adapter = new InMemoryPersistenceAdapter();
  // Force a bad snapshot into the store by going behind the adapter via
  // a casted assignment — represents on-disk corruption.
  const bad = { ...validShiJingSpace(), views: [] };
  await adapter.save(validShiJingSpace());
  Object.assign(adapter, { stored: bad });
  const outcome = await loadInitialSnapshot(adapter);
  assert.equal(outcome.snapshot, null);
  assert.equal(outcome.status.kind, 'error');
});

test('createDebouncedSaver enqueues + flushes a valid snapshot', async () => {
  const adapter = new InMemoryPersistenceAdapter();
  const events = [];
  const saver = createDebouncedSaver(adapter, {
    delay_ms: 1,
    on_status: (s) => events.push(s.kind),
  });
  saver.enqueue(validShiJingSpace());
  await new Promise((r) => setTimeout(r, 5));
  await saver.flush();
  assert.ok(events.includes('saving'));
  assert.ok(events.includes('saved'));
});

test('saveSnapshotNow returns saved only after adapter write succeeds', async () => {
  const adapter = new InMemoryPersistenceAdapter();
  const events = [];
  const status = await saveSnapshotNow(
    adapter,
    validShiJingSpace({
      concern_tags: [validConcernTag('tag_love')],
      readings: [validReading()],
    }),
    (s) => {
      events.push(s.kind);
    },
  );
  assert.equal(status.kind, 'saved');
  assert.deepEqual(events, ['saving', 'saved']);
  const loaded = await adapter.load();
  assert.equal(loaded.ok, true);
  if (loaded.ok) assert.equal(loaded.snapshot?.readings.length, 1);
});

test('saveSnapshotNow surfaces validation failure without fake success', async () => {
  const adapter = new InMemoryPersistenceAdapter();
  const events = [];
  const broken = { ...validShiJingSpace(), views: [] };
  const status = await saveSnapshotNow(adapter, broken, (s) => {
    events.push(s.kind);
  });
  assert.equal(status.kind, 'error');
  if (status.kind === 'error') assert.equal(status.error.kind, 'save_validation_failed');
  assert.deepEqual(events, ['saving', 'error']);
  const loaded = await adapter.load();
  assert.equal(loaded.ok, true);
  if (loaded.ok) assert.equal(loaded.snapshot, null);
});
