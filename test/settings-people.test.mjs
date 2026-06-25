// W-c03 — Settings > People editor state tests.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  deletePerson,
  personDraftFromPerson,
  upsertPerson,
} from '../src/product/persons/person-editor-state.ts';
import { validConcernTag, validPerson, validShiJingSpace } from './_fixtures.mjs';

const personEditorSource = readFileSync(
  new URL('../src/product/persons/person-editor.tsx', import.meta.url),
  'utf8',
);

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

test('personDraftFromPerson seeds the editor from an existing Person', () => {
  const draft = personDraftFromPerson(validPerson('p_alice', {
    display_name: 'Alice',
    relation: 'partner',
    consent_state: 'subject_consented',
    notes: 'provided directly',
  }));

  assert.equal(draft.meta.id, 'p_alice');
  assert.equal(draft.meta.display_name, 'Alice');
  assert.equal(draft.meta.relation, 'partner');
  assert.equal(draft.meta.consent_state, 'subject_consented');
  assert.equal(draft.meta.notes, 'provided directly');
  assert.equal(draft.natal.local_date_text, '1990-04-12');
  assert.equal(draft.natal.local_time_text, '08:30');
  assert.equal(draft.natal.place_text, 'Shanghai');
  assert.equal(draft.natal.iana_time_zone, 'Asia/Shanghai');
});

test('PersonEditor exposes an edit action for each existing person', () => {
  assert.match(personEditorSource, /void openEdit\(p\)/);
  assert.match(personEditorSource, /aria-label=\{copy\.people\.editPersonAria\(personListDisplayName\(p\)\)\}/);
  assert.match(personEditorSource, /\{copy\.common\.edit\}/);
});

test('PersonEditor masks relationship-person sensitive metadata until profile reveal succeeds', () => {
  assert.match(personEditorSource, /profileSensitiveAccess/);
  assert.match(personEditorSource, /personListDisplayName/);
  assert.match(personEditorSource, /personListMeta/);
  assert.match(personEditorSource, /copy\.self\.maskedValue/);
  assert.doesNotMatch(personEditorSource, /<strong>\{p\.display_name\}<\/strong>/);
  assert.doesNotMatch(personEditorSource, /\{p\.relation \? `\$\{p\.relation\} · ` : ''\}/);
  assert.match(personEditorSource, /profileSensitiveAccess\.revealSensitive/);
});

test('PersonEditor edit action is gated by the shared profile reveal', () => {
  assert.match(personEditorSource, /async function openEdit/);
  assert.match(personEditorSource, /const verified = await profileSensitiveAccess\.ensureSensitiveReveal\(\)/);
  assert.match(personEditorSource, /if \(!verified\) return;/);
});

test('PersonEditor delete confirmation is gated by the shared profile reveal', () => {
  assert.match(personEditorSource, /async function openDeleteConfirm/);
  assert.match(personEditorSource, /const verified = await profileSensitiveAccess\.ensureSensitiveReveal\(\)/);
  assert.match(personEditorSource, /void openDeleteConfirm\(p\)/);
  assert.doesNotMatch(personEditorSource, /onClick=\{\(\) => setConfirmingDelete\(p\)\}/);
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
