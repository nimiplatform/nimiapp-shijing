// Audit P2 — deleting an EventMemory / PlanItem left Readings & Conversations
// that cited it as orphans (silently dropped only on the next load). Deletion now
// cascades atomically and reports what else was removed.

import assert from 'node:assert/strict';
import test from 'node:test';
import { cascadeOnEntityRemoval } from '../src/product/reading/cascade-delete.ts';
import { deleteEventMemory } from '../src/product/memories/memory-editor-state.ts';
import { deletePlanItem } from '../src/product/plans/plan-editor-state.ts';

const reading = (id, mem = [], plan = [], cited = []) => ({
  id, mirror_kind: 'rijing', cited_event_memory_refs: mem, cited_plan_item_refs: plan, cited_reading_ids: cited,
});
const turn = (mem = [], plan = [], rd = []) => ({ cited_event_memory_refs: mem, cited_plan_item_refs: plan, cited_reading_ids: rd });
const convo = (id, sources = [], turns = []) => ({ id, source_reading_ids: sources, turns });
const space = (readings, conversations = []) => ({ readings, conversations });

test('cascade: drops readings citing the removed memory, keeps the rest', () => {
  const s = space([reading('r1', ['m1']), reading('r2', ['m2']), reading('r3')]);
  const res = cascadeOnEntityRemoval(s, { event_memory_id: 'm1' });
  assert.deepEqual(res.readings.map((r) => r.id), ['r2', 'r3']);
  assert.equal(res.dropped_readings, 1);
});

test('cascade: drops a conversation that cited the memory in a turn', () => {
  const s = space([], [convo('c1', [], [turn(['m1'])]), convo('c2', [], [turn(['mX'])])]);
  const res = cascadeOnEntityRemoval(s, { event_memory_id: 'm1' });
  assert.deepEqual(res.conversations.map((c) => c.id), ['c2']);
  assert.equal(res.dropped_conversations, 1);
});

test('cascade: transitively drops a conversation citing a dropped reading', () => {
  const s = space([reading('r1', ['m1'])], [convo('c1', ['r1'], [])]);
  const res = cascadeOnEntityRemoval(s, { event_memory_id: 'm1' });
  assert.equal(res.readings.length, 0);
  assert.equal(res.conversations.length, 0); // c1 sourced the dropped r1
});

test('cascade: plan-item removal drops readings citing the plan', () => {
  const s = space([reading('r1', [], ['p1']), reading('r2', [], ['p9'])]);
  const res = cascadeOnEntityRemoval(s, { plan_item_id: 'p1' });
  assert.deepEqual(res.readings.map((r) => r.id), ['r2']);
});

test('cascade: removing an uncited entity drops nothing', () => {
  const s = space([reading('r1', ['m1']), reading('r2', ['m2'])]);
  const res = cascadeOnEntityRemoval(s, { event_memory_id: 'm_unused' });
  assert.equal(res.dropped_readings, 0);
  assert.equal(res.readings.length, 2);
});

test('deleteEventMemory cascades and reports counts', () => {
  const s = {
    event_memories: [{ id: 'm1' }, { id: 'm2' }],
    readings: [reading('r1', ['m1']), reading('r2', ['m2'])],
    conversations: [],
  };
  const out = deleteEventMemory(s, 'm1');
  assert.equal(out.ok, true);
  assert.equal(out.dropped_readings, 1);
  assert.deepEqual(out.next_space.event_memories.map((m) => m.id), ['m2']);
  assert.deepEqual(out.next_space.readings.map((r) => r.id), ['r2']);
});

test('deletePlanItem cascades and reports counts', () => {
  const s = {
    plan_items: [{ id: 'p1' }, { id: 'p2' }],
    readings: [reading('r1', [], ['p1']), reading('r2', [], ['p2'])],
    conversations: [],
  };
  const out = deletePlanItem(s, 'p1');
  assert.equal(out.ok, true);
  assert.equal(out.dropped_readings, 1);
  assert.deepEqual(out.next_space.readings.map((r) => r.id), ['r2']);
});

test('deleteEventMemory on a missing id is a typed not-found', () => {
  const out = deleteEventMemory({ event_memories: [], readings: [], conversations: [] }, 'nope');
  assert.equal(out.ok, false);
  if (!out.ok) assert.equal(out.error.code, 'memory_not_found');
});
