// Wave 2 — 八字 interpretive layer golden + CP2 correctness.
//
// Locks the 十神/纳音/旺衰/用神 derivation, and proves the core 命理 invariant
// (CP2): the SAME 财 element transit yields a favourable tendency for a 身强 chart
// and an unfavourable one for a 身弱 chart — i.e. tendency is 用神-driven, not a
// fixed lookup. This is the difference between a 干支 calculator and a 命理 engine.

import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAstrologyFeatureSnapshot } from '../../src/product/astrology/build-feature-snapshot.ts';
import { baziDomainTendency } from '../../src/product/astrology/engines/bazi/bazi-tendency.ts';
import { buildRuntimeAiPromptRequest } from '../../src/product/astrology/runtime-ai-prompt.ts';
import { localWallClockToUtcInstant } from '../../src/product/astrology/local-wall-clock.ts';
import { validConcernTag } from '../_fixtures.mjs';

const TZ = 'Asia/Shanghai';

function buildSnapshot(date, time, sex) {
  const natal = {
    raw_birth_input: { calendar_system: 'gregorian', local_date_text: date, local_time_text: time, place_text: 'Shanghai' },
    birth_datetime_utc: localWallClockToUtcInstant(`${date}T${time}:00`, TZ).toISOString(), birth_precision: 'exact', calendar_system: 'gregorian', calculation_sex: sex,
    birth_location: { latitude: 31.23, longitude: 121.47, iana_time_zone: TZ, place_name: 'Shanghai' },
  };
  const space = {
    user_id: 'u', self_subject: { natal_inputs: natal }, persons: [], concern_tags: [], event_memories: [], plan_items: [], readings: [], conversations: [],
    settings: { response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' } },
  };
  const r = buildAstrologyFeatureSnapshot({
    mirror_kind: 'rijing', mirror_scope: { kind: 'daily', date: '2026-06-05', basis_time_zone: TZ },
    space, related_person_refs: [], active_concern_tags: [validConcernTag('t', { parsed_topics: ['general'], prompt_text: 'x' })],
  });
  assert.equal(r.ok, true, JSON.stringify(r));
  return r.value;
}

function selfSubject(date, time, sex) {
  return buildSnapshot(date, time, sex).method_evidence.bazi.self_subject;
}

test('bazi interpretation: 十神 / 纳音 / 旺衰 / 用神 for the sample chart (1990-04-12 丁未)', () => {
  const it = selfSubject('1990-04-12', '08:30', 'male').interpretation;
  const byPos = Object.fromEntries(it.pillars.map((p) => [p.position, p]));
  assert.equal(byPos.day.ten_god, '比肩'); // 日柱 → 日主
  assert.equal(byPos.year.ten_god, '正财'); // 庚 is 正财 to 丁
  assert.equal(byPos.year.nayin, '路旁土'); // 庚午 纳音
  assert.equal(byPos.day.hidden_stems[0].stem, 'ji'); // 未 本气 己
  assert.equal(byPos.day.hidden_stems[0].weight_class, 'primary');
  assert.equal(it.strength.band, '偏弱');
  assert.deepEqual([...it.yong_shen.yong].sort(), ['fire', 'wood']); // 身弱用印比 (木火)
  assert.deepEqual([...it.yong_shen.ji].sort(), ['earth', 'metal', 'water']); // 忌克泄耗
});

test('bazi 旺衰: 极强 and 极弱 charts classify on opposite ends', () => {
  assert.equal(selfSubject('1986-09-20', '10:00', 'male').interpretation.strength.band, '极强');
  assert.equal(selfSubject('1980-12-20', '02:00', 'female').interpretation.strength.band, '极弱');
});

test('CP2: same 财 element transit → 身强 favourable, 身弱 unfavourable (用神-driven)', () => {
  const strong = selfSubject('1986-09-20', '10:00', 'male'); // 极强, 财(metal) ∈ 用神
  const weak = selfSubject('1980-12-20', '02:00', 'female'); // 极弱, 财(metal) ∈ 忌神
  // both day masters are 丁 → 财 = metal for both
  assert.equal(strong.natal_chart.day_pillar.stem, 'ding');
  assert.equal(weak.natal_chart.day_pillar.stem, 'ding');
  assert.ok(strong.interpretation.yong_shen.yong.includes('metal'), '身强: 财(metal) 是用神');
  assert.ok(weak.interpretation.yong_shen.ji.includes('metal'), '身弱: 财(metal) 是忌神');

  const wealthTag = validConcernTag('tw', { label: '#财富', parsed_topics: ['wealth'], prompt_text: 'wealth 财富' });
  const metalTransit = { stem: 'geng', branch: 'shen' }; // 庚申 — 财 to 丁, no 冲提纲
  const call = (s, sex) => baziDomainTendency({
    tag: wealthTag, yong: s.interpretation.yong_shen, transitDayPillar: metalTransit,
    natalDayBranch: s.natal_chart.day_pillar.branch, dayMaster: s.natal_chart.day_pillar.stem,
    monthBranch: s.natal_chart.month_pillar.branch, calculationSex: sex, dateLabel: '2026-06-05',
  }).tendency;

  const tStrong = call(strong, 'male');
  const tWeak = call(weak, 'female');
  assert.ok(['supportive', 'steady'].includes(tStrong), `身强 expected favourable, got ${tStrong}`);
  assert.ok(['watch', 'blocked'].includes(tWeak), `身弱 expected unfavourable, got ${tWeak}`);
  assert.notEqual(tStrong, tWeak);
});

test('wording prompt is grounded in the interpretive evidence projection (SJG-ALGO-13)', () => {
  const snapshot = buildSnapshot('1990-04-12', '08:30', 'male');
  const request = buildRuntimeAiPromptRequest({
    mirror_kind: 'rijing',
    feature_snapshot: snapshot,
    mirror_context: {
      mirror_kind: 'rijing', mirror_scope: { kind: 'daily', date: '2026-06-05', basis_time_zone: TZ },
      active_concern_tags: [], resolved_person_refs: [], cited_event_memory_refs: [], cited_plan_item_refs: [], response_preferences_hash: 'h',
    },
    deterministic_output: {
      mirror_kind: 'rijing', summary: 's', daily_overview: 'd', concern_projections: [],
      cited_event_memory_refs: [], cited_plan_item_refs: [], citations: [{ method: 'bazi_ziping_v1', reference: 'r' }],
    },
    response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
  });
  assert.ok(request.user_prompt.includes('interpretive_evidence (bazi_ziping_v1'), 'projection present');
  assert.ok(request.user_prompt.includes('用神:'), '用神 grounding present');
  assert.ok(request.user_prompt.includes('旺衰:'), '旺衰 grounding present');
  assert.ok(request.system_prompt.includes('interpretive_evidence'), 'system preamble references the read-only evidence');
});
