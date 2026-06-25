// W-c04 — ShiJing import-bus reducer tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createInitialState,
  shijingReducer,
} from '../src/product/state/shijing-state.ts';
import {
  validEventMemory,
  validPlanItem,
  validReading,
  validShiJingSpace,
} from './_fixtures.mjs';

function stateWithReadings(readings) {
  return createInitialState(validShiJingSpace({ readings }));
}

test('initial state has an empty pending_shijing_source_reading_ids', () => {
  const s = createInitialState(validShiJingSpace());
  assert.deepEqual(s.pending_shijing_source_reading_ids, []);
});

test('shijing/import-source-reading appends an id when the reading exists', () => {
  const s = stateWithReadings([validReading({ id: 'r_a' })]);
  const next = shijingReducer(s, { type: 'shijing/import-source-reading', reading_id: 'r_a' });
  assert.deepEqual(next.pending_shijing_source_reading_ids, ['r_a']);
});

test('shijing/import-source-reading dedupes already-pending ids', () => {
  const s = stateWithReadings([validReading({ id: 'r_a' })]);
  const once = shijingReducer(s, { type: 'shijing/import-source-reading', reading_id: 'r_a' });
  const twice = shijingReducer(once, { type: 'shijing/import-source-reading', reading_id: 'r_a' });
  assert.equal(twice, once);
  assert.deepEqual(twice.pending_shijing_source_reading_ids, ['r_a']);
});

test('shijing/import-source-reading rejects unknown reading id', () => {
  const s = stateWithReadings([validReading({ id: 'r_a' })]);
  const next = shijingReducer(s, { type: 'shijing/import-source-reading', reading_id: 'r_missing' });
  assert.deepEqual(next.pending_shijing_source_reading_ids, []);
});

test('shijing/remove-source-reading drops an id', () => {
  const s = stateWithReadings([validReading({ id: 'r_a' }), validReading({ id: 'r_b' })]);
  const after_a = shijingReducer(s, { type: 'shijing/import-source-reading', reading_id: 'r_a' });
  const after_b = shijingReducer(after_a, { type: 'shijing/import-source-reading', reading_id: 'r_b' });
  const removed = shijingReducer(after_b, { type: 'shijing/remove-source-reading', reading_id: 'r_a' });
  assert.deepEqual(removed.pending_shijing_source_reading_ids, ['r_b']);
});

test('shijing/clear-import-bus empties the list', () => {
  const s = stateWithReadings([validReading({ id: 'r_a' })]);
  const after = shijingReducer(s, { type: 'shijing/import-source-reading', reading_id: 'r_a' });
  const cleared = shijingReducer(after, { type: 'shijing/clear-import-bus' });
  assert.deepEqual(cleared.pending_shijing_source_reading_ids, []);
});

test('snapshot/replace drops pending ids whose Reading is no longer in the snapshot', () => {
  const r1 = validReading({ id: 'r_a' });
  const r2 = validReading({ id: 'r_b' });
  const s = createInitialState(validShiJingSpace({ readings: [r1, r2] }));
  const imported = shijingReducer(s, { type: 'shijing/import-source-reading', reading_id: 'r_a' });
  const replaced = shijingReducer(imported, {
    type: 'snapshot/replace',
    snapshot: { ...imported.snapshot, readings: [r2] },
  });
  assert.deepEqual(replaced.pending_shijing_source_reading_ids, []);
});

// ----- seed-memory bus ("去问镜问这条") -----

function stateWithMemories(memories) {
  return createInitialState(validShiJingSpace({ event_memories: memories }));
}

test('initial state has an empty pending_shijing_seed_memory_ids', () => {
  const s = createInitialState(validShiJingSpace());
  assert.deepEqual(s.pending_shijing_seed_memory_ids, []);
});

test('shijing/seed-memory appends an id when the memory exists', () => {
  const s = stateWithMemories([validEventMemory('mem_a')]);
  const next = shijingReducer(s, { type: 'shijing/seed-memory', memory_id: 'mem_a' });
  assert.deepEqual(next.pending_shijing_seed_memory_ids, ['mem_a']);
});

test('shijing/seed-memory dedupes already-seeded ids', () => {
  const s = stateWithMemories([validEventMemory('mem_a')]);
  const once = shijingReducer(s, { type: 'shijing/seed-memory', memory_id: 'mem_a' });
  const twice = shijingReducer(once, { type: 'shijing/seed-memory', memory_id: 'mem_a' });
  assert.equal(twice, once);
  assert.deepEqual(twice.pending_shijing_seed_memory_ids, ['mem_a']);
});

test('shijing/seed-memory rejects unknown memory id', () => {
  const s = stateWithMemories([validEventMemory('mem_a')]);
  const next = shijingReducer(s, { type: 'shijing/seed-memory', memory_id: 'mem_missing' });
  assert.deepEqual(next.pending_shijing_seed_memory_ids, []);
});

test('shijing/clear-seed-memory with an id removes just that id', () => {
  const s = stateWithMemories([validEventMemory('mem_a'), validEventMemory('mem_b')]);
  const a = shijingReducer(s, { type: 'shijing/seed-memory', memory_id: 'mem_a' });
  const ab = shijingReducer(a, { type: 'shijing/seed-memory', memory_id: 'mem_b' });
  const removed = shijingReducer(ab, { type: 'shijing/clear-seed-memory', memory_id: 'mem_a' });
  assert.deepEqual(removed.pending_shijing_seed_memory_ids, ['mem_b']);
});

test('shijing/clear-seed-memory without an id empties the list', () => {
  const s = stateWithMemories([validEventMemory('mem_a')]);
  const seeded = shijingReducer(s, { type: 'shijing/seed-memory', memory_id: 'mem_a' });
  const cleared = shijingReducer(seeded, { type: 'shijing/clear-seed-memory' });
  assert.deepEqual(cleared.pending_shijing_seed_memory_ids, []);
});

test('snapshot/replace drops seed ids whose EventMemory is no longer present', () => {
  const m1 = validEventMemory('mem_a');
  const m2 = validEventMemory('mem_b');
  const s = createInitialState(validShiJingSpace({ event_memories: [m1, m2] }));
  const seeded = shijingReducer(s, { type: 'shijing/seed-memory', memory_id: 'mem_a' });
  const replaced = shijingReducer(seeded, {
    type: 'snapshot/replace',
    snapshot: { ...seeded.snapshot, event_memories: [m2] },
  });
  assert.deepEqual(replaced.pending_shijing_seed_memory_ids, []);
});

// ----- seed-plan bus ("去问镜问这条" on a future plan) -----

function stateWithPlans(plans) {
  return createInitialState(validShiJingSpace({ plan_items: plans }));
}

test('initial state has an empty pending_shijing_seed_plan_ids', () => {
  const s = createInitialState(validShiJingSpace());
  assert.deepEqual(s.pending_shijing_seed_plan_ids, []);
});

test('shijing/seed-plan appends an id when the plan exists', () => {
  const s = stateWithPlans([validPlanItem('plan_a')]);
  const next = shijingReducer(s, { type: 'shijing/seed-plan', plan_id: 'plan_a' });
  assert.deepEqual(next.pending_shijing_seed_plan_ids, ['plan_a']);
});

test('shijing/seed-plan dedupes already-seeded ids', () => {
  const s = stateWithPlans([validPlanItem('plan_a')]);
  const once = shijingReducer(s, { type: 'shijing/seed-plan', plan_id: 'plan_a' });
  const twice = shijingReducer(once, { type: 'shijing/seed-plan', plan_id: 'plan_a' });
  assert.equal(twice, once);
  assert.deepEqual(twice.pending_shijing_seed_plan_ids, ['plan_a']);
});

test('shijing/seed-plan rejects unknown plan id', () => {
  const s = stateWithPlans([validPlanItem('plan_a')]);
  const next = shijingReducer(s, { type: 'shijing/seed-plan', plan_id: 'plan_missing' });
  assert.deepEqual(next.pending_shijing_seed_plan_ids, []);
});

test('shijing/clear-seed-plan with an id removes just that id', () => {
  const s = stateWithPlans([validPlanItem('plan_a'), validPlanItem('plan_b')]);
  const a = shijingReducer(s, { type: 'shijing/seed-plan', plan_id: 'plan_a' });
  const ab = shijingReducer(a, { type: 'shijing/seed-plan', plan_id: 'plan_b' });
  const removed = shijingReducer(ab, { type: 'shijing/clear-seed-plan', plan_id: 'plan_a' });
  assert.deepEqual(removed.pending_shijing_seed_plan_ids, ['plan_b']);
});

test('shijing/clear-seed-plan without an id empties the list', () => {
  const s = stateWithPlans([validPlanItem('plan_a')]);
  const seeded = shijingReducer(s, { type: 'shijing/seed-plan', plan_id: 'plan_a' });
  const cleared = shijingReducer(seeded, { type: 'shijing/clear-seed-plan' });
  assert.deepEqual(cleared.pending_shijing_seed_plan_ids, []);
});

test('snapshot/replace drops seed plan ids whose PlanItem is no longer present', () => {
  const p1 = validPlanItem('plan_a');
  const p2 = validPlanItem('plan_b');
  const s = createInitialState(validShiJingSpace({ plan_items: [p1, p2] }));
  const seeded = shijingReducer(s, { type: 'shijing/seed-plan', plan_id: 'plan_a' });
  const replaced = shijingReducer(seeded, {
    type: 'snapshot/replace',
    snapshot: { ...seeded.snapshot, plan_items: [p2] },
  });
  assert.deepEqual(replaced.pending_shijing_seed_plan_ids, []);
});
