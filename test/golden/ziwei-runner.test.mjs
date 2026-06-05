// Wave 3 — 紫微斗数 golden regression harness + cross-engine architecture test.
//
// Locks the 紫微 engine against iztro-derived values (命宫位置, 五行局, 命主/身主,
// 命宫主星 + 生年四化, 命宫大限) for fixed births, and proves the architecture:
// the SAME orchestrator produces a 八字 envelope and a 紫微 envelope for the same
// birth, each discriminated correctly, with the agnostic common surface populated
// by both.
//
// Bless workflow: run with GOLDEN_BLESS=1 to print actuals, then update `expect`.

import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAstrologyFeatureSnapshot } from '../../src/product/astrology/build-feature-snapshot.ts';
import { localWallClockToUtcInstant } from '../../src/product/astrology/local-wall-clock.ts';
import { validConcernTag } from '../_fixtures.mjs';

const LON = 121.4737, LAT = 31.2304, TZ = 'Asia/Shanghai';

const CASES = [
  { id: 'z_sample_male', date: '1990-04-12', time: '08:30', sex: 'male',
    expect: { five_elements_class: '火六局', soul_star: '贪狼', body_star: '火星', soul_palace_branch: '子', ming_stars: ['太阳'], ming_mutagen: ['禄'], ming_decadal: [6, 15] } },
  { id: 'z_sample_female', date: '1990-04-12', time: '08:30', sex: 'female',
    note: '命宫 placement is sex-independent; 大限 direction differs',
    expect: { five_elements_class: '火六局', soul_palace_branch: '子', ming_stars: ['太阳'] } },
  { id: 'z_2000_noon', date: '2000-01-07', time: '12:00', sex: 'male',
    note: '命宫 is an empty palace (空宫, borrows 对宫)',
    expect: { five_elements_class: '土五局', soul_star: '武曲', body_star: '天同', soul_palace_branch: '未', ming_stars: [], ming_decadal: [5, 14] } },
  { id: 'z_zi_late', date: '2025-06-05', time: '23:30', sex: 'male',
    note: '晚子时 → next-day 命宫 placement (命宫支 午)',
    expect: { five_elements_class: '木三局', soul_star: '破军', soul_palace_branch: '午', ming_stars: ['七杀'], ming_decadal: [3, 12] } },
];

function buildZiwei(c, mirror = { kind: 'daily', date: '2026-06-05', basis_time_zone: TZ }, mirrorKind = 'rijing') {
  const natal = {
    raw_birth_input: { calendar_system: 'gregorian', local_date_text: c.date, local_time_text: c.time, place_text: 'Shanghai' },
    birth_datetime_utc: localWallClockToUtcInstant(`${c.date}T${c.time}:00`, TZ).toISOString(),
    birth_precision: 'exact', calendar_system: 'gregorian', calculation_sex: c.sex,
    birth_location: { latitude: LAT, longitude: LON, iana_time_zone: TZ, place_name: 'Shanghai' },
  };
  const space = {
    user_id: 'u_golden', self_subject: { natal_inputs: natal },
    persons: [], concern_tags: [], event_memories: [], plan_items: [], readings: [], conversations: [],
    settings: { response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' }, method_profile_id: 'ziwei_sanhe_v1' },
  };
  return buildAstrologyFeatureSnapshot({ mirror_kind: mirrorKind, mirror_scope: mirror, space, related_person_refs: [], active_concern_tags: [validConcernTag('tag_career', { parsed_topics: ['career'], prompt_text: 'career' })] });
}

for (const c of CASES) {
  test(`ziwei golden: ${c.id}${c.note ? ` — ${c.note}` : ''}`, () => {
    const result = buildZiwei(c);
    assert.equal(result.ok, true, JSON.stringify(result));
    if (!result.ok) return;
    assert.equal(result.value.method_evidence.method_id, 'ziwei_sanhe_v1');
    const self = result.value.method_evidence.ziwei.self_subject;
    const ming = self.palaces.find((p) => p.is_soul);
    const actual = {
      five_elements_class: self.five_elements_class,
      soul_star: self.soul_star, body_star: self.body_star,
      soul_palace_branch: self.soul_palace_branch,
      ming_stars: ming?.major_stars.map((s) => s.name),
      ming_mutagen: ming?.major_stars.map((s) => s.mutagen).filter(Boolean),
      ming_decadal: [ming?.decadal_start_age, ming?.decadal_end_age],
    };
    if (process.env.GOLDEN_BLESS) { console.log(c.id, JSON.stringify(actual)); return; }
    for (const [k, want] of Object.entries(c.expect)) {
      if (Array.isArray(want)) assert.deepEqual(actual[k], want, `${c.id} ${k}`);
      else assert.equal(actual[k], want, `${c.id} ${k}`);
    }
  });
}

// --- Architecture validation: same birth, two engines, one shared surface ---
test('cross-engine: same birth generates 八字 and 紫微 envelopes on the shared common surface', () => {
  const natal = {
    raw_birth_input: { calendar_system: 'gregorian', local_date_text: '1990-04-12', local_time_text: '08:30', place_text: 'Shanghai' },
    birth_datetime_utc: localWallClockToUtcInstant('1990-04-12T08:30:00', TZ).toISOString(), birth_precision: 'exact', calendar_system: 'gregorian', calculation_sex: 'male',
    birth_location: { latitude: LAT, longitude: LON, iana_time_zone: TZ, place_name: 'Shanghai' },
  };
  const baseSpace = {
    user_id: 'u', self_subject: { natal_inputs: natal }, persons: [], concern_tags: [], event_memories: [], plan_items: [], readings: [], conversations: [],
    settings: { response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' } },
  };
  const scope = { kind: 'long_horizon', start_date: '2026-01-01', end_date: '2035-12-31', basis_time_zone: TZ };
  const tag = validConcernTag('tag_career', { parsed_topics: ['career'], prompt_text: 'career' });
  const args = { mirror_kind: 'nianjing', mirror_scope: scope, related_person_refs: [], active_concern_tags: [tag] };

  const bazi = buildAstrologyFeatureSnapshot({ ...args, space: baseSpace });
  const ziwei = buildAstrologyFeatureSnapshot({ ...args, space: { ...baseSpace, settings: { ...baseSpace.settings, method_profile_id: 'ziwei_sanhe_v1' } } });

  assert.equal(bazi.ok, true, JSON.stringify(bazi));
  assert.equal(ziwei.ok, true, JSON.stringify(ziwei));
  if (!bazi.ok || !ziwei.ok) return;

  // Distinct engines, distinct evidence, but the SAME envelope shape.
  assert.equal(bazi.value.method_profile.id, 'bazi_ziping_v1');
  assert.equal(ziwei.value.method_profile.id, 'ziwei_sanhe_v1');
  assert.equal(bazi.value.method_evidence.method_id, 'bazi_ziping_v1');
  assert.equal(ziwei.value.method_evidence.method_id, 'ziwei_sanhe_v1');
  assert.ok('bazi' in bazi.value.method_evidence);
  assert.ok('ziwei' in ziwei.value.method_evidence);

  // Both populate the agnostic common surface the LLM/UI consume.
  for (const snap of [bazi.value, ziwei.value]) {
    assert.ok(snap.common.nianjing_phase_drivers.length > 0, 'phase bands present');
    assert.ok(snap.common.nianjing_inflection_drivers.length > 0, 'inflections present');
    assert.ok(snap.common.stage_drivers.length > 0, 'stage drivers present');
    for (const phase of snap.common.nianjing_phase_drivers) {
      assert.ok(['supportive', 'steady', 'watch', 'blocked', 'turning'].includes(phase.nature));
    }
  }
});
