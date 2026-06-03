// W04 — persistence adapter tests under Mirror Architecture v1.

import assert from 'node:assert/strict';
import test from 'node:test';

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
