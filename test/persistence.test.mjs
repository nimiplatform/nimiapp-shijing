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
import { RuntimeAppStoragePersistenceAdapter } from '../src/shell/persistence/runtime-app-storage-adapter.ts';
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
  assert.doesNotMatch(TAURI_MAIN_SOURCE, /SHIJING_SPACE_ACCOUNT_FILE_PREFIX/);
  assert.doesNotMatch(TAURI_MAIN_SOURCE, /SHIJING_SPACE_FILE_CANDIDATES/);
  assert.doesNotMatch(TAURI_MAIN_SOURCE, /ensure_snapshot_user_matches/);
  assert.match(RUNTIME_APP_STORAGE_ADAPTER_SOURCE, /createInstalledNimiAppStandardShellSurface/);
  assert.match(RUNTIME_APP_STORAGE_ADAPTER_SOURCE, /storage\.readJson\(this\.relativePath\(\)\)/);
  assert.match(RUNTIME_APP_STORAGE_ADAPTER_SOURCE, /storage\.writeJson\(this\.relativePath\(\), snapshotToStorageJson\(snapshot\)\)/);
  assert.match(RUNTIME_APP_STORAGE_ADAPTER_SOURCE, /storage\.removeJson\(this\.relativePath\(\)\)/);
  assert.match(
    RUNTIME_APP_STORAGE_ADAPTER_SOURCE,
    /`shijing-space\/account\.\$\{accountIdToHex\(this\.user_id\)\}\.json`/,
  );
  assert.doesNotMatch(RUNTIME_APP_STORAGE_ADAPTER_SOURCE, /storageRoot/);
  assert.doesNotMatch(RUNTIME_APP_STORAGE_ADAPTER_SOURCE, /shijing_space_/);
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

test('runtime app storage reports structured shell errors as readable causes', async () => {
  const originalWindow = globalThis.window;
  const originalElectronTest = globalThis.__NIMI_ELECTRON_TEST__;
  const expectedRelativePath = 'shijing-space/account.6163636f756e742d7265616461626c652d6572726f72.json';
  try {
    globalThis.window = {};
    globalThis.__NIMI_ELECTRON_TEST__ = {
      invoke: async (command, payload) => {
        assert.equal(command, 'nimi.shell.storage.readJson');
        assert.deepEqual(payload, {
          payload: {
            relativePath: expectedRelativePath,
          },
        });
        throw {
          message: 'read shijing space failed (/tmp/account.json): EACCES',
          code: 'host-internal-error',
          reasonCode: 'shijing-electron-command-failed',
          actionHint: 'inspect_shijing_electron_command',
          source: 'electron',
          details: {
            cause: 'read shijing space failed (/tmp/account.json): EACCES',
          },
        };
      },
      listen: () => () => undefined,
    };
    const adapter = new RuntimeAppStoragePersistenceAdapter({
      user_id: 'account-readable-error',
    });

    const result = await adapter.load();

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.kind, 'load_read_failed');
      assert.match(result.error.cause, /read shijing space failed/);
      assert.doesNotMatch(result.error.cause, /\[object Object\]/);
    }
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalElectronTest === undefined) delete globalThis.__NIMI_ELECTRON_TEST__;
    else globalThis.__NIMI_ELECTRON_TEST__ = originalElectronTest;
  }
});

test('runtime app storage preserves structured shell message when details omit cause', async () => {
  const originalWindow = globalThis.window;
  const originalElectronTest = globalThis.__NIMI_ELECTRON_TEST__;
  try {
    globalThis.window = {};
    globalThis.__NIMI_ELECTRON_TEST__ = {
      invoke: async () => {
        throw {
          message: 'Electron standard storage JSON read failed: EACCES',
          code: 'host-internal-error',
          reasonCode: 'electron-standard-storage-json-read-failed',
          actionHint: 'inspect_standard_storage_host_permissions',
          source: 'electron',
          details: {
            path: '/tmp/shijing-space.json',
          },
        };
      },
      listen: () => () => undefined,
    };
    const adapter = new RuntimeAppStoragePersistenceAdapter({
      user_id: 'account-message-only-error',
    });

    const result = await adapter.load();

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.kind, 'load_read_failed');
      assert.equal(result.error.cause, 'Electron standard storage JSON read failed: EACCES');
      assert.doesNotMatch(result.error.cause, /\[object Object\]/);
    }
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalElectronTest === undefined) delete globalThis.__NIMI_ELECTRON_TEST__;
    else globalThis.__NIMI_ELECTRON_TEST__ = originalElectronTest;
  }
});

test('runtime app storage persistence uses only standard shell relative paths', async () => {
  const originalWindow = globalThis.window;
  const originalElectronTest = globalThis.__NIMI_ELECTRON_TEST__;
  const calls = [];
  const userId = 'user:alpha';
  const expectedRelativePath = `shijing-space/account.${Buffer.from(userId, 'utf8').toString('hex')}.json`;
  try {
    globalThis.window = {};
    globalThis.__NIMI_ELECTRON_TEST__ = {
      invoke: async (command, payload) => {
        calls.push({ command, payload });
        assert.deepEqual(payload, { payload: { relativePath: expectedRelativePath } });
        if (command === 'nimi.shell.storage.readJson') {
          return { path: `/host-owned/${expectedRelativePath}`, value: validShiJingSpace({ user_id: userId }) };
        }
        if (command === 'nimi.shell.storage.writeJson') {
          assert.fail('writeJson payload must include value and is asserted below');
        }
        if (command === 'nimi.shell.storage.removeJson') {
          return { path: `/host-owned/${expectedRelativePath}`, removed: true };
        }
        throw new Error(`unexpected command ${command}`);
      },
      listen: () => () => undefined,
    };
    const adapter = new RuntimeAppStoragePersistenceAdapter({ user_id: userId });

    const load = await adapter.load();
    assert.equal(load.ok, true);
    if (load.ok) assert.equal(load.snapshot?.user_id, userId);

    globalThis.__NIMI_ELECTRON_TEST__.invoke = async (command, payload) => {
      calls.push({ command, payload });
      if (command !== 'nimi.shell.storage.writeJson') throw new Error(`unexpected command ${command}`);
      assert.deepEqual(payload, {
        payload: {
          relativePath: expectedRelativePath,
          value: validShiJingSpace({ user_id: userId }),
        },
      });
      return { path: `/host-owned/${expectedRelativePath}`, value: validShiJingSpace({ user_id: userId }) };
    };
    assert.equal((await adapter.save(validShiJingSpace({ user_id: userId }))).ok, true);

    globalThis.__NIMI_ELECTRON_TEST__.invoke = async (command, payload) => {
      calls.push({ command, payload });
      if (command !== 'nimi.shell.storage.removeJson') throw new Error(`unexpected command ${command}`);
      assert.deepEqual(payload, { payload: { relativePath: expectedRelativePath } });
      return { path: `/host-owned/${expectedRelativePath}`, removed: true };
    };
    assert.equal((await adapter.clear()).ok, true);

    assert.deepEqual(calls.map((call) => call.command), [
      'nimi.shell.storage.readJson',
      'nimi.shell.storage.writeJson',
      'nimi.shell.storage.removeJson',
    ]);
    for (const call of calls) {
      assert.doesNotMatch(JSON.stringify(call.payload), /storageRoot/);
    }
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalElectronTest === undefined) delete globalThis.__NIMI_ELECTRON_TEST__;
    else globalThis.__NIMI_ELECTRON_TEST__ = originalElectronTest;
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
