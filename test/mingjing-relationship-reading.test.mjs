// SJG-ASTRO-13 - MingJing relationship generator and Reading routing.

import assert from 'node:assert/strict';
import test from 'node:test';

import { validateMirrorOutput } from '../src/contracts/mirror-output-validator.ts';
import { buildAstrologyFeatureSnapshot } from '../src/product/astrology/build-feature-snapshot.ts';
import { generateReading } from '../src/product/astrology/generate-reading.ts';
import { generateMingJingRelationshipOutput } from '../src/product/astrology/mingjing-relationship-generator.ts';
import { localWallClockToUtcInstant } from '../src/product/astrology/local-wall-clock.ts';
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

test('generateReading routes relationship_natal to deterministic output then fails closed at unsupported Runtime AI wording', async () => {
  const runtimeClient = {
    async generate() {
      throw new Error('runtime client should not be reached before Wave 4 prompt support');
    },
  };
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
  assert.equal(result.ok, false);
  assert.equal(result.failure.kind, 'runtime_ai_failed');
  assert.match(result.failure.detail ?? '', /relationship.*runtime.*not.*supported|relationship_hepan_runtime_ai_prompt_not_supported/u);
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
  assert.equal(result.failure.kind, 'pipeline_stage_failed');
  assert.equal(result.failure.stage, 'build_feature_snapshot');
  assert.match(result.failure.detail ?? '', /relationship_hepan.*method.*not_supported|unsupported_method/u);
});
