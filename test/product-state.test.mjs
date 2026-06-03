// W04 — product state reducer tests under Mirror Architecture v1.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ALL_TAB_IDS,
  createInitialState,
  shijingReducer,
} from '../src/product/state/shijing-state.ts';
import { validShiJingSpace, validConcernTag } from './_fixtures.mjs';

test('initial state activates the rijing tab', () => {
  const state = createInitialState(validShiJingSpace());
  assert.equal(state.active_tab, 'rijing');
  assert.equal(state.snapshot_status.kind, 'valid');
});

test('tab/activate switches to admitted tab ids', () => {
  const state = createInitialState(validShiJingSpace());
  for (const tab of ALL_TAB_IDS) {
    const next = shijingReducer(state, { type: 'tab/activate', tab });
    assert.equal(next.active_tab, tab);
  }
});

test('tab/activate ignores unknown tab id', () => {
  const state = createInitialState(validShiJingSpace());
  const next = shijingReducer(state, { type: 'tab/activate', tab: 'today' });
  assert.equal(next, state);
});

test('snapshot/replace surfaces invalid snapshot as snapshot_status.invalid', () => {
  const state = createInitialState(validShiJingSpace());
  const broken = validShiJingSpace();
  broken.views = []; // removed surface
  const next = shijingReducer(state, { type: 'snapshot/replace', snapshot: broken });
  assert.equal(next.snapshot_status.kind, 'invalid');
});

test('snapshot/replace accepts valid snapshot containing concern tags', () => {
  const state = createInitialState(validShiJingSpace());
  const snapshot = validShiJingSpace({ concern_tags: [validConcernTag('tag_love')] });
  const next = shijingReducer(state, { type: 'snapshot/replace', snapshot });
  assert.equal(next.snapshot_status.kind, 'valid');
  assert.equal(next.snapshot.concern_tags.length, 1);
});
