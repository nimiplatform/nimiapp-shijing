// W04 — product state reducer tests under Mirror Architecture v1.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ALL_TAB_IDS,
  createInitialState,
  shijingReducer,
} from '../src/product/state/shijing-state.ts';
import { buildEmptyShiJingSpace } from '../src/product/dev/initial-space.ts';
import { validShiJingSpace, validConcernTag } from './_fixtures.mjs';

test('initial state activates MingJing while startup intake is incomplete', () => {
  const state = createInitialState(buildEmptyShiJingSpace('u_startup'));
  assert.equal(state.active_tab, 'mingjing');
  assert.equal(state.snapshot_status.kind, 'valid');
});

test('initial state activates RiJing after startup intake is complete', () => {
  const state = createInitialState(validShiJingSpace({
    concern_tags: [validConcernTag('tag_career')],
  }));
  assert.equal(state.active_tab, 'rijing');
  assert.equal(state.snapshot_status.kind, 'valid');
});

test('startup snapshot/replace re-derives default tab while the user has not navigated', () => {
  const state = createInitialState(buildEmptyShiJingSpace('u_startup'));
  const completed = validShiJingSpace({
    concern_tags: [validConcernTag('tag_career')],
  });

  const next = shijingReducer(state, {
    type: 'snapshot/replace',
    snapshot: completed,
    default_tab_policy: 'derive',
  });

  assert.equal(next.active_tab, 'rijing');
});

test('local snapshot/replace keeps the current tab instead of forcing a default jump', () => {
  const state = createInitialState(buildEmptyShiJingSpace('u_startup'));
  const completed = validShiJingSpace({
    concern_tags: [validConcernTag('tag_career')],
  });

  const next = shijingReducer(state, { type: 'snapshot/replace', snapshot: completed });

  assert.equal(next.active_tab, 'mingjing');
});

test('startup snapshot/replace preserves an explicit user tab choice', () => {
  const state = shijingReducer(
    createInitialState(buildEmptyShiJingSpace('u_startup')),
    { type: 'tab/activate', tab: 'shijing' },
  );
  const completed = validShiJingSpace({
    concern_tags: [validConcernTag('tag_career')],
  });

  const next = shijingReducer(state, {
    type: 'snapshot/replace',
    snapshot: completed,
    default_tab_policy: 'derive',
  });

  assert.equal(next.active_tab, 'shijing');
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
