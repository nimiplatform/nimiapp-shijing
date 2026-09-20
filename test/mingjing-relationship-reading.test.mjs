// SJG-ASTRO-13 - MingJing relationship generator and Reading routing.

import assert from 'node:assert/strict';
import test from 'node:test';

import { validateMirrorOutput } from '../src/contracts/mirror-output-validator.ts';
import { validateReading } from '../src/contracts/reading-validator.ts';
import { buildAstrologyFeatureSnapshot } from '../src/product/astrology/build-feature-snapshot.ts';
import { generateReading } from '../src/product/astrology/generate-reading.ts';
import { generateMingJingRelationshipOutput } from '../src/product/astrology/mingjing-relationship-generator.ts';
import { localWallClockToUtcInstant } from '../src/product/astrology/local-wall-clock.ts';
import { runtimeAiWordingPatchAppliedSource } from '../src/product/astrology/runtime-ai-client.ts';
import { RuntimeAiOutputValidationError } from '../src/product/astrology/runtime-ai-parse.ts';
import {
  applyRuntimeAiWordingPatch,
  RuntimeAiWordingPatchValidationError,
  validateRuntimeAiWordingPatchValue,
} from '../src/product/astrology/runtime-ai-wording-patch.ts';
import {
  relationshipNatalMirrorScope,
  validFeatureSnapshot,
  validNatalInputs,
  validPerson,
  validRawBirthInput,
  validShiJingSpace,
} from './_fixtures.mjs';

const TZ = 'Asia/Shanghai';
const NOW = new Date('2026-06-22T01:00:00Z');
const SCOPE = relationshipNatalMirrorScope({ anchor_year: 2026 });
const ALICE_REF = { kind: 'person', id: 'p_alice' };

function natalAt(localDate, localTime, calculationSex) {
  return validNatalInputs({
    raw_birth_input: validRawBirthInput({
      local_date_text: localDate,
      local_time_text: localTime,
      place_text: 'Shanghai',
    }),
    birth_datetime_utc: localWallClockToUtcInstant(`${localDate}T${localTime}:00`, TZ).toISOString(),
    calculation_sex: calculationSex,
  });
}

function relationshipSpace() {
  return validShiJingSpace({
    self_subject: { natal_inputs: natalAt('1990-04-12', '08:30', 'male') },
    persons: [
      validPerson('p_alice', {
        display_name: 'Alice',
        natal_inputs: natalAt('1992-11-03', '19:10', 'female'),
      }),
    ],
  });
}

function relationshipSpaceWithMethod(methodProfileId) {
  const space = relationshipSpace();
  return {
    ...space,
    settings: { ...space.settings, method_profile_id: methodProfileId },
  };
}

function featureSnapshot() {
  const result = buildAstrologyFeatureSnapshot({
    mirror_kind: 'mingjing',
    mirror_scope: SCOPE,
    space: relationshipSpace(),
    related_person_refs: [ALICE_REF],
    active_concern_tags: [],
    method_profile_id: 'bazi_ziping_v1',
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  return result.value;
}

function relationshipWordingPatchFor(output) {
  return {
    patch_kind: 'shijing.runtime_ai_wording_patch.v1',
    mirror_kind: 'mingjing',
    output_kind: 'relationship_hepan',
    overview: {
      title: 'Runtime overview title',
      summary: 'Runtime overview summary of the admitted patterns only.',
      keywords: ['runtime', 'patterns'],
    },
    patterns: output.patterns.map((pattern) => ({
      pattern_id: pattern.pattern_id,
      name: `Runtime name for ${pattern.rule_ref}`,
      self_tendency: 'Runtime self tendency wording.',
      related_tendency: 'Runtime related tendency wording.',
      scenario: 'Runtime scenario wording.',
      aligned_expression: 'Runtime aligned expression wording.',
      friction_expression: 'Runtime friction expression wording.',
      signals: ['Runtime signal one.', 'Runtime signal two.'],
    })),
    ...(output.recent_status.availability === 'available'
      ? { recent_status: { window: { summary: 'Runtime recent window summary.' } } }
      : {}),
    action: {
      situation: 'Runtime action situation.',
      step: 'Runtime action step.',
      example_phrase: 'Runtime example phrase.',
      rationale: 'Runtime action rationale.',
      observation: 'Runtime action observation.',
    },
  };
}

function relationshipRuntimeClient(capture) {
  return patchingClient((output) => relationshipWordingPatchFor(output), capture);
}

function patchingClient(buildPatch, capture) {
  return {
    async generate(_mirrorKind, request) {
      capture?.(request);
      try {
        const patch = validateRuntimeAiWordingPatchValue(
          'mingjing',
          buildPatch(request.deterministic_output),
        );
        return {
          ok: true,
          output: applyRuntimeAiWordingPatch(request.deterministic_output, patch),
          output_source: runtimeAiWordingPatchAppliedSource(),
        };
      } catch (error) {
        if (error instanceof RuntimeAiOutputValidationError) {
          return { ok: false, failure: { kind: 'parse_failure', failure: error.failure } };
        }
        if (error instanceof RuntimeAiWordingPatchValidationError) {
          return {
            ok: false,
            failure: {
              kind: 'parse_failure',
              failure: { kind: 'validation_failed', detail: error.detail },
            },
          };
        }
        throw error;
      }
    },
  };
}

function generateReadingInput(space = relationshipSpace()) {
  return {
    id: 'rdg_rel_1',
    created_at: '2026-06-22T00:00:00Z',
    mirror_kind: 'mingjing',
    mirror_scope: SCOPE,
    related_person_refs: [ALICE_REF],
    concern_tag_refs: [],
    cited_reading_ids: [],
    cited_event_memory_refs: [],
    cited_plan_item_refs: [],
    space,
  };
}

test('generateMingJingRelationshipOutput emits exact-schema relationship output', () => {
  const result = generateMingJingRelationshipOutput({
    feature_snapshot: featureSnapshot(),
    mirror_scope: SCOPE,
    method_profile_id: 'bazi_ziping_v1',
    cited_event_memory_refs: [],
    cited_plan_item_refs: [],
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(validateMirrorOutput(result.value).ok, true, JSON.stringify(validateMirrorOutput(result.value)));
  assert.equal(result.value.relationship_subject.primary_subject_ref, 'self');
  assert.deepEqual(result.value.relationship_subject.related_person_ref, SCOPE.related_person_ref);
  assert.equal(result.value.relationship_subject.anchor_year, SCOPE.anchor_year);
  assert.equal(result.value.relationship_subject.basis_time_zone, SCOPE.basis_time_zone);
  assert.ok(result.value.patterns.length >= 1 && result.value.patterns.length <= 4);
  assert.deepEqual(
    result.value.patterns.map((pattern) => pattern.rank),
    result.value.patterns.map((_pattern, index) => index + 1),
  );
  for (const pattern of result.value.patterns) {
    assert.equal(pattern.pattern_id, pattern.rule_ref);
    assert.ok(pattern.driver_refs.length > 0);
    assert.ok(pattern.evidence_summary.length > 0);
  }
  assert.ok(
    result.value.recent_status.availability === 'available' ||
    result.value.recent_status.availability === 'unavailable',
  );
  if (result.value.recent_status.availability === 'available') {
    assert.equal(result.value.action.target.kind, 'recent_window');
  } else {
    assert.equal(result.value.action.target.kind, 'pattern');
    assert.equal(result.value.action.target.pattern_id, result.value.patterns[0].pattern_id);
  }
  assert.equal(Object.hasOwn(result.value, 'summary'), false);
  assert.equal(Object.hasOwn(result.value, 'structure'), false);
  assert.equal(Object.hasOwn(result.value, 'practice'), false);
  assert.equal(Object.hasOwn(result.value, 'timing_windows'), false);
  assert.equal(Object.hasOwn(result.value, 'timing'), false);
});

test('generateMingJingRelationshipOutput fails closed without relationship_hepan evidence', () => {
  const result = generateMingJingRelationshipOutput({
    feature_snapshot: validFeatureSnapshot({ mirrorKind: 'mingjing', scope: SCOPE }),
    mirror_scope: SCOPE,
    method_profile_id: 'bazi_ziping_v1',
    cited_event_memory_refs: [],
    cited_plan_item_refs: [],
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.kind, 'stage_missing_input');
});

test('generateMingJingRelationshipOutput fails closed when evidence person differs from scope', () => {
  const bobScope = relationshipNatalMirrorScope({
    anchor_year: 2026,
    related_person_ref: { kind: 'person', id: 'p_bob' },
  });
  const result = generateMingJingRelationshipOutput({
    feature_snapshot: featureSnapshot(),
    mirror_scope: bobScope,
    method_profile_id: 'bazi_ziping_v1',
    cited_event_memory_refs: [],
    cited_plan_item_refs: [],
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.kind, 'stage_invalid_input');
  assert.match(result.error.detail ?? '', /relationship_hepan related_person_ref mismatch/u);
});

test('generateMingJingRelationshipOutput fails closed when no pattern rule matches the evidence', () => {
  const snapshot = featureSnapshot();
  const zeroMatchEvidence = {
    related_person_ref: ALICE_REF,
    display_name_snapshot: 'Alice',
    branch_interactions: [],
    day_master_relation: { label: 'same', driver_ref: 'bazi:relationship.day_master.fire->fire' },
    ten_god_relation: { label: 'same', driver_ref: 'bazi:relationship.ten_god.same' },
    yong_shen_relation: { label: 'unknown', driver_ref: 'bazi:relationship.yong_shen.unknown' },
    timing_windows: [
      {
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        nature: 'steady',
        driver_refs: ['bazi:relationship.period.self.fallback.anchor_year.2026'],
      },
    ],
  };
  const result = generateMingJingRelationshipOutput({
    feature_snapshot: {
      ...snapshot,
      common: { ...snapshot.common, relationship_hepan: zeroMatchEvidence },
    },
    mirror_scope: SCOPE,
    method_profile_id: 'bazi_ziping_v1',
    cited_event_memory_refs: [],
    cited_plan_item_refs: [],
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.stage, 'relationship_pattern_projection');
  assert.equal(result.error.detail, 'no_pattern_rule_matched');
});

test('generateReading succeeds for MingJing relationship_natal when Runtime AI returns a relationship wording patch', async () => {
  let deterministicOutput = null;
  const runtimeClient = relationshipRuntimeClient((request) => {
    deterministicOutput = request.deterministic_output;
  });
  const result = await generateReading(generateReadingInput(), { runtime_ai_client: runtimeClient, now: NOW });
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) return;
  assert.equal(validateReading(result.reading).ok, true, JSON.stringify(validateReading(result.reading)));
  assert.equal(result.reading.output.output_kind, 'relationship_hepan');
  assert.ok(deterministicOutput);
  assert.equal(result.reading.output.overview.title, 'Runtime overview title');
  assert.deepEqual(result.reading.output.relationship_subject, deterministicOutput.relationship_subject);
  assert.equal(result.reading.output.patterns.length, deterministicOutput.patterns.length);
  for (let i = 0; i < deterministicOutput.patterns.length; i += 1) {
    const base = deterministicOutput.patterns[i];
    const patched = result.reading.output.patterns[i];
    assert.equal(patched.pattern_id, base.pattern_id);
    assert.equal(patched.rule_ref, base.rule_ref);
    assert.equal(patched.rank, base.rank);
    assert.deepEqual(patched.driver_refs, base.driver_refs);
    assert.equal(patched.evidence_summary, base.evidence_summary);
    assert.equal(patched.name, `Runtime name for ${base.rule_ref}`);
  }
  assert.equal(
    result.reading.output.recent_status.availability,
    deterministicOutput.recent_status.availability,
  );
  if (deterministicOutput.recent_status.availability === 'available') {
    assert.equal(result.reading.output.recent_status.window.summary, 'Runtime recent window summary.');
    assert.equal(
      result.reading.output.recent_status.window.nature,
      deterministicOutput.recent_status.window.nature,
    );
    assert.deepEqual(
      result.reading.output.recent_status.window.driver_refs,
      deterministicOutput.recent_status.window.driver_refs,
    );
  }
  assert.deepEqual(result.reading.output.action.target, deterministicOutput.action.target);
  assert.equal(result.reading.output.action.step, 'Runtime action step.');
});

test('generateReading rejects relationship_natal runtime success without wording patch provenance', async () => {
  const runtimeClient = {
    async generate(_mirrorKind, request) {
      return { ok: true, output: request.deterministic_output };
    },
  };
  const result = await generateReading(generateReadingInput(), { runtime_ai_client: runtimeClient, now: NOW });
  assert.equal(result.ok, false);
  assert.equal(result.failure.kind, 'runtime_ai_failed');
  assert.match(result.failure.detail, /runtime_output_missing_wording_patch_provenance/u);
});

test('generateReading fails closed for non-MingJing relationship_natal scope without throwing', async () => {
  const runtimeClient = {
    async generate() {
      throw new Error('runtime client should not be reached for forbidden scope pairing');
    },
  };
  const result = await generateReading(
    { ...generateReadingInput(), id: 'rdg_rel_forbidden', mirror_kind: 'shijing' },
    { runtime_ai_client: runtimeClient, now: NOW },
  );
  assert.equal(result.ok, false);
  assert.equal(result.failure.kind, 'validation_failed');
  assert.equal(result.failure.stage, 'orchestrator');
  assert.match(result.failure.detail ?? '', /mirror_kind_scope_forbidden:shijing:relationship_natal/u);
});

test('generateReading succeeds for BaZi relationship_natal and produces the new-shape output', async () => {
  const runtimeClient = relationshipRuntimeClient();
  const result = await generateReading(
    { ...generateReadingInput(relationshipSpaceWithMethod('bazi_ziping_v1')), id: 'rdg_rel_bazi' },
    { runtime_ai_client: runtimeClient, now: NOW },
  );
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) return;
  assert.equal(result.reading.inputs_summary.method_profile.id, 'bazi_ziping_v1');
  assert.equal(result.reading.output.output_kind, 'relationship_hepan');
  assert.equal(validateReading(result.reading).ok, true, JSON.stringify(validateReading(result.reading)));
});

test('generateReading ends in typed patterns_unavailable for Ziwei and QiZheng relationship_natal', async () => {
  for (const method_profile_id of ['ziwei_sanhe_v1', 'qizheng_siyu_guolao_v1']) {
    const runtimeClient = {
      async generate() {
        throw new Error('runtime client must not be reached when pattern projection is unadmitted');
      },
    };
    const result = await generateReading(
      { ...generateReadingInput(relationshipSpaceWithMethod(method_profile_id)), id: `rdg_rel_${method_profile_id}` },
      { runtime_ai_client: runtimeClient, now: NOW },
    );
    assert.equal(result.ok, false, method_profile_id);
    if (result.ok) continue;
    assert.equal(result.failure.kind, 'patterns_unavailable', method_profile_id);
    assert.equal(result.failure.stage, 'relationship_pattern_projection', method_profile_id);
    assert.equal(
      result.failure.detail,
      `method_pattern_mapping_pending:${method_profile_id}`,
      method_profile_id,
    );
  }
});

test('generateReading rejects a relationship patch with an unknown pattern target', async () => {
  const runtimeClient = patchingClient((output) => ({
    ...relationshipWordingPatchFor(output),
    patterns: [
      ...relationshipWordingPatchFor(output).patterns,
      {
        pattern_id: 'bazi_ziping_v1.hepan.invented_rule',
        name: 'Invented pattern.',
        self_tendency: 'Invented self tendency.',
        related_tendency: 'Invented related tendency.',
        scenario: 'Invented scenario.',
        aligned_expression: 'Invented aligned expression.',
        friction_expression: 'Invented friction expression.',
        signals: ['Invented signal.'],
      },
    ],
  }));
  const result = await generateReading(
    { ...generateReadingInput(), id: 'rdg_rel_unknown_target' },
    { runtime_ai_client: runtimeClient, now: NOW },
  );
  assert.equal(result.ok, false);
  assert.equal(result.failure.kind, 'runtime_ai_failed');
  assert.match(
    result.failure.detail ?? '',
    /parse_failure:validation_failed:mingjing_relationship_pattern_target_unknown/u,
  );
});

test('generateReading rejects a relationship patch missing a deterministic pattern target', async () => {
  const runtimeClient = patchingClient((output) => ({
    ...relationshipWordingPatchFor(output),
    patterns: relationshipWordingPatchFor(output).patterns.slice(1),
  }));
  const result = await generateReading(
    { ...generateReadingInput(), id: 'rdg_rel_missing_target' },
    { runtime_ai_client: runtimeClient, now: NOW },
  );
  assert.equal(result.ok, false);
  assert.equal(result.failure.kind, 'runtime_ai_failed');
  assert.match(
    result.failure.detail ?? '',
    /parse_failure:validation_failed:mingjing_relationship_pattern_target_missing/u,
  );
});

test('generateReading rejects a relationship patch that omits the available recent window summary', async () => {
  let deterministicOutput = null;
  const runtimeClient = patchingClient((output) => {
    const patch = relationshipWordingPatchFor(output);
    delete patch.recent_status;
    return patch;
  }, (request) => {
    deterministicOutput = request.deterministic_output;
  });
  const result = await generateReading(
    { ...generateReadingInput(), id: 'rdg_rel_missing_recent' },
    { runtime_ai_client: runtimeClient, now: NOW },
  );
  assert.ok(deterministicOutput);
  if (deterministicOutput.recent_status.availability !== 'available') {
    // Real charts for this harness produce an available window; guard the
    // premise so a fixture change fails loudly instead of silently skipping.
    assert.fail('expected deterministic recent_status to be available for this fixture');
  }
  assert.equal(result.ok, false);
  assert.equal(result.failure.kind, 'runtime_ai_failed');
  assert.match(
    result.failure.detail ?? '',
    /parse_failure:validation_failed:mingjing_relationship_recent_window_patch_missing/u,
  );
});
