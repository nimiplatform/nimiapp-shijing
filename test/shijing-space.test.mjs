// SJG-DATA-02 — ShiJingSpace validator tests for the Mirror Architecture v1.

import assert from 'node:assert/strict';
import test from 'node:test';

import { validateShiJingSpace } from '../src/contracts/shijing-space-validator.ts';
import {
  consultationMirrorScope,
  validConcernTag,
  validConversation,
  validEventMemory,
  validNatalInputs,
  validPerson,
  validPlanItem,
  validReading,
  validShiJingSpace,
} from './_fixtures.mjs';

function baseSpace(overrides = {}) {
  return validShiJingSpace(overrides);
}

test('empty space with valid natal inputs is valid', () => {
  const result = validateShiJingSpace(baseSpace());
  assert.equal(result.ok, true, JSON.stringify(result));
});

test('space root with removed View field name is rejected', () => {
  const space = baseSpace();
  space.views = [];
  const result = validateShiJingSpace(space);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'space_removed_field_present');
    assert.equal(result.error.container, 'space');
    assert.equal(result.error.field, 'views');
  }
});

test('space root with removed Relation field name is rejected', () => {
  const space = baseSpace();
  space.relations = [];
  const result = validateShiJingSpace(space);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.field, 'relations');
  }
});

test('space root with removed Event field name is rejected', () => {
  const space = baseSpace();
  space.events = [];
  const result = validateShiJingSpace(space);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.field, 'events');
  }
});

test('settings with global_instructions is rejected', () => {
  const space = baseSpace();
  space.settings.global_instructions = 'whatever';
  const result = validateShiJingSpace(space);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'space_removed_field_present');
    assert.equal(result.error.container, 'settings');
    assert.equal(result.error.field, 'global_instructions');
  }
});

test('settings with project_memory is rejected', () => {
  const space = baseSpace();
  space.settings.project_memory = {};
  const result = validateShiJingSpace(space);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.field, 'project_memory');
  }
});

test('admitted EventMemory / event_memories key is NOT rejected as removed', () => {
  const space = baseSpace({ event_memories: [validEventMemory('m1')] });
  const result = validateShiJingSpace(space);
  assert.equal(result.ok, true, JSON.stringify(result));
});

test('admitted PlanItem / plan_items key is NOT rejected as removed', () => {
  const space = baseSpace({ plan_items: [validPlanItem('p1')] });
  const result = validateShiJingSpace(space);
  assert.equal(result.ok, true, JSON.stringify(result));
});

test('admitted ConcernTag / concern_tags key is NOT rejected as removed', () => {
  const space = baseSpace({ concern_tags: [validConcernTag('t1')] });
  const result = validateShiJingSpace(space);
  assert.equal(result.ok, true, JSON.stringify(result));
});

test('invalid self natal inputs fail-close', () => {
  const broken = { ...validNatalInputs(), birth_datetime_utc: 'not-iso' };
  const space = baseSpace({ self_subject: { natal_inputs: broken } });
  const result = validateShiJingSpace(space);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'space_self_subject_natal_inputs_invalid');
});

test('person with kind other than "person" is rejected', () => {
  const result = validateShiJingSpace(
    baseSpace({ persons: [validPerson('p_01', { kind: 'profile' })] }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'space_person_kind_invalid');
});

test('duplicate person id is rejected', () => {
  const result = validateShiJingSpace(
    baseSpace({ persons: [validPerson('p_01'), validPerson('p_01')] }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'space_persons_duplicate_id');
});

test('more than five active concern tags is rejected', () => {
  const tags = Array.from({ length: 6 }, (_, i) => validConcernTag(`t_${i}`, { sort_order: i }));
  const result = validateShiJingSpace(baseSpace({ concern_tags: tags }));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'space_concern_tags_invalid');
  }
});

test('concern tag mention with unresolvable person ref is rejected', () => {
  const tag = validConcernTag('t1', {
    mention_refs: [
      { token: '@x', resolved_subject_ref: { kind: 'person', id: 'p_missing' } },
    ],
  });
  const result = validateShiJingSpace(baseSpace({ concern_tags: [tag] }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'space_subject_ref_unresolvable');
});

test('event memory with unresolvable concern tag ref is rejected', () => {
  const memory = validEventMemory('m1', { concern_tag_refs: ['tag_missing'] });
  const result = validateShiJingSpace(baseSpace({ event_memories: [memory] }));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'space_event_memory_concern_tag_ref_unresolvable');
  }
});

test('plan item with unresolvable concern tag ref is rejected', () => {
  const plan = validPlanItem('p1', { concern_tag_refs: ['tag_missing'] });
  const result = validateShiJingSpace(baseSpace({ plan_items: [plan] }));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'space_plan_item_concern_tag_ref_unresolvable');
  }
});

test('reading with unresolvable concern tag ref is rejected', () => {
  const reading = validReading({ concern_tag_refs: ['tag_missing'] });
  const result = validateShiJingSpace(baseSpace({ readings: [reading] }));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'space_reading_concern_tag_ref_unresolvable');
  }
});

test('reading with unresolvable cited_event_memory_ref is rejected', () => {
  const tag = validConcernTag('tag_love');
  const reading = validReading({ cited_event_memory_refs: ['mem_missing'] });
  reading.output = { ...reading.output, cited_event_memory_refs: ['mem_missing'] };
  const result = validateShiJingSpace(
    baseSpace({ concern_tags: [tag], readings: [reading] }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'space_reading_cited_event_memory_unresolvable');
  }
});

test('reading with unresolvable related_person_ref is rejected', () => {
  const tag = validConcernTag('tag_love');
  const reading = validReading({
    related_person_refs: [{ kind: 'person', id: 'p_missing' }],
  });
  const result = validateShiJingSpace(
    baseSpace({ concern_tags: [tag], readings: [reading] }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'space_reading_related_person_ref_unresolvable');
  }
});

test('shijing reading with unresolvable source_reading id is rejected', () => {
  const tag = validConcernTag('tag_love');
  const sourceIds = ['r_missing'];
  const reading = validReading({
    id: 'r_consult',
    mirror_kind: 'shijing',
    mirror_scope: consultationMirrorScope(sourceIds),
    cited_reading_ids: sourceIds,
  });
  const result = validateShiJingSpace(
    baseSpace({ concern_tags: [tag], readings: [reading] }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'space_reading_cited_reading_unresolvable');
  }
});

test('conversation source_reading must resolve to existing reading', () => {
  const conversation = validConversation({ source_reading_ids: ['r_missing'] });
  // Re-cite the missing source so per-conversation citation guards pass; the
  // space-level guard is what should fail-close on unresolved source.
  conversation.turns[1].cited_reading_ids = ['r_missing'];
  const result = validateShiJingSpace(baseSpace({ conversations: [conversation] }));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'space_conversation_source_reading_unresolvable');
  }
});

test('conversation concern archive refs must resolve to existing concern tags', () => {
  const reading = validReading({ id: 'r_a', concern_tag_refs: [] });
  const conv = validConversation({
    source_reading_ids: ['r_a'],
    concern_tag_refs: ['tag_missing'],
  });
  conv.turns[1].cited_reading_ids = ['r_a'];
  const result = validateShiJingSpace(baseSpace({ readings: [reading], conversations: [conv] }));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'space_conversation_concern_tag_ref_unresolvable');
  }
});

test('conversation ai turn must cite reading from source_reading_ids', () => {
  const tag = validConcernTag('tag_love');
  const reading = validReading({ id: 'r_a' });
  const conv = validConversation({ source_reading_ids: ['r_a'], concern_tag_refs: ['tag_love'] });
  conv.turns[1].cited_reading_ids = ['r_a'];
  const result = validateShiJingSpace(
    baseSpace({ concern_tags: [tag], readings: [reading], conversations: [conv] }),
  );
  assert.equal(result.ok, true, JSON.stringify(result));
});

test('valid space with persons, concern tags, memories, plans, readings, conversation passes', () => {
  const tag = validConcernTag('tag_love');
  const person = validPerson('p_01');
  const memory = validEventMemory('m_01', {
    concern_tag_refs: ['tag_love'],
    person_refs: [{ kind: 'person', id: 'p_01' }],
  });
  const plan = validPlanItem('p_plan_01', { concern_tag_refs: ['tag_love'] });
  const reading = validReading({ id: 'r_a' });
  const conv = validConversation({ source_reading_ids: ['r_a'], concern_tag_refs: ['tag_love'] });
  conv.turns[1].cited_reading_ids = ['r_a'];
  const result = validateShiJingSpace(
    baseSpace({
      persons: [person],
      concern_tags: [tag],
      event_memories: [memory],
      plan_items: [plan],
      readings: [reading],
      conversations: [conv],
    }),
  );
  assert.equal(result.ok, true, JSON.stringify(result));
});

test('space accepts a person with a bounded relation label', () => {
  const space = { ...validShiJingSpace(), persons: [validPerson('p_rel', { relation: '合伙人' })] };
  assert.equal(validateShiJingSpace(space).ok, true);
});

test('space rejects a person whose relation exceeds the length cap', () => {
  const space = { ...validShiJingSpace(), persons: [validPerson('p_rel', { relation: 'x'.repeat(41) })] };
  const r = validateShiJingSpace(space);
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error.code, 'space_person_relation_invalid');
});
