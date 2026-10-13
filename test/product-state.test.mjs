// W04 — product state reducer tests under Mirror Architecture v1.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ALL_TAB_IDS,
  createInitialState,
  shijingReducer,
} from '../src/product/state/shijing-state.ts';
import { buildEmptyShiJingSpace } from '../src/product/dev/initial-space.ts';
import { createShijingNavigation } from '../src/product/navigation/destinations.ts';
import { validShiJingSpace, validConcernTag } from './_fixtures.mjs';

test('business snapshots contain no writable primary position and do not change navigation', async () => {
  const navigation = createShijingNavigation();
  await navigation.push({ id: 'shijing', conversationId: 'actual-reference' });
  const current = navigation.getSnapshot().current;
  const state = createInitialState(buildEmptyShiJingSpace('u_startup'));
  const next = shijingReducer(state, { type: 'snapshot/replace', snapshot: validShiJingSpace({ concern_tags: [validConcernTag('tag_career')] }) });
  assert.equal('active_tab' in next, false);
  assert.equal('active_tab_selection' in next, false);
  assert.equal(next.snapshot_status.kind, 'valid');
  assert.equal(navigation.getSnapshot().current, current);
  navigation.dispose();
});

test('six canonical destinations, dates, settings and explicit unavailable conversation refs share one history', async () => {
  const navigation = createShijingNavigation();
  for (const id of ALL_TAB_IDS) assert.equal((await navigation.push({ id })).status === 'invalid', false);
  await navigation.push({ id: 'yuejing', date: '2026-10-13' });
  await navigation.push({ id: 'shijing', conversationId: 'not-currently-retained' });
  await navigation.push({ id: 'settings', page: 'settings', focusTarget: 'method_profile' });
  await navigation.back(); assert.equal(navigation.getSnapshot().current.destination.conversationId, 'not-currently-retained');
  await navigation.back(); assert.equal(navigation.getSnapshot().current.destination.date, '2026-10-13');
  await navigation.forward(); assert.equal(navigation.getSnapshot().current.destination.id, 'shijing');
  const entry = navigation.getSnapshot().current;
  for (const invalid of [{ id: 'today' }, { id: 'yuejing', date: '2026-02-30' }, { id: 'shijing', conversationId: 'record', newQuestion: true }, { id: 'settings', page: 'profile', focusTarget: 'method_profile' }, { id: 'shijing', transcript: ['business data'] }]) {
    assert.equal((await navigation.push(invalid)).status, 'invalid'); assert.equal(navigation.getSnapshot().current, entry);
  }
  navigation.reset({ id: 'mingjing' }); assert.equal(navigation.getSnapshot().canGoBack, false);
  navigation.dispose();
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
