// SJG-ASTRO-13 - MingJing Relationship HePan output validator tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import { validateMirrorOutput } from '../src/contracts/mirror-output-validator.ts';
import {
  validMingjingRelationshipOutput,
  validMingjingRelationshipOutputUnavailableRecent,
  validMingjingRelationshipPattern,
} from './_fixtures.mjs';

test('valid mingjing relationship hepan output passes', () => {
  const result = validateMirrorOutput(validMingjingRelationshipOutput());
  assert.equal(result.ok, true, JSON.stringify(result));
});

test('valid mingjing relationship hepan output with unavailable recent status passes', () => {
  const result = validateMirrorOutput(validMingjingRelationshipOutputUnavailableRecent());
  assert.equal(result.ok, true, JSON.stringify(result));
});

test('mingjing relationship hepan rejects removed root fields', () => {
  for (const field of ['summary', 'structure', 'practice', 'timing_windows']) {
    const output = validMingjingRelationshipOutput({ [field]: field === 'timing_windows' ? [] : {} });
    const result = validateMirrorOutput(output);
    assert.equal(result.ok, false, field);
    if (!result.ok) {
      assert.equal(result.error.code, 'mirror_output_forbidden_field_present', field);
      assert.equal(result.error.field, field, field);
    }
  }
});

test('mingjing relationship hepan rejects forbidden match_score field', () => {
  const result = validateMirrorOutput(validMingjingRelationshipOutput({ match_score: 88 }));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'mirror_output_forbidden_field_present');
  }
});

test('mingjing relationship hepan rejects forbidden radar and metrics fields', () => {
  for (const field of ['radar', 'metrics', 'relationship_score', 'stability_rating']) {
    const result = validateMirrorOutput(validMingjingRelationshipOutput({ [field]: 1 }));
    assert.equal(result.ok, false, field);
    if (!result.ok) {
      assert.equal(result.error.code, 'mirror_output_forbidden_field_present', field);
    }
  }
});

test('mingjing relationship hepan rejects forbidden trend_curve field', () => {
  const result = validateMirrorOutput(validMingjingRelationshipOutput({ trend_curve: [] }));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'mirror_output_forbidden_field_present');
  }
});

test('mingjing relationship hepan rejects unadmitted root field', () => {
  const result = validateMirrorOutput(validMingjingRelationshipOutput({ unadmitted_payload: {} }));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'mirror_output_forbidden_field_present');
  }
});

test('mingjing relationship hepan rejects bad relationship subject ref', () => {
  const output = validMingjingRelationshipOutput();
  const result = validateMirrorOutput({
    ...output,
    relationship_subject: {
      ...output.relationship_subject,
      related_person_ref: 'self',
    },
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'mirror_output_mingjing_relationship_subject_invalid');
  }
});

test('mingjing relationship hepan rejects extra relationship subject field', () => {
  const output = validMingjingRelationshipOutput();
  const result = validateMirrorOutput({
    ...output,
    relationship_subject: {
      ...output.relationship_subject,
      unadmitted: 'x',
    },
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'mirror_output_mingjing_relationship_subject_invalid');
  }
});

test('mingjing relationship hepan rejects overview with extra or empty fields', () => {
  const output = validMingjingRelationshipOutput();
  const cases = [
    { overview: { ...output.overview, unadmitted: 'x' } },
    { overview: { ...output.overview, title: '' } },
    { overview: { ...output.overview, summary: '' } },
    { overview: { ...output.overview, keywords: ['a', 'b', 'c', 'd'] } },
    { overview: { ...output.overview, keywords: ['a', 'a'] } },
    { overview: { ...output.overview, keywords: [''] } },
  ];
  for (const patch of cases) {
    const result = validateMirrorOutput({ ...output, ...patch });
    assert.equal(result.ok, false, JSON.stringify(patch));
    if (!result.ok) {
      assert.equal(
        result.error.code,
        'mirror_output_mingjing_relationship_overview_invalid',
        JSON.stringify(patch),
      );
    }
  }
});

test('mingjing relationship hepan rejects empty patterns array', () => {
  const result = validateMirrorOutput(validMingjingRelationshipOutput({ patterns: [] }));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'mirror_output_mingjing_relationship_patterns_invalid');
  }
});

test('mingjing relationship hepan rejects more than four patterns', () => {
  const patterns = [
    validMingjingRelationshipPattern(),
    validMingjingRelationshipPattern({ pattern_id: 'bazi_ziping_v1.hepan.day_branch_friction', rule_ref: 'bazi_ziping_v1.hepan.day_branch_friction', rank: 2 }),
    validMingjingRelationshipPattern({ pattern_id: 'bazi_ziping_v1.hepan.month_branch_harmony', rule_ref: 'bazi_ziping_v1.hepan.month_branch_harmony', rank: 3 }),
    validMingjingRelationshipPattern({ pattern_id: 'bazi_ziping_v1.hepan.month_branch_friction', rule_ref: 'bazi_ziping_v1.hepan.month_branch_friction', rank: 4 }),
    validMingjingRelationshipPattern({ pattern_id: 'bazi_ziping_v1.hepan.day_master_support', rule_ref: 'bazi_ziping_v1.hepan.day_master_support', rank: 5 }),
  ];
  const result = validateMirrorOutput(validMingjingRelationshipOutput({ patterns }));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'mirror_output_mingjing_relationship_patterns_invalid');
  }
});

test('mingjing relationship hepan rejects unadmitted pattern rule_ref', () => {
  const patterns = [
    validMingjingRelationshipPattern({ rule_ref: 'bazi_ziping_v1.hepan.invented_rule' }),
    validMingjingRelationshipPattern({
      pattern_id: 'bazi_ziping_v1.hepan.day_master_support',
      rule_ref: 'bazi_ziping_v1.hepan.day_master_support',
      rank: 2,
    }),
  ];
  const result = validateMirrorOutput(validMingjingRelationshipOutput({ patterns }));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'mirror_output_mingjing_relationship_pattern_rule_unadmitted');
  }
});

test('mingjing relationship hepan rejects duplicate pattern ids and broken rank permutations', () => {
  const duplicate = validateMirrorOutput(validMingjingRelationshipOutput({
    patterns: [
      validMingjingRelationshipPattern(),
      validMingjingRelationshipPattern({ rank: 2 }),
    ],
  }));
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) {
    assert.equal(duplicate.error.code, 'mirror_output_mingjing_relationship_pattern_invalid');
    assert.equal(duplicate.error.reason, 'pattern_id_duplicate');
  }
  const brokenRanks = validateMirrorOutput(validMingjingRelationshipOutput({
    patterns: [
      validMingjingRelationshipPattern({ rank: 1 }),
      validMingjingRelationshipPattern({
        pattern_id: 'bazi_ziping_v1.hepan.day_master_support',
        rule_ref: 'bazi_ziping_v1.hepan.day_master_support',
        rank: 3,
      }),
    ],
  }));
  assert.equal(brokenRanks.ok, false);
  if (!brokenRanks.ok) {
    assert.equal(brokenRanks.error.code, 'mirror_output_mingjing_relationship_patterns_invalid');
    assert.equal(brokenRanks.error.reason, 'rank_not_permutation');
  }
});

test('mingjing relationship hepan rejects pattern with invalid deterministic fields', () => {
  const cases = [
    { pattern_id: '' },
    { pattern_id: 'invented-pattern' },
    { pattern_id: 'bazi_ziping_v1.hepan.day_master_support' },
    { rank: 0 },
    { driver_refs: [] },
    { driver_refs: [''] },
    { evidence_summary: '' },
    { signals: [] },
    { signals: ['a', 'b', 'c', 'd'] },
    { signals: [''] },
    { scenario: '' },
    { unadmitted: 'x' },
  ];
  for (const patch of cases) {
    const output = validMingjingRelationshipOutput();
    const patterns = [validMingjingRelationshipPattern(patch)];
    const result = validateMirrorOutput({ ...output, patterns });
    assert.equal(result.ok, false, JSON.stringify(patch));
    if (!result.ok) {
      assert.equal(
        result.error.code,
        'mirror_output_mingjing_relationship_pattern_invalid',
        JSON.stringify(patch),
      );
    }
  }
});

test('mingjing relationship hepan rejects invalid recent window fields', () => {
  const output = validMingjingRelationshipOutput();
  const cases = [
    { start_date: '2026-13-01' },
    { start_date: '2026-04-01', end_date: '2026-06-30' },
    { start_date: '2025-01-01', end_date: '2025-12-31' },
    { start_date: '2026-12-31', end_date: '2026-01-01' },
    { nature: 'excellent' },
    { driver_refs: [] },
    { summary: '' },
    { unadmitted: 'x' },
  ];
  for (const patch of cases) {
    const result = validateMirrorOutput({
      ...output,
      recent_status: {
        availability: 'available',
        window: { ...output.recent_status.window, ...patch },
      },
    });
    assert.equal(result.ok, false, JSON.stringify(patch));
    if (!result.ok) {
      assert.equal(
        result.error.code,
        'mirror_output_mingjing_relationship_recent_window_invalid',
        JSON.stringify(patch),
      );
    }
  }
});

test('mingjing relationship hepan rejects invalid recent status branches', () => {
  const output = validMingjingRelationshipOutput();
  const cases = [
    { availability: 'pending' },
    { availability: 'unavailable', reason: 'model_declined' },
    { availability: 'unavailable', reason: 'fallback_year_marker_only', window: output.recent_status.window },
    { availability: 'available', window: output.recent_status.window, reason: 'fallback_year_marker_only' },
  ];
  for (const status of cases) {
    const result = validateMirrorOutput({ ...output, recent_status: status });
    assert.equal(result.ok, false, JSON.stringify(status));
    if (!result.ok) {
      assert.equal(
        result.error.code,
        'mirror_output_mingjing_relationship_recent_status_invalid',
        JSON.stringify(status),
      );
    }
  }
});

test('mingjing relationship hepan rejects action target mismatches', () => {
  const output = validMingjingRelationshipOutput();
  const unknownPattern = validateMirrorOutput({
    ...output,
    action: { ...output.action, target: { kind: 'pattern', pattern_id: 'bazi_ziping_v1.hepan.yong_shen_complement' } },
  });
  assert.equal(unknownPattern.ok, false);
  if (!unknownPattern.ok) {
    assert.equal(unknownPattern.error.code, 'mirror_output_mingjing_relationship_action_target_mismatch');
    assert.equal(unknownPattern.error.reason, 'pattern_id_unknown');
  }
  const recentWithoutAvailability = validateMirrorOutput({
    ...validMingjingRelationshipOutputUnavailableRecent(),
    action: {
      ...output.action,
      target: { kind: 'recent_window' },
    },
  });
  assert.equal(recentWithoutAvailability.ok, false);
  if (!recentWithoutAvailability.ok) {
    assert.equal(
      recentWithoutAvailability.error.code,
      'mirror_output_mingjing_relationship_action_target_mismatch',
    );
    assert.equal(recentWithoutAvailability.error.reason, 'recent_window_requires_available');
  }
  const badKind = validateMirrorOutput({
    ...output,
    action: { ...output.action, target: { kind: 'both' } },
  });
  assert.equal(badKind.ok, false);
  if (!badKind.ok) {
    assert.equal(badKind.error.code, 'mirror_output_mingjing_relationship_action_target_mismatch');
  }
});

test('mingjing relationship hepan rejects action with empty or extra prose fields', () => {
  const output = validMingjingRelationshipOutput();
  const cases = [
    { situation: '' },
    { step: '' },
    { example_phrase: '' },
    { rationale: '' },
    { observation: '' },
    { unadmitted: 'x' },
  ];
  for (const patch of cases) {
    const result = validateMirrorOutput({
      ...output,
      action: { ...output.action, ...patch },
    });
    assert.equal(result.ok, false, JSON.stringify(patch));
    if (!result.ok) {
      assert.equal(
        result.error.code,
        'mirror_output_mingjing_relationship_action_invalid',
        JSON.stringify(patch),
      );
    }
  }
});

test('mingjing relationship hepan rejects extra citation field', () => {
  const result = validateMirrorOutput(
    validMingjingRelationshipOutput({
      citations: [
        {
          method: 'bazi_ziping_v1',
          reference: 'mingjing.relationship_hepan.v1',
          unadmitted: 'x',
        },
      ],
    }),
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'mirror_output_citation_method_invalid');
  }
});
