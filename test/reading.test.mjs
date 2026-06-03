// SJG-DATA-07 + SJG-DATA-09 + SJG-ASTRO-* + SJG-ALGO-* — Reading validator
// tests under the Mirror Architecture v1.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MIRROR_KINDS,
  MIRROR_KIND_SCOPE_MATRIX,
  MIRROR_SCOPE_KINDS,
} from '../src/domain/mirror-scope.ts';
import { validateReading } from '../src/contracts/reading-validator.ts';
import {
  consultationMirrorScope,
  dailyMirrorScope,
  longHorizonMirrorScope,
  rolling30DayMirrorScope,
  validInputsSummary,
  validNianjingOutput,
  validReading,
  validRijingOutput,
  validShijingOutput,
  validYuejingOutput,
} from './_fixtures.mjs';

test('mirror_kind/mirror_scope matrix covers all kinds and scopes', () => {
  for (const kind of MIRROR_KINDS) {
    for (const scope of MIRROR_SCOPE_KINDS) {
      const cell = MIRROR_KIND_SCOPE_MATRIX[kind][scope];
      assert.ok(cell === 'allowed' || cell === 'forbidden');
    }
  }
});

test('rijing/daily reading is valid', () => {
  const result = validateReading(validReading({ mirror_kind: 'rijing' }));
  assert.equal(result.ok, true, JSON.stringify(result));
});

test('yuejing/rolling_30_day reading is valid', () => {
  const result = validateReading(validReading({ mirror_kind: 'yuejing' }));
  assert.equal(result.ok, true, JSON.stringify(result));
});

test('nianjing/long_horizon reading is valid', () => {
  const result = validateReading(validReading({ mirror_kind: 'nianjing' }));
  assert.equal(result.ok, true, JSON.stringify(result));
});

test('shijing/consultation reading is valid', () => {
  const result = validateReading(validReading({ mirror_kind: 'shijing' }));
  assert.equal(result.ok, true, JSON.stringify(result));
});

test('rejects rijing/rolling_30_day pairing', () => {
  const scope = rolling30DayMirrorScope();
  const reading = validReading({
    mirror_kind: 'rijing',
    mirror_scope: scope,
    output: validRijingOutput(),
    inputs_summary: validInputsSummary({ mirrorKind: 'rijing', scope }),
  });
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'reading_mirror_kind_scope_forbidden');
  }
});

test('rejects primary_subject_ref that is not "self"', () => {
  const reading = validReading();
  const mutated = { ...reading, primary_subject_ref: { kind: 'person', id: 'p_01' } };
  const result = validateReading(mutated);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'reading_primary_subject_ref_must_be_self');
  }
});

test('rejects legacy Reading.kind field via owner-scoped removed-field guard', () => {
  const reading = { ...validReading(), kind: 'today' };
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'reading_removed_field_present');
    assert.equal(result.error.field, 'kind');
  }
});

test('rejects legacy Reading.view_id field via owner-scoped removed-field guard', () => {
  const reading = { ...validReading(), view_id: 'v_01' };
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'reading_removed_field_present');
    assert.equal(result.error.field, 'view_id');
  }
});

test('rejects legacy Reading.ad_hoc_context field', () => {
  const reading = { ...validReading(), ad_hoc_context: 'leak' };
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'reading_removed_field_present');
  }
});

test('rejects placeholder input_hash literal "unset"', () => {
  const reading = validReading();
  reading.inputs_summary = { ...reading.inputs_summary, input_hash: 'unset' };
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'reading_inputs_summary_input_hash_invalid');
  }
});

test('rejects mirror_context_snapshot whose mirror_scope diverges from reading.mirror_scope', () => {
  const reading = validReading({ mirror_kind: 'rijing' });
  const otherScope = dailyMirrorScope({ date: '2026-05-26' });
  reading.inputs_summary = {
    ...reading.inputs_summary,
    mirror_context_snapshot: {
      ...reading.inputs_summary.mirror_context_snapshot,
      mirror_scope: otherScope,
    },
  };
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(
      result.error.code,
      'reading_inputs_summary_mirror_context_mirror_scope_mismatch',
    );
  }
});

test('rejects non-shijing reading carrying cited_reading_ids', () => {
  const reading = validReading({ mirror_kind: 'rijing' });
  reading.cited_reading_ids = ['leak'];
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'reading_non_shijing_cited_reading_ids_must_be_empty');
  }
});

test('shijing reading requires cited_reading_ids to mirror mirror_scope.source_reading_ids', () => {
  const sourceIds = ['r_source_01', 'r_source_02'];
  const scope = consultationMirrorScope(sourceIds);
  const reading = validReading({
    mirror_kind: 'shijing',
    mirror_scope: scope,
    cited_reading_ids: ['mismatched'],
    output: validShijingOutput(sourceIds),
    inputs_summary: validInputsSummary({ mirrorKind: 'shijing', scope }),
  });
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(
      result.error.code,
      'reading_shijing_cited_reading_ids_must_match_scope_source_reading_ids',
    );
  }
});

test('rejects MirrorOutput missing common summary', () => {
  const reading = validReading();
  reading.output = { ...reading.output, summary: '' };
  const result = validateReading(reading);
  assert.equal(result.ok, false);
});

test('rejects MirrorOutput with forbidden luck_score field', () => {
  const reading = validReading();
  reading.output = { ...reading.output, luck_score: 50 };
  const result = validateReading(reading);
  assert.equal(result.ok, false);
});

test('rejects uncited memory influence (cited_event_memory_refs populated, output missing them)', () => {
  const reading = validReading();
  reading.cited_event_memory_refs = ['mem_01'];
  reading.output = { ...reading.output, cited_event_memory_refs: [] };
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'reading_output_uncited_memory_influence');
  }
});

test('rejects uncited plan influence', () => {
  const reading = validReading();
  reading.cited_plan_item_refs = ['plan_01'];
  reading.output = { ...reading.output, cited_plan_item_refs: [] };
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'reading_output_uncited_plan_influence');
  }
});

test('rejects related_person_refs that resolve to "self"', () => {
  const reading = validReading();
  reading.related_person_refs = ['self'];
  const result = validateReading(reading);
  assert.equal(result.ok, false);
});

test('rejects long_horizon scope shorter than min months', () => {
  const tooShort = longHorizonMirrorScope({ start_date: '2026-01-01', end_date: '2026-06-30' });
  const reading = validReading({
    mirror_kind: 'nianjing',
    mirror_scope: tooShort,
    output: validNianjingOutput(tooShort),
    inputs_summary: validInputsSummary({ mirrorKind: 'nianjing', scope: tooShort }),
  });
  const result = validateReading(reading);
  assert.equal(result.ok, false);
});

test('rejects yuejing scope with non-30-day length', () => {
  const wrong = rolling30DayMirrorScope({ start_date: '2026-05-25', end_date: '2026-06-22' });
  const reading = validReading({
    mirror_kind: 'yuejing',
    mirror_scope: wrong,
    output: validYuejingOutput(wrong),
    inputs_summary: validInputsSummary({ mirrorKind: 'yuejing', scope: wrong }),
  });
  const result = validateReading(reading);
  assert.equal(result.ok, false);
});

test('rejects consultation scope with empty source_reading_ids', () => {
  const scope = consultationMirrorScope([]);
  const reading = validReading({
    mirror_kind: 'shijing',
    mirror_scope: scope,
    cited_reading_ids: [],
    output: validShijingOutput(['r_source_01']),
    inputs_summary: validInputsSummary({ mirrorKind: 'shijing', scope }),
  });
  const result = validateReading(reading);
  assert.equal(result.ok, false);
});
