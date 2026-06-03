// W-c03 — Settings > People editor state tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deletePerson,
  upsertPerson,
} from '../src/product/persons/person-editor-state.ts';
import { validConcernTag, validPerson, validShiJingSpace } from './_fixtures.mjs';

test('upsertPerson appends a valid Person', () => {
  const space = validShiJingSpace();
  const r = upsertPerson(space, validPerson('p_alice'));
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.next_space.persons.length, 1);
});

test('upsertPerson rejects empty display_name', () => {
  const r = upsertPerson(validShiJingSpace(), validPerson('p_bob', { display_name: '   ' }));
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error.code, 'person_display_name_empty');
});

test('upsertPerson rejects invalid consent_state', () => {
  const r = upsertPerson(
    validShiJingSpace(),
    validPerson('p_bob', { consent_state: 'maybe' }),
  );
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error.code, 'person_consent_state_invalid');
});

test('upsertPerson updates an existing Person at the same id', () => {
  const space = validShiJingSpace({ persons: [validPerson('p_alice', { display_name: 'Alice v1' })] });
  const r = upsertPerson(space, validPerson('p_alice', { display_name: 'Alice v2' }));
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.next_space.persons[0].display_name, 'Alice v2');
});

test('deletePerson refuses when concern_tag mentions still reference the person', () => {
  const personId = 'p_alice';
  const tag = validConcernTag('tag_love', {
    mention_refs: [{ token: '@Alice', resolved_subject_ref: { kind: 'person', id: personId } }],
  });
  const space = validShiJingSpace({ persons: [validPerson(personId)], concern_tags: [tag] });
  const r = deletePerson(space, personId);
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.error.code, 'person_has_dangling_references');
    assert.ok(r.error.references[0].startsWith('concern_tag:tag_love:mention:'));
  }
});

test('deletePerson succeeds when no references remain', () => {
  const space = validShiJingSpace({ persons: [validPerson('p_alice')] });
  const r = deletePerson(space, 'p_alice');
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.next_space.persons.length, 0);
});

test('deletePerson rejects unknown id', () => {
  const r = deletePerson(validShiJingSpace(), 'p_missing');
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error.code, 'person_not_found');
});

test('upsertPerson keeps a structured relation label', () => {
  const space = validShiJingSpace();
  const r = upsertPerson(space, validPerson('p_rel', { relation: '母亲' }));
  assert.equal(r.ok, true);
  if (r.ok) {
    const added = r.next_space.persons.find((p) => p.id === 'p_rel');
    assert.equal(added.relation, '母亲');
  }
});

test('upsertPerson rejects an over-long relation label', () => {
  const space = validShiJingSpace();
  const r = upsertPerson(space, validPerson('p_rel2', { relation: '关'.repeat(41) }));
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error.code, 'person_relation_too_long');
});
