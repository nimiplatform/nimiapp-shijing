// SJG-DATA-06 — View validator tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import { validateView } from '../src/contracts/view-validator.ts';

function baseView(overrides) {
  return {
    id: 'v_01',
    title: 'Test view',
    anchor_subject: 'self',
    subjects: ['self'],
    time_scope: 'open_ended',
    context_items: [],
    instructions: '',
    view_memory: { summary: '', updated_at: '2026-05-25T00:00:00Z', locked: false },
    display_state: 'normal',
    ...overrides,
  };
}

test('valid open_ended view passes', () => {
  const result = validateView(baseView());
  assert.equal(result.ok, true);
});

test('empty subjects[] is rejected', () => {
  const result = validateView(baseView({ subjects: [] }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'view_subjects_empty');
});

test('anchor not in subjects is rejected', () => {
  const result = validateView(
    baseView({
      anchor_subject: { kind: 'person', id: 'p_missing' },
      subjects: ['self'],
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'view_anchor_not_in_subjects');
});

test('anchor membership uses value equality across shapes', () => {
  const result = validateView(
    baseView({
      anchor_subject: { kind: 'person', id: 'p_01' },
      subjects: [{ kind: 'person', id: 'p_01' }, 'self'],
    }),
  );
  assert.equal(result.ok, true);
});

test('invalid time_scope is rejected', () => {
  const result = validateView(baseView({ time_scope: 'historical' }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'view_time_scope_invalid');
});

test('bounded scope requires bounded_range', () => {
  const result = validateView(baseView({ time_scope: 'bounded' }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'view_bounded_range_missing_for_bounded_scope');
});

test('bounded_range with start after end is rejected', () => {
  const result = validateView(
    baseView({
      time_scope: 'bounded',
      bounded_range: { start: '2026-05-25T00:00:00Z', end: '2026-05-20T00:00:00Z' },
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'view_bounded_range_start_after_end');
});

test('bounded_range endpoints must be ISO-8601 UTC instants with Z', () => {
  const result = validateView(
    baseView({
      time_scope: 'bounded',
      bounded_range: { start: '2026-05-25T00:00:00+08:00', end: '2026-05-26T00:00:00Z' },
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'view_bounded_range_endpoint_not_iso_utc');
    assert.equal(result.error.field, 'start');
  }
});

test('bounded_range endpoints must be finite real calendar instants', () => {
  const result = validateView(
    baseView({
      time_scope: 'bounded',
      bounded_range: { start: '2026-02-31T00:00:00Z', end: '2026-03-02T00:00:00Z' },
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'view_bounded_range_endpoint_not_iso_utc');
    assert.equal(result.error.field, 'start');
  }
});

test('bounded_range allows equal start and end per View contract', () => {
  const result = validateView(
    baseView({
      time_scope: 'bounded',
      bounded_range: { start: '2026-05-25T00:00:00Z', end: '2026-05-25T00:00:00Z' },
    }),
  );
  assert.equal(result.ok, true);
});

test('rolling scope requires rolling_window_days', () => {
  const result = validateView(baseView({ time_scope: 'rolling' }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'view_rolling_window_missing_for_rolling_scope');
});

test('rolling scope rejects non-positive window', () => {
  const result = validateView(baseView({ time_scope: 'rolling', rolling_window_days: 0 }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'view_rolling_window_not_positive_integer');
});

test('rolling scope rejects fractional window', () => {
  const result = validateView(baseView({ time_scope: 'rolling', rolling_window_days: 1.5 }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'view_rolling_window_not_positive_integer');
});

test('open_ended scope rejects bounded_range', () => {
  const result = validateView(
    baseView({ bounded_range: { start: '2026-05-25T00:00:00Z', end: '2026-05-26T00:00:00Z' } }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'view_bounded_range_present_for_non_bounded_scope');
});

test('open_ended scope rejects rolling_window_days', () => {
  const result = validateView(baseView({ rolling_window_days: 30 }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'view_rolling_window_present_for_non_rolling_scope');
});

test('invalid display_state is rejected', () => {
  const result = validateView(baseView({ display_state: 'hidden' }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'view_display_state_invalid');
});

test('context item created_at is required and must be ISO-8601 UTC', () => {
  const result = validateView(
    baseView({
      context_items: [{ id: 'ctx_01', kind: 'note', body: 'x', created_at: '2026-05-25T00:00:00+08:00' }],
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'view_context_item_created_at_not_iso_utc');
});

test('context item body must be non-empty', () => {
  const result = validateView(
    baseView({
      context_items: [{ id: 'ctx_01', kind: 'note', body: '', created_at: '2026-05-25T00:00:00Z' }],
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'view_context_item_body_empty');
});
