// SJG-ALGO-16 — 命镜 natal projection golden + invariants.
//
// Pins the deterministic MingJingChart for a known chart (1990-04-12 08:30 male,
// Asia/Shanghai → 庚午年 庚辰月 丁未日), proves determinism (frozen engine), and
// checks the closed-set / structural invariants the validator also enforces.

import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMingJingProjection } from '../src/product/astrology/mingjing-projection.ts';
import { validateMingJingChart } from '../src/contracts/mingjing-chart-validator.ts';
import { localWallClockToUtcInstant } from '../src/product/astrology/local-wall-clock.ts';

const TZ = 'Asia/Shanghai';

function spaceFor(date, time, sex) {
  const natal = {
    raw_birth_input: {
      calendar_system: 'gregorian',
      local_date_text: date,
      local_time_text: time,
      place_text: 'Shanghai',
    },
    birth_datetime_utc: localWallClockToUtcInstant(`${date}T${time}:00`, TZ).toISOString(),
    birth_precision: 'exact',
    calendar_system: 'gregorian',
    calculation_sex: sex,
    birth_location: { latitude: 31.23, longitude: 121.47, iana_time_zone: TZ, place_name: 'Shanghai' },
  };
  return {
    user_id: 'u',
    self_subject: { natal_inputs: natal },
    persons: [],
    concern_tags: [],
    event_memories: [],
    plan_items: [],
    readings: [],
    conversations: [],
    settings: { ui_language: 'zh', response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' } },
  };
}

test('命镜 projection: golden chart 1990-04-12 08:30 male (丁未日)', () => {
  const r = buildMingJingProjection({ space: spaceFor('1990-04-12', '08:30', 'male'), reference_year: 2026 });
  assert.equal(r.ok, true, JSON.stringify(r));
  const c = r.value;

  // 八字排盘 — reuses the engine interpretation (cross-checks bazi-yongshen golden).
  assert.deepEqual(c.natal_chart.day_pillar, { stem: 'ding', branch: 'wei' });
  assert.equal(c.interpretation.strength.band, '偏弱');
  assert.deepEqual([...c.interpretation.yong_shen.yong].sort(), ['fire', 'wood']); // 身弱用印比(木火)

  // 空亡 — 丁未 ∈ 甲辰旬 → 旬空 寅卯; none of 午/辰/未/辰 is 寅卯.
  assert.equal(c.void.xun, '甲辰');
  assert.deepEqual([...c.void.void_branches].sort(), ['mao', 'yin']);
  assert.deepEqual(c.void.void_positions, []);

  // 格局 — 月令辰 本气戊=伤官, 不透, 通根(辰未皆土) → 伤官格 假成.
  assert.equal(c.pattern.name, '伤官格');
  assert.equal(c.pattern.source, '本气');
  assert.equal(c.pattern.transparent, false);
  assert.equal(c.pattern.rooted, true);
  assert.equal(c.pattern.disposition, '假成');

  // 五行分布 — totals positive, dominant/weakest are real elements.
  const totalCount = ['wood', 'fire', 'earth', 'metal', 'water'].reduce((s, el) => s + c.five_elements.count[el], 0);
  assert.ok(totalCount >= 8, `expected >= 8 element occurrences, got ${totalCount}`);

  // 大运 — 阳年(庚)男 → 顺行; full sequence surfaced.
  assert.equal(c.dayun.direction, 'forward');
  assert.ok(c.dayun.start_age_years > 0);
  assert.ok(c.dayun.periods.length >= 8, `expected >= 8 大运 periods, got ${c.dayun.periods.length}`);
  for (let i = 1; i < c.dayun.periods.length; i += 1) {
    assert.ok(c.dayun.periods[i].start_year > c.dayun.periods[i - 1].start_year, '大运 periods must ascend by year');
  }

  // The whole projection satisfies the structural validator.
  assert.equal(validateMingJingChart(c).ok, true);
});

test('命镜 projection is deterministic (frozen engine — same input, same chart)', () => {
  const space = spaceFor('1990-04-12', '08:30', 'male');
  const a = buildMingJingProjection({ space, reference_year: 2026 });
  const b = buildMingJingProjection({ space, reference_year: 2026 });
  assert.equal(a.ok, true);
  assert.deepEqual(a, b);
});

test('命镜 projection keeps 本气 when only a 比劫 residual stem is transparent', () => {
  const r = buildMingJingProjection({
    space: spaceFor('2026-07-20', '12:00', 'male'),
    reference_year: 2026,
  });

  assert.equal(r.ok, true, JSON.stringify(r));
  const c = r.value;
  assert.deepEqual(c.natal_chart.month_pillar, { stem: 'yi', branch: 'wei' });
  assert.deepEqual(c.natal_chart.day_pillar, { stem: 'yi', branch: 'wei' });
  assert.equal(c.pattern.name, '偏财格');
  assert.equal(c.pattern.ten_god, '偏财');
  assert.equal(c.pattern.source, '本气');
  assert.equal(c.pattern.transparent, false);
  assert.equal(validateMingJingChart(c).ok, true);
});

test('命镜 流年 windows are salient and within the horizon (not a ledger)', () => {
  const r = buildMingJingProjection({
    space: spaceFor('1990-04-12', '08:30', 'male'),
    reference_year: 2026,
    liunian_horizon_years: 12,
  });
  assert.equal(r.ok, true);
  const lj = r.value.liunian;
  assert.deepEqual(lj.horizon, { start_year: 2026, end_year: 2038 });
  assert.ok(lj.windows.length >= 1, 'expected at least one salient window over 12 years');
  // A real ledger would emit ~13 entries; the提炼 surface must stay well under that.
  assert.ok(lj.windows.length <= 8, 'windows should be distilled, not year-by-year');
  for (const w of lj.windows) {
    assert.ok(w.start_year >= 2026 && w.end_year <= 2038, `window ${w.start_year}-${w.end_year} out of horizon`);
    assert.ok(['high', 'medium'].includes(w.salience));
    assert.ok(w.pillars.length >= 1);
    assert.ok(w.basis.length >= 1, 'every salient window must carry its reason');
  }
});

test('命镜 projection fails closed when calculation sex is unspecified', () => {
  const r = buildMingJingProjection({ space: spaceFor('1990-04-12', '08:30', 'unspecified') });
  assert.equal(r.ok, false);
  assert.equal(r.error.kind, 'stage_dayun_calculation_sex_unspecified');
});
