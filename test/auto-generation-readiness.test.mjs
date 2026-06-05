import assert from 'node:assert/strict';
import test from 'node:test';

import { persistenceReadyForAutoGeneration } from '../src/product/tabs/auto-generation-readiness.ts';

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
