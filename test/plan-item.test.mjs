// SJG-DATA-06 — PlanItem validator tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  validatePlanItem,
  validatePlanItemCollection,
} from '../src/contracts/plan-item-validator.ts';
import { validPlanItem } from './_fixtures.mjs';

test('valid plan item is accepted', () => {
  assert.equal(validatePlanItem(validPlanItem()).ok, true);
});

test('rejects invalid source', () => {
  const result = validatePlanItem(validPlanItem('p', { source: 'rijing' }));
  assert.equal(result.ok, false);
});

test('rejects task/project/workflow fields', () => {
  for (const field of [
    'status',
    'task_status',
    'due',
    'overdue',
    'deadline',
    'priority',
    'dependency',
    'dependencies',
    'progress',
    'assignee',
    'board',
    'milestone',
    'gantt',
    'workflow',
    'project',
    'task',
  ]) {
    const plan = { ...validPlanItem('p'), [field]: 'leak' };
    const result = validatePlanItem(plan);
    assert.equal(result.ok, false, `${field} should be forbidden on PlanItem`);
  }
});

test('rejects empty body', () => {
  const result = validatePlanItem(validPlanItem('p', { body: '' }));
  assert.equal(result.ok, false);
});

test('collection rejects duplicate ids', () => {
  const result = validatePlanItemCollection([validPlanItem('p1'), validPlanItem('p1')]);
  assert.equal(result.ok, false);
});
