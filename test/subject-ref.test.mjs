// SJG-DATA-01 — SubjectRef validator tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isPersonRef,
  isSelfRef,
  subjectRefEquals,
  subjectRefKey,
} from '../src/domain/subject-ref.ts';
import { validateSubjectRef } from '../src/contracts/subject-ref-validator.ts';

test('valid self ref is accepted', () => {
  const result = validateSubjectRef('self');
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(isSelfRef(result.ref), true);
  }
});

test('valid person ref is accepted', () => {
  const result = validateSubjectRef({ kind: 'person', id: 'p_01' });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(isPersonRef(result.ref), true);
  }
});

test('null is rejected', () => {
  const result = validateSubjectRef(null);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'subject_ref_null_or_undefined');
});

test('arbitrary string is rejected (not "self")', () => {
  const result = validateSubjectRef('selff');
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'subject_ref_invalid_self_string');
});

test('kind other than "person" is rejected', () => {
  const result = validateSubjectRef({ kind: 'profile', id: 'p_01' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'subject_ref_invalid_kind');
});

test('empty person id is rejected', () => {
  const result = validateSubjectRef({ kind: 'person', id: '' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'subject_ref_invalid_person_id');
});

test('extra property on person ref is rejected', () => {
  const result = validateSubjectRef({ kind: 'person', id: 'p_01', display_name: 'A' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'subject_ref_extra_property');
});

test('subjectRefEquals handles both shapes', () => {
  assert.equal(subjectRefEquals('self', 'self'), true);
  assert.equal(subjectRefEquals({ kind: 'person', id: 'p_01' }, { kind: 'person', id: 'p_01' }), true);
  assert.equal(subjectRefEquals('self', { kind: 'person', id: 'p_01' }), false);
  assert.equal(subjectRefEquals({ kind: 'person', id: 'p_01' }, { kind: 'person', id: 'p_02' }), false);
});

test('subjectRefKey produces stable strings', () => {
  assert.equal(subjectRefKey('self'), 'self');
  assert.equal(subjectRefKey({ kind: 'person', id: 'p_01' }), 'person:p_01');
});
