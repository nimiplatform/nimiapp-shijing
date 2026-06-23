// SJG-ALGO-17 - deterministic self-plus-person Relationship HePan evidence.

import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAstrologyFeatureSnapshot } from '../src/product/astrology/build-feature-snapshot.ts';
import { resolveCanonicalMirrorWindow } from '../src/product/astrology/mirror-window.ts';
import { localWallClockToUtcInstant } from '../src/product/astrology/local-wall-clock.ts';
import {
  relationshipNatalMirrorScope,
  validNatalInputs,
  validPerson,
  validRawBirthInput,
  validShiJingSpace,
} from './_fixtures.mjs';

const TZ = 'Asia/Shanghai';
const REL_SCOPE = relationshipNatalMirrorScope({ anchor_year: 2026 });
const ALICE_REF = { kind: 'person', id: 'p_alice' };
const RELATION_LABELS = new Set(['supporting', 'draining', 'controlling', 'same', 'unknown']);

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

function relationshipSpace(personOverrides = {}) {
  return validShiJingSpace({
    self_subject: { natal_inputs: natalAt('1990-04-12', '08:30', 'male') },
    persons: [
      validPerson('p_alice', {
        display_name: 'Alice',
        natal_inputs: natalAt('1992-11-03', '19:10', 'female'),
        consent_state: 'owner_recorded',
        ...personOverrides,
      }),
    ],
  });
}

function relationshipSnapshot(overrides = {}) {
  return buildAstrologyFeatureSnapshot({
    mirror_kind: 'mingjing',
    mirror_scope: REL_SCOPE,
    space: relationshipSpace(overrides.personOverrides),
    related_person_refs: [ALICE_REF],
    active_concern_tags: [],
    method_profile_id: 'bazi_ziping_v1',
    ...overrides,
  });
}

test('relationship_natal canonical mirror window uses anchor-year window and preserves scope kind', () => {
  const result = resolveCanonicalMirrorWindow(relationshipNatalMirrorScope({ anchor_year: 2026 }));
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.value.scope_kind, 'relationship_natal');
  assert.equal(result.value.start_utc, '2026-01-01T00:00:00Z');
  assert.equal(result.value.end_utc, '2026-12-31T23:59:59Z');
});

test('relationship_natal feature snapshot carries deterministic relationship_hepan evidence', () => {
  const result = relationshipSnapshot();
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.value.common.relationship_hepan.related_person_ref.id, 'p_alice');
  assert.equal(result.value.common.relationship_hepan.display_name_snapshot, 'Alice');
  assert.ok(result.value.common.relationship_hepan.timing_windows.length > 0);
  assert.ok(
    result.value.common.relationship_hepan.timing_windows.every(
      (window) => window.driver_refs.length > 0 && window.driver_refs.every(Boolean),
    ),
  );
});

test('relationship_natal feature snapshot is MingJing-owned', () => {
  const result = relationshipSnapshot({ mirror_kind: 'rijing' });
  assert.equal(result.ok, false);
  assert.equal(result.error.kind, 'stage_invalid_input');
  assert.match(result.error.detail ?? '', /mirror_kind_scope_forbidden:rijing:relationship_natal/u);
});

test('relationship_natal timing windows include both subjects period evidence or explicit fallback', () => {
  const result = relationshipSnapshot();
  assert.equal(result.ok, true, JSON.stringify(result));
  const windows = result.value.common.relationship_hepan.timing_windows;
  assert.ok(
    windows.some((window) =>
      window.driver_refs.some((ref) => ref.includes('self') && /period|fallback/u.test(ref)) &&
      window.driver_refs.some((ref) => ref.includes('person:p_alice') && /period|fallback/u.test(ref)),
    ),
    JSON.stringify(windows, null, 2),
  );
});

test('relationship_natal evidence carries method-backed ten-god relation direction', () => {
  const result = relationshipSnapshot();
  assert.equal(result.ok, true, JSON.stringify(result));
  const relation = result.value.common.relationship_hepan.ten_god_relation;
  assert.ok(relation.driver_ref.length > 0);
  assert.equal(RELATION_LABELS.has(relation.label), true, JSON.stringify(relation));
  assert.equal(relation.label, 'controlling');
  assert.match(relation.driver_ref, /related_day_master\.[a-z]+:guansha->self_day_master\.[a-z]+/u);
  assert.doesNotMatch(relation.driver_ref, /self_day\.|related_day\./u);
});

test('relationship_natal fails closed when related person consent is withheld', () => {
  const result = relationshipSnapshot({ personOverrides: { consent_state: 'withheld' } });
  assert.equal(result.ok, false);
  assert.equal(result.error.kind, 'stage_invalid_input');
  assert.match(result.error.detail ?? '', /consent_withheld/u);
});

test('relationship_natal fails closed when related person ref does not match scope', () => {
  const result = relationshipSnapshot({
    related_person_refs: [{ kind: 'person', id: 'p_bob' }],
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.kind, 'stage_invalid_input');
});

test('relationship_natal fails closed when related person ref is missing', () => {
  const result = relationshipSnapshot({ related_person_refs: [] });
  assert.equal(result.ok, false);
  assert.equal(result.error.kind, 'stage_invalid_input');
});
