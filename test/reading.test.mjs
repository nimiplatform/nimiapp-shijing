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
  latestReadingByMirrorKind,
  yuejingReadingStartsOn,
} from '../src/product/reading/reading-selectors.ts';
import {
  consultationMirrorScope,
  dailyMirrorScope,
  longHorizonMirrorScope,
  relationshipNatalMirrorScope,
  rolling30DayMirrorScope,
  validInputsSummary,
  validMingjingOutput,
  validMingjingRelationshipOutput,
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

// Audit P1 (Codex) — a persisted Reading whose feature_snapshot and recorded
// feature_snapshot_hash disagree (tampering/corruption) must fail closed.
// Previously validateReading only checked the hash was a non-empty string.
test('SJG-ALGO-11/12 (audit): tampered feature_snapshot fails closed (hash drift)', () => {
  const summary = validInputsSummary({ mirrorKind: 'rijing' });
  const ev = summary.feature_snapshot.method_evidence;
  const tampered = {
    ...summary,
    feature_snapshot: {
      ...summary.feature_snapshot,
      method_evidence: {
        ...ev,
        bazi: {
          ...ev.bazi,
          self_subject: {
            ...ev.bazi.self_subject,
            natal_chart: { ...ev.bazi.self_subject.natal_chart, canonicalization_hash: 'sha256:TAMPERED' },
          },
        },
      },
    },
  };
  const result = validateReading(validReading({ mirror_kind: 'rijing', inputs_summary: tampered }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'reading_inputs_summary_feature_snapshot_hash_mismatch');
});

test('SJG-ALGO-11/12 (audit): tampered feature_snapshot_hash fails closed', () => {
  const summary = validInputsSummary({ mirrorKind: 'rijing' });
  const reading = validReading({
    mirror_kind: 'rijing',
    inputs_summary: { ...summary, feature_snapshot_hash: 'sha256:wrong-hash' },
  });
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, 'reading_inputs_summary_feature_snapshot_hash_mismatch');
});

test('yuejingReadingStartsOn keys regeneration to the rolling window start date', () => {
  const scope = rolling30DayMirrorScope({
    start_date: '2026-05-25',
    end_date: '2026-06-23',
  });
  const reading = validReading({
    mirror_kind: 'yuejing',
    mirror_scope: scope,
    output: validYuejingOutput(scope),
    inputs_summary: validInputsSummary({ mirrorKind: 'yuejing', scope }),
  });
  assert.equal(yuejingReadingStartsOn(reading, '2026-05-25'), true);
  assert.equal(yuejingReadingStartsOn(reading, '2026-05-26'), false);
});

test('rejects yuejing cells outside the scope start date', () => {
  const scope = rolling30DayMirrorScope({
    start_date: '2026-05-25',
    end_date: '2026-06-23',
  });
  const reading = validReading({
    mirror_kind: 'yuejing',
    mirror_scope: scope,
    output: validYuejingOutput(scope, {
      cells: [
        {
          date: '2026-05-26',
          concern_tag_ref: 'tag_love',
          tendency_class: 'steady',
          summary: 'Wrong date.',
        },
      ],
    }),
    inputs_summary: validInputsSummary({ mirrorKind: 'yuejing', scope }),
  });
  const result = validateReading(reading);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'reading_yuejing_cell_date_must_match_scope_start_date');
  }
});

test('nianjing/long_horizon reading is valid', () => {
  const result = validateReading(validReading({ mirror_kind: 'nianjing' }));
  assert.equal(result.ok, true, JSON.stringify(result));
});

test('mingjing/relationship_natal reading is valid', () => {
  const scope = relationshipNatalMirrorScope();
  const result = validateReading(validReading({ mirror_kind: 'mingjing', mirror_scope: scope }));
  assert.equal(result.ok, true, JSON.stringify(result));
});

test('relationship_natal reading requires exactly one matching related person ref', () => {
  const scope = relationshipNatalMirrorScope();
  for (const related_person_refs of [[], [{ kind: 'person', id: 'p_other' }]]) {
    const result = validateReading(
      validReading({ mirror_kind: 'mingjing', mirror_scope: scope, related_person_refs }),
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, 'reading_relationship_natal_related_person_refs_invalid');
    }
  }
});

test('relationship_natal reading rejects concern tags', () => {
  const scope = relationshipNatalMirrorScope();
  const result = validateReading(
    validReading({ mirror_kind: 'mingjing', mirror_scope: scope, concern_tag_refs: ['tag_love'] }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'reading_relationship_natal_concern_tags_must_be_empty');
  }
});

test('relationship_natal reading rejects cited readings before generic non-shijing citation failure', () => {
  const scope = relationshipNatalMirrorScope();
  const result = validateReading(
    validReading({ mirror_kind: 'mingjing', mirror_scope: scope, cited_reading_ids: ['r_source'] }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'reading_relationship_natal_cited_readings_must_be_empty');
  }
});

test('relationship_natal reading requires relationship_hepan output', () => {
  const scope = relationshipNatalMirrorScope();
  const result = validateReading(
    validReading({ mirror_kind: 'mingjing', mirror_scope: scope, output: validMingjingOutput() }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'reading_relationship_natal_output_kind_invalid');
  }
});

test('relationship_hepan output requires relationship_natal scope', () => {
  const result = validateReading(
    validReading({ mirror_kind: 'mingjing', output: validMingjingRelationshipOutput() }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'reading_relationship_output_requires_relationship_scope');
  }
});

test('relationship_natal reading output subject must match mirror_scope', () => {
  const scope = relationshipNatalMirrorScope();
  const cases = [
    {
      relationship_subject: {
        primary_subject_ref: 'self',
        related_person_ref: { kind: 'person', id: 'p_other' },
        anchor_year: scope.anchor_year,
        basis_time_zone: scope.basis_time_zone,
      },
    },
    {
      relationship_subject: {
        primary_subject_ref: 'self',
        related_person_ref: scope.related_person_ref,
        anchor_year: 2027,
        basis_time_zone: scope.basis_time_zone,
      },
    },
    {
      relationship_subject: {
        primary_subject_ref: 'self',
        related_person_ref: scope.related_person_ref,
        anchor_year: scope.anchor_year,
        basis_time_zone: 'Asia/Tokyo',
      },
    },
  ];
  for (const override of cases) {
    const result = validateReading(
      validReading({
        mirror_kind: 'mingjing',
        mirror_scope: scope,
        output: validMingjingRelationshipOutput(override),
      }),
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, 'reading_relationship_natal_output_subject_mismatch');
    }
  }
});

test('latestReadingByMirrorKind returns the most recent reading for the kind', () => {
  // The retired "synthetic baseline" filter (which parsed opaque driver_refs for
  // a cycle_baseline marker — a Layer-3 boundary violation, and dead since the
  // generator refuses empty phase bands) has been removed; selection is purely
  // newest-first by created_at.
  const older = validReading({ id: 'r_nianjing_old', created_at: '2026-06-04T00:00:00Z', mirror_kind: 'nianjing' });
  const newer = validReading({ id: 'r_nianjing_new', created_at: '2026-06-05T00:00:00Z', mirror_kind: 'nianjing' });
  assert.equal(
    latestReadingByMirrorKind({ readings: [older, newer], mirror_kind: 'nianjing' })?.id,
    'r_nianjing_new',
  );
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
