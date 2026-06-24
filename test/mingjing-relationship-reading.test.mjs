// SJG-ASTRO-13 - MingJing relationship generator and Reading routing.

import assert from 'node:assert/strict';
import test from 'node:test';

import { validateMirrorOutput } from '../src/contracts/mirror-output-validator.ts';
import { validateReading } from '../src/contracts/reading-validator.ts';
import { buildAstrologyFeatureSnapshot } from '../src/product/astrology/build-feature-snapshot.ts';
import { generateReading } from '../src/product/astrology/generate-reading.ts';
import { generateMingJingRelationshipOutput } from '../src/product/astrology/mingjing-relationship-generator.ts';
import { localWallClockToUtcInstant } from '../src/product/astrology/local-wall-clock.ts';
import { MockRuntimeAiClient } from './_mock-runtime-ai-client.mjs';
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
        consent_state: 'owner_recorded',
      }),
    ],
  });
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

function relationshipWordingPatch() {
  return {
    patch_kind: 'shijing.runtime_ai_wording_patch.v1',
    mirror_kind: 'mingjing',
    output_kind: 'relationship_hepan',
    summary: 'Runtime AI describes the relationship as a steady structure with clear repair rituals.',
    structure: {
      baseline_pattern: 'Runtime baseline wording for the shared rhythm.',
      attraction_and_support: 'Runtime support wording for mutual steadiness.',
      friction_and_misread: 'Runtime friction wording for rushed assumptions.',
      communication_rhythm: 'Runtime rhythm wording for short explicit check-ins.',
      boundary_advice: 'Runtime boundary wording for keeping recovery space visible.',
    },
    timing_windows: [
      {
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        summary: 'Runtime timing wording for the first admitted relationship window.',
      },
    ],
    practice: {
      communication: 'Runtime communication practice.',
      boundary: 'Runtime boundary practice.',
      repair: 'Runtime repair practice.',
    },
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
  assert.ok(Array.isArray(result.value.timing_windows));
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

test('generateReading succeeds for MingJing relationship_natal when Runtime AI returns a relationship wording patch', async () => {
  let deterministicOutput = null;
  const runtimeClient = new MockRuntimeAiClient({
    canned_patch_by_kind: { mingjing: relationshipWordingPatch() },
    capture: (_kind, request) => {
      deterministicOutput = request.deterministic_output;
    },
  });
  const result = await generateReading(
    {
      id: 'rdg_rel_1',
      created_at: '2026-06-22T00:00:00Z',
      mirror_kind: 'mingjing',
      mirror_scope: SCOPE,
      related_person_refs: [ALICE_REF],
      concern_tag_refs: [],
      cited_reading_ids: [],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      space: relationshipSpace(),
    },
    { runtime_ai_client: runtimeClient, now: NOW },
  );
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) return;
  assert.equal(validateReading(result.reading).ok, true, JSON.stringify(validateReading(result.reading)));
  assert.equal(result.reading.output.output_kind, 'relationship_hepan');
  assert.equal(
    result.reading.output.summary,
    'Runtime AI describes the relationship as a steady structure with clear repair rituals.',
  );
  assert.equal(
    result.reading.output.structure.communication_rhythm,
    'Runtime rhythm wording for short explicit check-ins.',
  );
  assert.equal(result.reading.output.practice.repair, 'Runtime repair practice.');
  assert.ok(deterministicOutput);
  assert.deepEqual(result.reading.output.relationship_subject, deterministicOutput.relationship_subject);
  assert.deepEqual(
    result.reading.output.timing_windows.map((window) => window.driver_refs),
    deterministicOutput.timing_windows.map((window) => window.driver_refs),
  );
  assert.deepEqual(
    result.reading.output.timing_windows.map((window) => window.nature),
    deterministicOutput.timing_windows.map((window) => window.nature),
  );
});

test('generateReading rejects relationship_natal runtime success without wording patch provenance', async () => {
  const runtimeClient = {
    async generate(_mirrorKind, request) {
      return { ok: true, output: request.deterministic_output };
    },
  };
  const result = await generateReading(
    {
      id: 'rdg_rel_seed_returned',
      created_at: '2026-06-22T00:00:00Z',
      mirror_kind: 'mingjing',
      mirror_scope: SCOPE,
      related_person_refs: [ALICE_REF],
      concern_tag_refs: [],
      cited_reading_ids: [],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      space: relationshipSpace(),
    },
    { runtime_ai_client: runtimeClient, now: NOW },
  );
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
    {
      id: 'rdg_rel_forbidden',
      created_at: '2026-06-22T00:00:00Z',
      mirror_kind: 'shijing',
      mirror_scope: SCOPE,
      related_person_refs: [ALICE_REF],
      concern_tag_refs: [],
      cited_reading_ids: [],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      space: relationshipSpace(),
    },
    { runtime_ai_client: runtimeClient, now: NOW },
  );
  assert.equal(result.ok, false);
  assert.equal(result.failure.kind, 'validation_failed');
  assert.equal(result.failure.stage, 'orchestrator');
  assert.match(result.failure.detail ?? '', /mirror_kind_scope_forbidden:shijing:relationship_natal/u);
});

test('generateReading fails closed when selected method cannot produce relationship evidence', async () => {
  const runtimeClient = {
    async generate() {
      throw new Error('runtime client should not be reached for unsupported relationship method');
    },
  };
  const space = relationshipSpace();
  const result = await generateReading(
    {
      id: 'rdg_rel_ziwei_unsupported',
      created_at: '2026-06-22T00:00:00Z',
      mirror_kind: 'mingjing',
      mirror_scope: SCOPE,
      related_person_refs: [ALICE_REF],
      concern_tag_refs: [],
      cited_reading_ids: [],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      space: {
        ...space,
        settings: { ...space.settings, method_profile_id: 'ziwei_sanhe_v1' },
      },
    },
    { runtime_ai_client: runtimeClient, now: NOW },
  );
  assert.equal(result.ok, false);
  assert.equal(result.failure.kind, 'algorithm_fail_closed');
  assert.equal(result.failure.stage, 'mingjing_route_support');
  assert.match(
    result.failure.detail ?? '',
    /mingjing_route_feature_not_supported:mingjing\.route\.ziwei_sanhe_v1:relationship_hepan/u,
  );
});
