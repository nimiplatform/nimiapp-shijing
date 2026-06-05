// Audit P0 regression — the real UI input path must produce the correct 时柱.
//
// The bug: canonicalize/true-solar dropped the timezone offset, so the genuine
// UTC instant the UI stores (Shanghai 08:30 → 00:30Z) was read as a local wall
// clock → 子时 instead of 辰时. The engine + fixtures were internally consistent
// on a *naive* wall-clock-as-Z convention, which the real producer never uses —
// so the bug was invisible to every existing test. This goes through the real
// producer (buildSelfNatalInputs) end to end.

import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSelfNatalInputs } from '../../src/product/self/self-editor-state.ts';
import { canonicalizeNatalInputs } from '../../src/product/astrology/canonicalize-natal-inputs.ts';
import { buildBaziNatalChart } from '../../src/product/astrology/engines/bazi/bazi-natal.ts';

function draft(overrides = {}) {
  return {
    calendar_system: 'gregorian',
    local_date_text: '1990-04-12', local_time_text: '08:30', place_text: 'Shanghai',
    lunar_year: '', lunar_month: '', lunar_day: '', lunar_is_leap_month: 'unanswered',
    birth_datetime_utc: '', birth_precision: 'exact', calculation_sex: 'male', cultural_marker: '',
    latitude: '31.2304', longitude: '121.4737', iana_time_zone: 'Asia/Shanghai', place_name: 'Shanghai',
    notes: '', ...overrides,
  };
}

test('real UI path: 08:30 Shanghai → 丁未 day, 甲辰 hour (辰时, not the 子时 P0 bug)', () => {
  const built = buildSelfNatalInputs(draft());
  assert.equal(built.ok, true, JSON.stringify(built));
  // The UI derives a GENUINE UTC instant, not a naive wall-clock-as-Z.
  assert.equal(built.inputs.birth_datetime_utc, '1990-04-12T00:30:00.000Z');

  const canon = canonicalizeNatalInputs(built.inputs);
  assert.equal(canon.ok, true, JSON.stringify(canon));
  const chart = buildBaziNatalChart('self', canon.value);
  assert.equal(chart.ok, true, JSON.stringify(chart));

  // External 万年历 oracle: 庚午 庚辰 丁未 甲辰
  assert.equal(chart.value.day_pillar.stem, 'ding');
  assert.equal(chart.value.day_pillar.branch, 'wei');
  assert.equal(chart.value.hour_pillar.stem, 'jia'); // 甲
  assert.equal(chart.value.hour_pillar.branch, 'chen'); // 辰 — the P0 bug produced 'zi' (庚子)
});

test('real UI path: noon 2000-01-07 Shanghai → 甲子 day, 庚午 hour', () => {
  const built = buildSelfNatalInputs(draft({ local_date_text: '2000-01-07', local_time_text: '12:00' }));
  assert.equal(built.ok, true);
  const canon = canonicalizeNatalInputs(built.inputs);
  const chart = buildBaziNatalChart('self', canon.value);
  assert.equal(chart.value.day_pillar.stem, 'jia');
  assert.equal(chart.value.day_pillar.branch, 'zi');
  assert.equal(chart.value.hour_pillar.branch, 'wu'); // 午时 at noon, not 寅时
});
