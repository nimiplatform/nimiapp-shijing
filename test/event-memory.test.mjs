// SJG-DATA-05 — EventMemory validator tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  validateEventMemory,
  validateEventMemoryCollection,
} from '../src/contracts/event-memory-validator.ts';
import { validEventMemory } from './_fixtures.mjs';

test('valid event memory is accepted', () => {
  assert.equal(validateEventMemory(validEventMemory()).ok, true);
});

test('rejects invalid source', () => {
  const result = validateEventMemory(validEventMemory('m', { source: 'whatever' }));
  assert.equal(result.ok, false);
});

test('rejects invalid admissible_use', () => {
  const result = validateEventMemory(validEventMemory('m', { admissible_use: 'always' }));
  assert.equal(result.ok, false);
});

test('rejects forbidden view_refs field', () => {
  const memory = { ...validEventMemory('m'), view_refs: [] };
  const result = validateEventMemory(memory);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'event_memory_forbidden_field_present');
  }
});

test('rejects forbidden recap field', () => {
  const memory = { ...validEventMemory('m'), recap: 'leak' };
  const result = validateEventMemory(memory);
  assert.equal(result.ok, false);
});

test('rejects forbidden task/deadline/priority fields', () => {
  for (const field of ['task_status', 'due', 'overdue', 'priority', 'progress', 'deadline']) {
    const memory = { ...validEventMemory('m'), [field]: 'leak' };
    const result = validateEventMemory(memory);
    assert.equal(result.ok, false, `${field} should be forbidden`);
  }
});

test('collection rejects duplicate ids', () => {
  const result = validateEventMemoryCollection([validEventMemory('m1'), validEventMemory('m1')]);
  assert.equal(result.ok, false);
});

test('accepts memory with concern tag refs and person refs', () => {
  const memory = validEventMemory('m1', {
    concern_tag_refs: ['tag_love'],
    person_refs: [{ kind: 'person', id: 'p_01' }],
  });
  assert.equal(validateEventMemory(memory).ok, true);
});
