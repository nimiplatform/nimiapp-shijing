import assert from 'node:assert/strict';
import test from 'node:test';

import {
  persistenceReadyForAutoGeneration,
  persistenceReadyForManualGeneration,
} from '../src/product/tabs/auto-generation-readiness.ts';

test('auto generation waits for persistence load when a client exists', () => {
  assert.equal(
    persistenceReadyForAutoGeneration({
      persistence_status: { kind: 'loading', adapter: 'indexeddb' },
      has_persistence_client: true,
    }),
    false,
  );
  assert.equal(
    persistenceReadyForAutoGeneration({
      persistence_status: { kind: 'loaded', adapter: 'indexeddb', loaded_at: '2026-06-05T00:00:00Z' },
      has_persistence_client: true,
    }),
    true,
  );
});

test('auto generation is blocked on persistence errors', () => {
  assert.equal(
    persistenceReadyForAutoGeneration({
      persistence_status: {
        kind: 'error',
        adapter: 'indexeddb',
        error: { kind: 'load_read_failed', adapter: 'indexeddb', cause: 'boom' },
      },
      has_persistence_client: true,
    }),
    false,
  );
});

test('auto generation may run without a persistence client', () => {
  assert.equal(
    persistenceReadyForAutoGeneration({
      persistence_status: { kind: 'idle' },
      has_persistence_client: false,
    }),
    true,
  );
});

test('only explicit generation can retry a write failure', () => {
  const input = {
    persistence_status: {
      kind: 'error',
      adapter: 'nimi_storage',
      error: { kind: 'save_write_failed', adapter: 'nimi_storage', cause: 'temporary I/O failure' },
    },
    has_persistence_client: true,
  };
  assert.equal(persistenceReadyForAutoGeneration(input), false);
  assert.equal(persistenceReadyForManualGeneration(input), true);
});

test('manual generation does not bypass pending persistence, load, validation or account failures', () => {
  const statuses = [
    { kind: 'idle' },
    { kind: 'loading', adapter: 'nimi_storage' },
    { kind: 'saving', adapter: 'nimi_storage' },
    ...[
      'load_unsupported_environment', 'load_open_failed', 'load_read_failed',
      'load_invalid_snapshot', 'load_account_mismatch', 'save_validation_failed',
      'save_account_mismatch', 'clear_failed',
    ].map((kind) => ({ kind: 'error', adapter: 'nimi_storage', error: { kind, adapter: 'nimi_storage' } })),
  ];
  for (const persistence_status of statuses) {
    assert.equal(persistenceReadyForManualGeneration({ persistence_status, has_persistence_client: true }), false,
      JSON.stringify(persistence_status));
  }
  assert.equal(persistenceReadyForManualGeneration({
    persistence_status: { kind: 'idle' }, has_persistence_client: false,
  }), true);
});
