// W-c03 — Settings > Plans editor state tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import { deletePlanItem, upsertPlanItem } from '../src/product/plans/plan-editor-state.ts';
import { validConcernTag, validPlanItem, validShiJingSpace } from './_fixtures.mjs';

test('upsertPlanItem appends a valid plan', () => {
  const r = upsertPlanItem(validShiJingSpace(), validPlanItem('p1'));
  assert.equal(r.ok, true);
});

test('upsertPlanItem rejects task-management vocabulary', () => {
  const bad = { ...validPlanItem('p1'), status: 'in_progress' };
  const r = upsertPlanItem(validShiJingSpace(), bad);
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error.code, 'plan_invalid');
});

test('upsertPlanItem rejects unresolvable concern_tag_ref', () => {
  const r = upsertPlanItem(
    validShiJingSpace(),
    validPlanItem('p1', { concern_tag_refs: ['tag_missing'] }),
  );
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error.code, 'plan_concern_tag_ref_unresolvable');
});

test('upsertPlanItem accepts resolvable refs', () => {
  const space = validShiJingSpace({ concern_tags: [validConcernTag('tag_love')] });
  const r = upsertPlanItem(space, validPlanItem('p1', { concern_tag_refs: ['tag_love'] }));
  assert.equal(r.ok, true);
});

test('deletePlanItem removes plan and rejects unknown id', () => {
  const space = validShiJingSpace({ plan_items: [validPlanItem('p1')] });
  const ok = deletePlanItem(space, 'p1');
  assert.equal(ok.ok, true);
  const missing = deletePlanItem(space, 'pz');
  assert.equal(missing.ok, false);
});
