// SJG-ALGO — relationship pattern projection over Relationship HePan evidence.

import assert from 'node:assert/strict';
import test from 'node:test';

import { RELATIONSHIP_PATTERN_RULE_IDS } from '../src/domain/mirror-output.ts';
import {
  projectRelationshipPatterns,
  relationshipPatternRuleBasis,
  RELATIONSHIP_PATTERN_RULES,
} from '../src/product/astrology/relationship-pattern-rules.ts';

const ALICE_REF = { kind: 'person', id: 'p_alice' };

function interaction(selfPos, relPos, kind, selfBranch = 'chen', relatedBranch = 'you') {
  return {
    self_position: selfPos,
    related_position: relPos,
    kind,
    driver_ref: `bazi:relationship.branch.${selfPos}-${relPos}.${kind}@${selfBranch}-${relatedBranch}`,
  };
}

function direction(label, driverRef) {
  return { label, driver_ref: driverRef };
}

function anchorYearWindow(driverRefs, overrides = {}) {
  return {
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    nature: 'watch',
    driver_refs: driverRefs,
    ...overrides,
  };
}

const FALLBACK_WINDOW = anchorYearWindow([
  'bazi:relationship.anchor_year.2026',
  'bazi:relationship.period.self.fallback.anchor_year.2026',
  'bazi:relationship.period.person:p_alice.fallback.anchor_year.2026',
]);

const REAL_MARKER_WINDOW = anchorYearWindow([
  'bazi:relationship.anchor_year.2026',
  'bazi:relationship.period.self.dayun_boundary@2026-03-01T00:00:00Z',
  'bazi:relationship.period.person:p_alice.annual_transition@2026-02-04T00:00:00Z',
]);

function evidence(overrides = {}) {
  return {
    related_person_ref: ALICE_REF,
    display_name_snapshot: 'Alice',
    branch_interactions: [],
    day_master_relation: direction('unknown', 'bazi:relationship.day_master.unknown'),
    ten_god_relation: direction('unknown', 'bazi:relationship.ten_god.unknown'),
    yong_shen_relation: direction('unknown', 'bazi:relationship.yong_shen.unknown'),
    timing_windows: [FALLBACK_WINDOW],
    ...overrides,
  };
}

function project(ev, methodProfileId = 'bazi_ziping_v1') {
  return projectRelationshipPatterns({ method_profile_id: methodProfileId, evidence: ev });
}

test('registry covers exactly the admitted rule ids in priority order', () => {
  assert.equal(RELATIONSHIP_PATTERN_RULES.length, 12);
  assert.deepEqual(
    RELATIONSHIP_PATTERN_RULES.map((rule) => rule.rule_id),
    [...RELATIONSHIP_PATTERN_RULE_IDS],
  );
  assert.deepEqual(
    RELATIONSHIP_PATTERN_RULES.map((rule) => rule.priority),
    RELATIONSHIP_PATTERN_RULES.map((_rule, index) => index + 1),
  );
});

test('branch harmony rules match 六合 and 三合 on the same pillar position only', () => {
  const result = project(evidence({
    branch_interactions: [
      interaction('day', 'day', '六合'),
      interaction('day', 'month', '三合'), // cross-position: must not fire any branch rule
      interaction('month', 'month', '三合', 'shen', 'zi'),
    ],
  }));
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.deepEqual(
    result.patterns.map((pattern) => pattern.rule_ref),
    ['bazi_ziping_v1.hepan.day_branch_harmony', 'bazi_ziping_v1.hepan.month_branch_harmony'],
  );
});

test('branch friction rules match 相冲, 相害, 相刑, and 相破 on the same pillar position', () => {
  for (const kind of ['相冲', '相害', '相刑', '相破']) {
    const result = project(evidence({
      branch_interactions: [interaction('hour', 'hour', kind, 'zi', 'wu')],
    }));
    assert.equal(result.ok, true, kind);
    assert.deepEqual(
      result.patterns.map((pattern) => pattern.rule_ref),
      ['bazi_ziping_v1.hepan.hour_branch_friction'],
      kind,
    );
  }
});

test('branch harmony rules do not match friction kinds and vice versa', () => {
  const frictionOnly = project(evidence({
    branch_interactions: [interaction('year', 'year', '相冲', 'zi', 'wu')],
  }));
  assert.equal(frictionOnly.ok, true);
  assert.deepEqual(
    frictionOnly.patterns.map((pattern) => pattern.rule_ref),
    ['bazi_ziping_v1.hepan.year_branch_friction'],
  );
  const harmonyOnly = project(evidence({
    branch_interactions: [interaction('year', 'year', '六合', 'zi', 'chou')],
  }));
  assert.equal(harmonyOnly.ok, true);
  assert.deepEqual(
    harmonyOnly.patterns.map((pattern) => pattern.rule_ref),
    ['bazi_ziping_v1.hepan.year_branch_harmony'],
  );
});

test('evidence_summary states the pillar position, both branches, and the interaction kind', () => {
  const result = project(evidence({
    branch_interactions: [interaction('day', 'day', '相冲', 'shen', 'yin')],
  }));
  assert.equal(result.ok, true);
  assert.equal(result.patterns[0].evidence_summary, 'day branch 申 × 寅: 相冲');
  assert.deepEqual(
    result.patterns[0].driver_refs,
    ['bazi:relationship.branch.day-day.相冲@shen-yin'],
  );
});

test('multiple same-layer matches merge into one pattern with combined driver refs and summary', () => {
  const result = project(evidence({
    branch_interactions: [
      interaction('day', 'day', '六合', 'chen', 'you'),
      interaction('day', 'day', '三合', 'shen', 'zi'),
      interaction('month', 'month', '六合', 'mao', 'xu'),
    ],
  }));
  assert.equal(result.ok, true);
  const dayHarmony = result.patterns.find(
    (pattern) => pattern.rule_ref === 'bazi_ziping_v1.hepan.day_branch_harmony',
  );
  assert.ok(dayHarmony);
  assert.deepEqual(dayHarmony.driver_refs, [
    'bazi:relationship.branch.day-day.六合@chen-you',
    'bazi:relationship.branch.day-day.三合@shen-zi',
  ]);
  assert.equal(
    dayHarmony.evidence_summary,
    'day branch 辰 × 酉: 六合; day branch 申 × 子: 三合',
  );
});

test('day master direction rules fire only on supporting and controlling', () => {
  const supporting = project(evidence({
    day_master_relation: direction('supporting', 'bazi:relationship.day_master.wood->fire'),
  }));
  assert.equal(supporting.ok, true);
  assert.deepEqual(
    supporting.patterns.map((pattern) => pattern.rule_ref),
    ['bazi_ziping_v1.hepan.day_master_support'],
  );
  assert.equal(
    supporting.patterns[0].evidence_summary,
    'day master relation related→self: supporting (bazi:relationship.day_master.wood->fire)',
  );
  const controlling = project(evidence({
    day_master_relation: direction('controlling', 'bazi:relationship.day_master.metal->wood'),
  }));
  assert.equal(controlling.ok, true);
  assert.deepEqual(
    controlling.patterns.map((pattern) => pattern.rule_ref),
    ['bazi_ziping_v1.hepan.day_master_controlling'],
  );
  for (const label of ['same', 'unknown', 'draining']) {
    const result = project(evidence({
      day_master_relation: direction(label, `bazi:relationship.day_master.${label}`),
    }));
    assert.equal(result.ok, false, label);
    assert.equal(result.detail, 'no_pattern_rule_matched', label);
  }
});

test('yong shen rules fire on supporting, draining, and controlling only', () => {
  const complement = project(evidence({
    yong_shen_relation: direction('supporting', 'bazi:relationship.yong_shen.wood'),
  }));
  assert.equal(complement.ok, true);
  assert.deepEqual(
    complement.patterns.map((pattern) => pattern.rule_ref),
    ['bazi_ziping_v1.hepan.yong_shen_complement'],
  );
  for (const label of ['draining', 'controlling']) {
    const result = project(evidence({
      yong_shen_relation: direction(label, `bazi:relationship.yong_shen.${label}`),
    }));
    assert.equal(result.ok, true, label);
    assert.deepEqual(
      result.patterns.map((pattern) => pattern.rule_ref),
      ['bazi_ziping_v1.hepan.yong_shen_depletion'],
      label,
    );
  }
  for (const label of ['same', 'unknown']) {
    const result = project(evidence({
      yong_shen_relation: direction(label, `bazi:relationship.yong_shen.${label}`),
    }));
    assert.equal(result.ok, false, label);
    assert.equal(result.detail, 'no_pattern_rule_matched', label);
  }
});

test('priority ranking selects the top four patterns in admitted order', () => {
  const result = project(evidence({
    branch_interactions: [
      interaction('day', 'day', '相冲', 'zi', 'wu'),
      interaction('month', 'month', '六合', 'zi', 'chou'),
      interaction('hour', 'hour', '三合', 'shen', 'zi'),
      interaction('year', 'year', '相害', 'zi', 'wei'),
    ],
    day_master_relation: direction('supporting', 'bazi:relationship.day_master.wood->fire'),
    yong_shen_relation: direction('supporting', 'bazi:relationship.yong_shen.wood'),
  }));
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.patterns.length, 4);
  assert.deepEqual(
    result.patterns.map((pattern) => pattern.rule_ref),
    [
      'bazi_ziping_v1.hepan.day_branch_friction',
      'bazi_ziping_v1.hepan.month_branch_harmony',
      'bazi_ziping_v1.hepan.day_master_support',
      'bazi_ziping_v1.hepan.yong_shen_complement',
    ],
  );
  assert.deepEqual(result.patterns.map((pattern) => pattern.rank), [1, 2, 3, 4]);
  for (const pattern of result.patterns) {
    assert.equal(pattern.pattern_id, pattern.rule_ref);
  }
});

test('zero matches end in no_pattern_rule_matched', () => {
  const result = project(evidence({
    day_master_relation: direction('same', 'bazi:relationship.day_master.fire->fire'),
    yong_shen_relation: direction('unknown', 'bazi:relationship.yong_shen.unknown'),
  }));
  assert.equal(result.ok, false);
  assert.equal(result.detail, 'no_pattern_rule_matched');
});

test('Ziwei and QiZheng pattern mappings end in method_pattern_mapping_pending', () => {
  for (const methodProfileId of ['ziwei_sanhe_v1', 'qizheng_siyu_guolao_v1']) {
    const result = project(evidence({
      branch_interactions: [interaction('day', 'day', '六合')],
      day_master_relation: direction('supporting', 'ziwei:relationship.minggong.x->y'),
    }), methodProfileId);
    assert.equal(result.ok, false, methodProfileId);
    assert.equal(result.detail, `method_pattern_mapping_pending:${methodProfileId}`, methodProfileId);
  }
});

test('fallback-only period markers make recent status unavailable', () => {
  const result = project(evidence({
    branch_interactions: [interaction('day', 'day', '六合')],
    timing_windows: [FALLBACK_WINDOW],
  }));
  assert.equal(result.ok, true);
  assert.deepEqual(result.recent_status, {
    availability: 'unavailable',
    reason: 'fallback_year_marker_only',
  });
  assert.deepEqual(result.action_target, {
    kind: 'pattern',
    pattern_id: 'bazi_ziping_v1.hepan.day_branch_harmony',
  });
});

test('general structure plus a bare year label without real period markers is not available', () => {
  const result = project(evidence({
    branch_interactions: [interaction('day', 'day', '六合')],
    timing_windows: [anchorYearWindow([
      'bazi:relationship.anchor_year.2026',
      'bazi:relationship.day_master.wood->fire',
    ])],
  }));
  assert.equal(result.ok, true);
  assert.deepEqual(result.recent_status, {
    availability: 'unavailable',
    reason: 'fallback_year_marker_only',
  });
});

test('real period-marker refs make recent status available with the window copied verbatim', () => {
  const result = project(evidence({
    branch_interactions: [interaction('day', 'day', '六合')],
    timing_windows: [REAL_MARKER_WINDOW],
  }));
  assert.equal(result.ok, true);
  assert.equal(result.recent_status.availability, 'available');
  assert.deepEqual(result.recent_status.window, {
    start_date: REAL_MARKER_WINDOW.start_date,
    end_date: REAL_MARKER_WINDOW.end_date,
    nature: REAL_MARKER_WINDOW.nature,
    driver_refs: REAL_MARKER_WINDOW.driver_refs,
  });
  assert.deepEqual(result.action_target, { kind: 'recent_window' });
});

test('missing or non-annual windows end in no_anchor_year_window', () => {
  const empty = project(evidence({
    branch_interactions: [interaction('day', 'day', '六合')],
    timing_windows: [],
  }));
  assert.equal(empty.ok, true);
  assert.deepEqual(empty.recent_status, {
    availability: 'unavailable',
    reason: 'no_anchor_year_window',
  });
  const partial = project(evidence({
    branch_interactions: [interaction('day', 'day', '六合')],
    timing_windows: [{
      start_date: '2026-03-01',
      end_date: '2026-04-15',
      nature: 'steady',
      driver_refs: ['bazi:relationship.period.self.dayun_boundary@2026-03-01T00:00:00Z'],
    }],
  }));
  assert.equal(partial.ok, true);
  assert.deepEqual(partial.recent_status, {
    availability: 'unavailable',
    reason: 'no_anchor_year_window',
  });
});

test('relationshipPatternRuleBasis returns zh rule explanation plus limitation for every rule', () => {
  for (const ruleId of RELATIONSHIP_PATTERN_RULE_IDS) {
    const basis = relationshipPatternRuleBasis(ruleId);
    assert.ok(basis.title.length > 0, ruleId);
    assert.ok(basis.body.length > 0, ruleId);
    assert.match(basis.body, /观察假设/u, ruleId);
  }
  assert.equal(relationshipPatternRuleBasis('bazi_ziping_v1.hepan.day_branch_harmony').title, '日柱地支相合（六合/三合）');
});
