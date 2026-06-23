// SJG-ALGO-16 — MingJingChart structural validator.

import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMingJingProjection } from '../src/product/astrology/mingjing-projection.ts';
import { validateMingJingChart } from '../src/contracts/mingjing-chart-validator.ts';
import { localWallClockToUtcInstant } from '../src/product/astrology/local-wall-clock.ts';

const TZ = 'Asia/Shanghai';

function validChart() {
  const natal = {
    raw_birth_input: { calendar_system: 'gregorian', local_date_text: '1990-04-12', local_time_text: '08:30', place_text: 'Shanghai' },
    birth_datetime_utc: localWallClockToUtcInstant('1990-04-12T08:30:00', TZ).toISOString(),
    birth_precision: 'exact',
    calendar_system: 'gregorian',
    calculation_sex: 'male',
    birth_location: { latitude: 31.23, longitude: 121.47, iana_time_zone: TZ, place_name: 'Shanghai' },
  };
  const space = {
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
  const r = buildMingJingProjection({ space, reference_year: 2026 });
  assert.equal(r.ok, true, JSON.stringify(r));
  return r.value;
}

test('validator accepts a real projection', () => {
  assert.equal(validateMingJingChart(validChart()).ok, true);
});

test('validator rejects too-few 大运 periods', () => {
  const chart = validChart();
  const bad = { ...chart, dayun: { ...chart.dayun, periods: chart.dayun.periods.slice(0, 3) } };
  const r = validateMingJingChart(bad);
  assert.equal(r.ok, false);
  assert.equal(r.error.code, 'mingjing_dayun_too_few_periods');
});

test('validator rejects unordered 大运 periods', () => {
  const chart = validChart();
  const bad = { ...chart, dayun: { ...chart.dayun, periods: [...chart.dayun.periods].reverse() } };
  const r = validateMingJingChart(bad);
  assert.equal(r.ok, false);
  assert.equal(r.error.code, 'mingjing_dayun_periods_unordered');
});

test('validator rejects a malformed 空亡 (must be exactly two branches)', () => {
  const chart = validChart();
  const bad = { ...chart, void: { ...chart.void, void_branches: ['yin'] } };
  const r = validateMingJingChart(bad);
  assert.equal(r.ok, false);
  assert.equal(r.error.code, 'mingjing_void_branch_count_invalid');
});

test('validator rejects an out-of-set 格局 name', () => {
  const chart = validChart();
  const bad = { ...chart, pattern: { ...chart.pattern, name: '怪格' } };
  const r = validateMingJingChart(bad);
  assert.equal(r.ok, false);
  assert.equal(r.error.code, 'mingjing_pattern_name_invalid');
});

test('validator rejects a 流年 window outside the horizon', () => {
  const chart = validChart();
  const bad = {
    ...chart,
    liunian: {
      ...chart.liunian,
      windows: [
        {
          start_year: 1900,
          end_year: 1901,
          pillars: [{ year: 1900, pillar: { stem: 'jia', branch: 'zi' } }],
          nature: 'steady',
          favor: '平',
          salience: 'medium',
          natal_branch_relations: [],
          basis: ['x'],
        },
      ],
    },
  };
  const r = validateMingJingChart(bad);
  assert.equal(r.ok, false);
  assert.equal(r.error.code, 'mingjing_liunian_window_range_invalid');
});
