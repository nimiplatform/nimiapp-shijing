// SJG-DATA-08 + SJG-ASTRO-02 + SJG-ALGO-03 — MirrorScope validator tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateMirrorKindScope,
  validateMirrorScope,
} from '../src/contracts/mirror-scope-validator.ts';
import {
  consultationMirrorScope,
  dailyMirrorScope,
  longHorizonMirrorScope,
  rolling30DayMirrorScope,
} from './_fixtures.mjs';

test('valid daily scope passes', () => {
  assert.equal(validateMirrorScope(dailyMirrorScope()).ok, true);
});

test('rejects daily scope with invalid date', () => {
  const result = validateMirrorScope(dailyMirrorScope({ date: '2026-13-40' }));
  assert.equal(result.ok, false);
});

test('rejects daily scope with bad timezone', () => {
  const result = validateMirrorScope(dailyMirrorScope({ basis_time_zone: '+08:00' }));
  assert.equal(result.ok, false);
});

test('valid rolling_30_day scope passes', () => {
  assert.equal(validateMirrorScope(rolling30DayMirrorScope()).ok, true);
});

test('rolling_30_day scope must cover exactly 30 local days', () => {
  const scope = rolling30DayMirrorScope({ start_date: '2026-05-25', end_date: '2026-06-10' });
  const result = validateMirrorScope(scope);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'mirror_scope_rolling_30_day_length_invalid');
  }
});

test('valid long_horizon scope passes', () => {
  assert.equal(validateMirrorScope(longHorizonMirrorScope()).ok, true);
});

test('long_horizon scope rejects window shorter than min months', () => {
  const scope = longHorizonMirrorScope({ start_date: '2026-01-01', end_date: '2026-06-30' });
  const result = validateMirrorScope(scope);
  assert.equal(result.ok, false);
});

test('long_horizon scope rejects window longer than max years', () => {
  const scope = longHorizonMirrorScope({ start_date: '2026-01-01', end_date: '2037-12-31' });
  const result = validateMirrorScope(scope);
  assert.equal(result.ok, false);
});

test('long_horizon scope rejects reversed range', () => {
  const scope = longHorizonMirrorScope({ start_date: '2027-01-01', end_date: '2026-01-01' });
  const result = validateMirrorScope(scope);
  assert.equal(result.ok, false);
});

test('valid consultation scope passes', () => {
  assert.equal(validateMirrorScope(consultationMirrorScope(['r_01'])).ok, true);
});

test('consultation scope requires non-empty source_reading_ids', () => {
  const result = validateMirrorScope(consultationMirrorScope([]));
  assert.equal(result.ok, false);
});

test('consultation question_window may be present and bounded', () => {
  const scope = consultationMirrorScope(['r_01'], {
    question_window: { start_date: '2026-05-25', end_date: '2026-05-30' },
  });
  assert.equal(validateMirrorScope(scope).ok, true);
});

test('matrix evaluation: rijing/daily=allowed, rijing/consultation=forbidden', () => {
  assert.equal(evaluateMirrorKindScope('rijing', dailyMirrorScope()), 'allowed');
  assert.equal(
    evaluateMirrorKindScope('rijing', consultationMirrorScope(['r_01'])),
    'forbidden',
  );
});

test('matrix evaluation: yuejing/rolling_30_day=allowed only for yuejing', () => {
  assert.equal(evaluateMirrorKindScope('yuejing', rolling30DayMirrorScope()), 'allowed');
  assert.equal(evaluateMirrorKindScope('rijing', rolling30DayMirrorScope()), 'forbidden');
  assert.equal(evaluateMirrorKindScope('nianjing', rolling30DayMirrorScope()), 'forbidden');
});

test('matrix evaluation: nianjing/long_horizon=allowed', () => {
  assert.equal(evaluateMirrorKindScope('nianjing', longHorizonMirrorScope()), 'allowed');
});

test('matrix evaluation: shijing/consultation=allowed only for shijing', () => {
  assert.equal(
    evaluateMirrorKindScope('shijing', consultationMirrorScope(['r_01'])),
    'allowed',
  );
  assert.equal(
    evaluateMirrorKindScope('rijing', consultationMirrorScope(['r_01'])),
    'forbidden',
  );
});
