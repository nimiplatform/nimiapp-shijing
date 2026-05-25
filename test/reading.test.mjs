// SJG-DATA-07 + SJG-ASTRO-03 + SJG-ASTRO-04 + SJG-ASTRO-07 + SJG-ASTRO-08 +
// SJG-ALGO-03 + SJG-ALGO-08 — Reading validator tests plus
// matrix-source-of-truth + algorithm-v1 InputsSummary mirror coverage.

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { READING_KIND_SCOPE_MATRIX, READING_KINDS, READING_SCOPES } from '../src/domain/reading-matrix.ts';
import { validateReading, evaluateReadingKindScope } from '../src/contracts/reading-validator.ts';
import {
  natalTimeWindow,
  validFeatureSnapshot,
  validInputsSummary,
  validReading,
  validTimeWindow,
} from './_fixtures.mjs';

test('today/subject with self anchor is allowed', () => {
  const result = validateReading(validReading());
  assert.equal(result.ok, true);
});

test('today/view is forbidden', () => {
  const result = validateReading(validReading({ kind: 'today', scope: 'view', view_id: 'v_01' }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'reading_kind_scope_forbidden');
});

test('today/ad_hoc is forbidden', () => {
  const result = validateReading(validReading({ kind: 'today', scope: 'ad_hoc' }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'reading_kind_scope_forbidden');
});

test('key_window/subject is forbidden', () => {
  const result = validateReading(validReading({ kind: 'key_window', scope: 'subject' }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'reading_kind_scope_forbidden');
});

test('key_window/view is allowed', () => {
  const result = validateReading(validReading({ kind: 'key_window', scope: 'view', view_id: 'v_01' }));
  assert.equal(result.ok, true);
});

test('sign requires self-only and natal time_window', () => {
  const allowed = validateReading(validReading({ kind: 'sign', scope: 'subject' }));
  assert.equal(allowed.ok, true);
  const forbidden = validateReading(
    validReading({
      kind: 'sign',
      scope: 'subject',
      anchor_subject: { kind: 'person', id: 'p_01' },
      subjects: [{ kind: 'person', id: 'p_01' }],
    }),
  );
  assert.equal(forbidden.ok, false);
  if (!forbidden.ok) assert.equal(forbidden.error.code, 'reading_sign_must_be_self_only');
});

test('sign/view is forbidden', () => {
  const result = validateReading(validReading({ kind: 'sign', scope: 'view', view_id: 'v_01' }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'reading_kind_scope_forbidden');
});

test('view scope requires view_id', () => {
  const reading = validReading({ kind: 'period_outlook', scope: 'view', view_id: 'v_01' });
  reading.view_id = undefined;
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'reading_view_scope_requires_view_id');
});

test('non-view scope must omit view_id', () => {
  const reading = validReading({ kind: 'period_outlook', scope: 'subject' });
  reading.view_id = 'v_01';
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'reading_non_view_scope_must_omit_view_id');
});

test('subjects empty is rejected', () => {
  const result = validateReading(validReading({ subjects: [] }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'reading_subjects_empty');
});

test('anchor not in subjects is rejected', () => {
  const result = validateReading(
    validReading({
      kind: 'consultation',
      scope: 'subject',
      anchor_subject: { kind: 'person', id: 'p_99' },
      subjects: ['self'],
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'reading_anchor_not_in_subjects');
});

test('today must be single-subject and anchor matches', () => {
  const result = validateReading(
    validReading({ subjects: ['self', { kind: 'person', id: 'p_01' }] }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'reading_today_must_be_single_subject_and_anchor');
});

test('output.summary empty is rejected', () => {
  const result = validateReading(
    validReading({ output: { summary: '   ', highlights: [], recommendations: [], citations: [] } }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'reading_output_summary_empty');
});

test('highlight subject_ref not in subjects is rejected', () => {
  const result = validateReading(
    validReading({
      output: {
        summary: 'x',
        highlights: [{ label: 'h1', body: 'b', subject_ref: { kind: 'person', id: 'p_ghost' } }],
        recommendations: [],
        citations: [],
      },
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'reading_highlight_subject_ref_not_in_subjects');
    assert.equal(result.error.index, 0);
  }
});

test('recommendation subject_ref not in subjects is rejected', () => {
  const result = validateReading(
    validReading({
      output: {
        summary: 'x',
        highlights: [],
        recommendations: [{ body: 'r', subject_ref: { kind: 'person', id: 'p_ghost' }, horizon: 'today' }],
        citations: [],
      },
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'reading_recommendation_subject_ref_not_in_subjects');
    assert.equal(result.error.index, 0);
  }
});

test('sign Reading must use natal time_window', () => {
  const reading = validReading({ kind: 'sign', scope: 'subject' });
  reading.time_window = validTimeWindow();
  reading.inputs_summary.time_window = reading.time_window;
  reading.inputs_summary.feature_snapshot.time_window = reading.time_window;
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'reading_time_window_sign_must_be_natal');
});

test('non-sign Reading must use bounded time_window', () => {
  const reading = validReading({ kind: 'today' });
  reading.time_window = natalTimeWindow();
  reading.inputs_summary.time_window = reading.time_window;
  reading.inputs_summary.feature_snapshot.time_window = reading.time_window;
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'reading_time_window_non_sign_must_be_bounded');
});

test('bounded time_window without endpoints is rejected', () => {
  const reading = validReading({ kind: 'today' });
  reading.time_window = { ...reading.time_window, start_utc: undefined };
  reading.inputs_summary.time_window = reading.time_window;
  reading.inputs_summary.feature_snapshot.time_window = reading.time_window;
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'reading_time_window_bounded_missing_endpoints');
});

test('bounded time_window with start>=end is rejected', () => {
  const reading = validReading({ kind: 'today' });
  reading.time_window = {
    ...reading.time_window,
    start_utc: '2026-05-26T00:00:00Z',
    end_utc: '2026-05-25T00:00:00Z',
  };
  reading.inputs_summary.time_window = reading.time_window;
  reading.inputs_summary.feature_snapshot.time_window = reading.time_window;
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'reading_time_window_bounded_start_not_before_end');
});

test('natal time_window carrying endpoints is rejected', () => {
  const reading = validReading({ kind: 'sign', scope: 'subject' });
  reading.time_window = {
    ...natalTimeWindow(),
    start_utc: '2026-05-25T00:00:00Z',
    end_utc: '2026-05-26T00:00:00Z',
  };
  reading.inputs_summary.time_window = reading.time_window;
  reading.inputs_summary.feature_snapshot.time_window = reading.time_window;
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'reading_time_window_natal_must_not_carry_endpoints');
});

test('InputsSummary.contract_version mismatch is rejected', () => {
  const reading = validReading();
  reading.inputs_summary = { ...reading.inputs_summary, contract_version: 'SJG-ASTRO-v0' };
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'reading_inputs_summary_contract_version_mismatch');
});

test('InputsSummary.algorithm_contract_version mismatch is rejected', () => {
  const reading = validReading();
  reading.inputs_summary = { ...reading.inputs_summary, algorithm_contract_version: 'SJG-ALGO-v0' };
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'reading_inputs_summary_algorithm_contract_version_mismatch');
});

test('InputsSummary.method_profile.id mismatch is rejected', () => {
  const reading = validReading();
  reading.inputs_summary.method_profile = { ...reading.inputs_summary.method_profile, id: 'ziwei_v1' };
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'reading_inputs_summary_method_profile_id_mismatch');
});

test('InputsSummary.time_window must equal Reading.time_window', () => {
  const reading = validReading();
  reading.inputs_summary.time_window = { ...reading.inputs_summary.time_window, basis_time_zone: 'UTC/Other' };
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'reading_inputs_summary_time_window_mismatch');
});

test('feature_snapshot.method_profile.id mismatch is rejected', () => {
  const reading = validReading();
  reading.inputs_summary.feature_snapshot = {
    ...reading.inputs_summary.feature_snapshot,
    method_profile: { ...reading.inputs_summary.feature_snapshot.method_profile, id: 'ziwei_v1' },
  };
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'reading_inputs_summary_feature_snapshot_method_profile_mismatch');
});

test('feature_snapshot.time_window must equal Reading.time_window', () => {
  const reading = validReading();
  reading.inputs_summary.feature_snapshot = {
    ...reading.inputs_summary.feature_snapshot,
    time_window: { ...reading.time_window, basis_time_zone: 'Etc/Greenwich' },
  };
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'reading_inputs_summary_feature_snapshot_time_window_mismatch');
});

test('view scope requires view_snapshot in inputs_summary', () => {
  const reading = validReading({ kind: 'period_outlook', scope: 'view', view_id: 'v_01' });
  reading.inputs_summary = { ...reading.inputs_summary };
  delete reading.inputs_summary.view_snapshot;
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'reading_inputs_summary_view_snapshot_required_for_view_scope');
});

test('view scope requires view_snapshot hashes', () => {
  const reading = validReading({ kind: 'period_outlook', scope: 'view', view_id: 'v_01' });
  reading.inputs_summary.view_snapshot = {
    ...reading.inputs_summary.view_snapshot,
    instructions_hash: '',
  };
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'reading_inputs_summary_view_snapshot_hash_missing');
    assert.equal(result.error.field, 'instructions_hash');
  }
});

test('non-view scope forbids view_snapshot', () => {
  const reading = validReading();
  reading.inputs_summary.view_snapshot = {
    view_id: 'v_99',
    anchor_subject: 'self',
    subjects: ['self'],
    time_scope: 'rolling',
    instructions_hash: 'x',
    context_items_hash: 'x',
    memory_summary_hash: 'x',
    memory_locked: false,
  };
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'reading_inputs_summary_view_snapshot_forbidden_for_non_view_scope');
});

test('view scope requires view_snapshot.view_id to match reading.view_id', () => {
  const reading = validReading({ kind: 'period_outlook', scope: 'view', view_id: 'v_01' });
  reading.inputs_summary.view_snapshot = { ...reading.inputs_summary.view_snapshot, view_id: 'v_02' };
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'reading_inputs_summary_view_snapshot_view_id_mismatch');
});

test('ad_hoc scope requires ad_hoc_context', () => {
  const reading = validReading({ kind: 'period_outlook', scope: 'ad_hoc' });
  delete reading.inputs_summary.ad_hoc_context;
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'reading_inputs_summary_ad_hoc_context_required_for_ad_hoc_scope');
});

test('non-ad_hoc scope forbids ad_hoc_context', () => {
  const reading = validReading({ kind: 'period_outlook', scope: 'subject' });
  reading.inputs_summary.ad_hoc_context = 'ghost';
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'reading_inputs_summary_ad_hoc_context_forbidden_for_non_ad_hoc_scope');
});

test('matrix-source-of-truth: every kind x scope cell evaluates', () => {
  for (const kind of READING_KINDS) {
    for (const scope of READING_SCOPES) {
      const cell = evaluateReadingKindScope(kind, scope);
      assert.ok(
        cell === 'allowed' || cell === 'forbidden' || cell === 'self_only',
        `matrix cell ${kind}/${scope} not in known enum: ${cell}`,
      );
    }
  }
});

test('matrix mirrors yaml spec table', () => {
  const yamlPath = new URL('../.nimi/spec/shijing/kernel/tables/reading-kind-scope-matrix.yaml', import.meta.url);
  const yamlText = readFileSync(yamlPath, 'utf8');
  const lines = yamlText.replaceAll('\r\n', '\n').split('\n');
  for (const kind of READING_KINDS) {
    const headerIndex = lines.findIndex((line) => line === `  ${kind}:`);
    assert.ok(headerIndex >= 0, `yaml missing kind block: ${kind}`);
    const cellLines = [];
    for (let i = headerIndex + 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (line.startsWith('    ')) {
        cellLines.push(line.trim());
      } else {
        break;
      }
    }
    for (const scope of READING_SCOPES) {
      const expected = READING_KIND_SCOPE_MATRIX[kind][scope];
      const expectedLine = `${scope}: ${expected}`;
      assert.ok(
        cellLines.includes(expectedLine),
        `yaml matrix mismatch for ${kind}/${scope}: expected "${expectedLine}" in cells ${JSON.stringify(cellLines)}`,
      );
    }
  }
});

test('validFeatureSnapshot helper carries v1 method_profile and time_window', () => {
  const snap = validFeatureSnapshot();
  assert.equal(snap.method_profile.id, 'bazi_ganzhi_jieqi_dayun_v1');
  assert.equal(snap.method_profile.contract_version, 'SJG-ALGO-v1');
});

test('validInputsSummary carries algorithm-v1 envelope', () => {
  const summary = validInputsSummary();
  assert.equal(summary.contract_version, 'SJG-ASTRO-v1');
  assert.equal(summary.algorithm_contract_version, 'SJG-ALGO-v1');
  assert.equal(summary.method_profile.id, 'bazi_ganzhi_jieqi_dayun_v1');
});
