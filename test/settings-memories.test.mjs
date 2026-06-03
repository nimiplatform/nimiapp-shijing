// W-c03 — Settings > Memory editor state tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deleteEventMemory,
  upsertEventMemory,
} from '../src/product/memories/memory-editor-state.ts';
import {
  validConcernTag,
  validEventMemory,
  validPerson,
  validShiJingSpace,
} from './_fixtures.mjs';

test('upsertEventMemory appends a valid memory', () => {
  const space = validShiJingSpace();
  const r = upsertEventMemory(space, validEventMemory('m1'));
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.next_space.event_memories.length, 1);
});

test('upsertEventMemory rejects forbidden recap field', () => {
  const m = { ...validEventMemory('m1'), recap: 'leak' };
  const r = upsertEventMemory(validShiJingSpace(), m);
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error.code, 'memory_invalid');
});

test('upsertEventMemory rejects unresolvable concern_tag_ref', () => {
  const space = validShiJingSpace();
  const r = upsertEventMemory(space, validEventMemory('m1', { concern_tag_refs: ['tag_missing'] }));
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error.code, 'memory_concern_tag_ref_unresolvable');
});

test('upsertEventMemory accepts resolvable refs', () => {
  const space = validShiJingSpace({
    concern_tags: [validConcernTag('tag_love')],
    persons: [validPerson('p_alice')],
  });
  const r = upsertEventMemory(
    space,
    validEventMemory('m1', {
      concern_tag_refs: ['tag_love'],
      person_refs: [{ kind: 'person', id: 'p_alice' }],
    }),
  );
  assert.equal(r.ok, true);
});

test('deleteEventMemory removes the memory and rejects unknown id', () => {
  const space = validShiJingSpace({ event_memories: [validEventMemory('m1')] });
  const ok = deleteEventMemory(space, 'm1');
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.next_space.event_memories.length, 0);
  const missing = deleteEventMemory(space, 'mx');
  assert.equal(missing.ok, false);
});
