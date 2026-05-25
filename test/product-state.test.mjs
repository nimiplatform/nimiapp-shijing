// Wave-1 — Pure reducer + snapshot-validation tests for the renderer store.

import assert from 'node:assert/strict';
import test from 'node:test';

import { ALL_TAB_IDS, createInitialState, shijingReducer } from '../src/product/state/shijing-state.ts';
import { SHIJING_IA_TABS } from '../src/contracts/ia-contract.ts';
import { validShiJingSpace } from './_fixtures.mjs';

function validSnapshot(overrides = {}) {
  return validShiJingSpace(overrides);
}

test('initial state activates the first tab (今日)', () => {
  const state = createInitialState(validSnapshot());
  assert.equal(state.active_tab, 'today');
});

test('ALL_TAB_IDS mirrors SHIJING_IA_TABS ordering', () => {
  assert.deepEqual(ALL_TAB_IDS, SHIJING_IA_TABS.map((tab) => tab.id));
});

test('initial state validates the snapshot eagerly', () => {
  const state = createInitialState(validSnapshot());
  assert.equal(state.snapshot_status.kind, 'valid');
});

test('initial state surfaces validator failure as typed-error status', () => {
  const broken = validSnapshot();
  broken.profiles = [];
  const state = createInitialState(broken);
  assert.equal(state.snapshot_status.kind, 'invalid');
  if (state.snapshot_status.kind === 'invalid') {
    assert.equal(state.snapshot_status.error.code, 'space_removed_field_present');
  }
});

test('tab/activate transitions to a different admitted tab', () => {
  const state = createInitialState(validSnapshot());
  const next = shijingReducer(state, { type: 'tab/activate', tab: 'consultation' });
  assert.equal(next.active_tab, 'consultation');
  assert.notEqual(next, state);
});

test('tab/activate is a no-op for the active tab', () => {
  const state = createInitialState(validSnapshot());
  const next = shijingReducer(state, { type: 'tab/activate', tab: 'today' });
  assert.equal(next, state);
});

test('tab/activate ignores unknown tab ids', () => {
  const state = createInitialState(validSnapshot());
  const next = shijingReducer(state, { type: 'tab/activate', tab: 'history' });
  assert.equal(next, state);
});

test('observation/set switches observation target without touching active tab', () => {
  const state = createInitialState(validSnapshot());
  const next = shijingReducer(state, { type: 'observation/set', target: { kind: 'person', id: 'p_01' } });
  assert.deepEqual(next.observation_target, { kind: 'person', id: 'p_01' });
  assert.equal(next.active_tab, state.active_tab);
});

test('observation/set is a no-op when target equals current', () => {
  const state = createInitialState(validSnapshot());
  const next = shijingReducer(state, { type: 'observation/set', target: 'self' });
  assert.equal(next, state);
});

test('snapshot/replace revalidates eagerly and switches status to invalid', () => {
  const state = createInitialState(validSnapshot());
  const broken = validSnapshot();
  broken.settings.global_instructions = '';
  const next = shijingReducer(state, { type: 'snapshot/replace', snapshot: broken });
  assert.equal(next.snapshot_status.kind, 'invalid');
});

test('snapshot/replace recovers to valid status', () => {
  const broken = validSnapshot();
  broken.profiles = [];
  const state = createInitialState(broken);
  assert.equal(state.snapshot_status.kind, 'invalid');
  const next = shijingReducer(state, { type: 'snapshot/replace', snapshot: validSnapshot() });
  assert.equal(next.snapshot_status.kind, 'valid');
});
