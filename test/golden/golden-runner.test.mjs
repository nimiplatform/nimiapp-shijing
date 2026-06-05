// Wave 1 — BaZi golden regression harness.
//
// Locks the deterministic 八字 engine against known-correct four pillars / DaYun
// for a fixed set of births, including the boundary cases the retired approximate
// engine got wrong. A drift here = a calendar/adapter regression. Each `expect`
// value was verified by hand against the 万年历 (e.g. 2000-01-07 = 甲子 day;
// 2025-02-04 06:00 is AFTER 立春 → 乙巳 year, which the old fixed-date engine
// mis-assigned to 甲辰).
//
// Bless workflow: run with GOLDEN_BLESS=1 to print actuals, re-verify the
// anchors, then update `expect`.

import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAstrologyFeatureSnapshot } from '../../src/product/astrology/build-feature-snapshot.ts';
import { localWallClockToUtcInstant } from '../../src/product/astrology/local-wall-clock.ts';
import { validConcernTag } from '../_fixtures.mjs';

const STEM_CN = { jia: '甲', yi: '乙', bing: '丙', ding: '丁', wu: '戊', ji: '己', geng: '庚', xin: '辛', ren: '壬', gui: '癸' };
const BRANCH_CN = { zi: '子', chou: '丑', yin: '寅', mao: '卯', chen: '辰', si: '巳', wu: '午', wei: '未', shen: '申', you: '酉', xu: '戌', hai: '亥' };
const pillarCn = (p) => (p ? `${STEM_CN[p.stem]}${BRANCH_CN[p.branch]}` : null);

const LON = 121.4737, LAT = 31.2304, TZ = 'Asia/Shanghai';

// Each `expect` locks ONLY the keys it lists (boundary cases lock the pillar that
// matters for that boundary). hour: null asserts the pillar is absent.
const CASES = [
  { id: 'ref_2000_jiazi', date: '2000-01-07', time: '12:00', sex: 'male', precision: 'exact', forceDayun: true,
    note: '2000-01-07 is the canonical 甲子 day reference; noon → 午时',
    expect: { year: '己卯', month: '丁丑', day: '甲子', hour: '庚午', day_master: '甲', dayun_direction: 'reverse' } },
  { id: 'sample_1990', date: '1990-04-12', time: '08:30', sex: 'male', precision: 'exact', forceDayun: true,
    expect: { year: '庚午', month: '庚辰', day: '丁未', hour: '甲辰', day_master: '丁', dayun_direction: 'forward' } },
  { id: 'lichun_before_2025', date: '2025-02-03', time: '06:00', sex: 'male', precision: 'exact', forceDayun: true,
    note: 'before 立春 2025 (~Feb 3 22:10 Beijing) → still 甲辰 year, 丑 month',
    expect: { year: '甲辰', month: '丁丑' } },
  { id: 'lichun_after_2025', date: '2025-02-04', time: '06:00', sex: 'male', precision: 'exact', forceDayun: true,
    note: 'after 立春 2025 → 乙巳 year / 戊寅 month — the case the old fixed-date engine mis-assigned',
    expect: { year: '乙巳', month: '戊寅' } },
  { id: 'zi_late_2025', date: '2025-06-05', time: '23:30', sex: 'male', precision: 'exact', forceDayun: true,
    note: '晚子时: 23:30 rolls the day forward (乙巳日 → 丙午日), 子时',
    expect: { day: '丙午', hour: '戊子' } },
  { id: 'dst_1988', date: '1988-07-15', time: '10:00', sex: 'male', precision: 'exact', forceDayun: true,
    note: 'China observed DST in 1988; year/month are robust to the ±1h',
    expect: { year: '戊辰', month: '己未' } },
  { id: 'female_reverse_1990', date: '1990-04-12', time: '08:30', sex: 'female', precision: 'exact', forceDayun: true,
    note: 'same chart as sample_1990 but female → reverse DaYun',
    expect: { year: '庚午', day: '丁未', day_master: '丁', dayun_direction: 'reverse' } },
  { id: 'rough_day_1990', date: '1990-04-12', time: '12:00', sex: 'male', precision: 'rough_day', forceDayun: false,
    note: 'rough_day omits the hour pillar (SJG-ALGO-10)',
    expect: { year: '庚午', month: '庚辰', day: '丁未', hour: null, day_master: '丁', missing: ['hour'] } },
];

function buildCaseSnapshot(c) {
  // birth_datetime_utc is a genuine UTC instant — exactly what the real UI
  // (buildSelfNatalInputs → localWallClockToUtcInstant) stores. canonicalize then
  // converts it back to the local wall clock (adding the zone offset) and applies
  // the true-solar correction. (An earlier naive wall-clock-as-Z value here masked
  // the true-solar timezone-offset bug — see audit P0.)
  const natal = {
    raw_birth_input: { calendar_system: 'gregorian', local_date_text: c.date, local_time_text: c.time, place_text: 'Shanghai' },
    birth_datetime_utc: localWallClockToUtcInstant(`${c.date}T${c.time}:00`, TZ).toISOString(),
    birth_precision: c.precision,
    calendar_system: 'gregorian',
    calculation_sex: c.sex,
    birth_location: { latitude: LAT, longitude: LON, iana_time_zone: TZ, place_name: 'Shanghai' },
  };
  const space = {
    user_id: 'u_golden',
    self_subject: { natal_inputs: natal },
    persons: [], concern_tags: [], event_memories: [], plan_items: [], readings: [], conversations: [],
    settings: { response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' } },
  };
  return buildAstrologyFeatureSnapshot({
    mirror_kind: 'rijing',
    mirror_scope: { kind: 'daily', date: '2026-06-05', basis_time_zone: TZ },
    space,
    related_person_refs: [],
    active_concern_tags: [validConcernTag('tag_love')],
    dayun_required_override: c.forceDayun,
  });
}

for (const c of CASES) {
  test(`golden: ${c.id}${c.note ? ` — ${c.note}` : ''}`, () => {
    const result = buildCaseSnapshot(c);
    assert.equal(result.ok, true, JSON.stringify(result));
    if (!result.ok) return;
    const ev = result.value.method_evidence;
    assert.equal(ev.method_id, 'bazi_ziping_v1');
    const chart = ev.bazi.self_subject.natal_chart;
    const dayun = ev.bazi.self_subject.dayun;
    const actual = {
      year: pillarCn(chart.year_pillar), month: pillarCn(chart.month_pillar),
      day: pillarCn(chart.day_pillar), hour: pillarCn(chart.hour_pillar),
      day_master: chart.day_master ? STEM_CN[chart.day_master] : null,
      missing: chart.missing_pillars, dayun_direction: dayun?.direction ?? null,
    };
    if (process.env.GOLDEN_BLESS) {
      console.log(c.id, JSON.stringify({ ...actual, dayun_start_age: dayun?.start_age_years ?? null }));
      return;
    }
    for (const [key, want] of Object.entries(c.expect)) {
      if (key === 'missing') {
        assert.deepEqual([...actual.missing].sort(), [...want].sort(), `${c.id} missing_pillars`);
      } else {
        assert.equal(actual[key], want, `${c.id} ${key}`);
      }
    }
  });
}
