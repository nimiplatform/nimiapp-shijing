// SJG-DATA-05 — Event validator tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import { validateEvent } from '../src/contracts/event-validator.ts';

function baseEvent(overrides = {}) {
  return {
    id: 'e_01',
    primary_subject: 'self',
    participants: [],
    occurred_at: '2026-05-25T00:00:00Z',
    title: 'sample',
    view_refs: [],
    ...overrides,
  };
}

test('empty participants is allowed', () => {
  assert.equal(validateEvent(baseEvent()).ok, true);
});

test('participants including primary_subject (self) is rejected', () => {
  const result = validateEvent(baseEvent({ participants: ['self'] }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'event_participants_include_primary_subject');
});

test('participants including primary_subject (person) is rejected', () => {
  const result = validateEvent(
    baseEvent({
      primary_subject: { kind: 'person', id: 'p_01' },
      participants: [{ kind: 'person', id: 'p_01' }],
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'event_participants_include_primary_subject');
});

test('duplicate participants are rejected', () => {
  const result = validateEvent(
    baseEvent({
      participants: [{ kind: 'person', id: 'p_01' }, { kind: 'person', id: 'p_01' }],
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'event_participants_duplicate');
});

test('participants mix of self + persons (distinct from primary) is allowed', () => {
  const result = validateEvent(
    baseEvent({
      primary_subject: { kind: 'person', id: 'p_01' },
      participants: ['self', { kind: 'person', id: 'p_02' }],
    }),
  );
  assert.equal(result.ok, true);
});
