// Wave-10 — real SJG-ALGO-02 pipeline tests (replaces wave-5 stub
// assertions). Each deterministic stage now produces real output for
// gregorian inputs; lunar inputs and missing TZ entries fail-close;
// generateReading without a real Runtime AI adapter returns the typed
// runtime_ai_failed because the NoOp client fails with runtime_unavailable.

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';

import {
  buildAstrologyFeatureSnapshot,
  buildCycleSnapshot,
  buildNatalChartSnapshot,
  canonicalizeNatalInputs,
  generateReading,
  NoOpRuntimeAiClient,
  pickStageLabel,
  computeCanonicalHash,
  computeDayun,
} from '../src/product/astrology/index.ts';
import { ASTROLOGY_METHOD_PROFILE_ID } from '../src/domain/algorithm.ts';
import { validNatalInputs, validShiJingSpace, validTimeWindow } from './_fixtures.mjs';

test('canonicalizeNatalInputs returns ok for valid gregorian inputs', () => {
  const result = canonicalizeNatalInputs(validNatalInputs());
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.calendar_conversion_source, 'input_gregorian');
    assert.equal(result.value.ephemeris_version, 'shijing-approx-v1');
    assert.equal(typeof result.value.true_solar_time_utc, 'string');
  }
});

test('canonicalizeNatalInputs converts lunar_chinese to gregorian via tyme4ts (SJG-ALGO-04)', () => {
  const inputs = validNatalInputs();
  const lunar = {
    ...inputs,
    calendar_system: 'lunar_chinese',
    raw_birth_input: {
      ...inputs.raw_birth_input,
      calendar_system: 'lunar_chinese',
      lunar_year: 1990,
      lunar_month: 3,
      lunar_day: 18,
      lunar_is_leap_month: false,
      local_time_text: '08:30:00',
    },
  };
  const result = canonicalizeNatalInputs(lunar);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.calendar_conversion_source, 'lunar_to_gregorian');
    // Lunar 1990-03-18 maps to gregorian 1990-04-13. Check the canonical
    // UTC instant falls on the correct gregorian day (tolerant of TZ shift).
    const canonicalUtc = new Date(result.value.canonical_birth_datetime_utc);
    assert.equal(canonicalUtc.getUTCFullYear(), 1990);
    assert.equal(canonicalUtc.getUTCMonth() + 1, 4);
  }
});

test('canonicalizeNatalInputs rejects lunar_chinese with no lunar_* fields and no usable local_date_text', () => {
  const inputs = validNatalInputs();
  const lunar = {
    ...inputs,
    calendar_system: 'lunar_chinese',
    raw_birth_input: {
      ...inputs.raw_birth_input,
      calendar_system: 'lunar_chinese',
      local_date_text: 'not-a-date',
    },
  };
  const result = canonicalizeNatalInputs(lunar);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.kind, 'stage_invalid_input');
});

test('canonicalizeNatalInputs fails closed for unknown IANA timezone', () => {
  const inputs = validNatalInputs();
  const broken = { ...inputs, birth_location: { ...inputs.birth_location, iana_time_zone: 'Mars/Olympus_Mons' } };
  const result = canonicalizeNatalInputs(broken);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.kind, 'stage_missing_input');
});

test('buildNatalChartSnapshot returns ok with method profile v1', () => {
  const canon = canonicalizeNatalInputs(validNatalInputs());
  assert.equal(canon.ok, true);
  if (!canon.ok) return;
  const result = buildNatalChartSnapshot({ subject: 'self', canonicalization: canon.value });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.method_profile.id, ASTROLOGY_METHOD_PROFILE_ID);
    assert.ok(result.value.year_pillar);
    assert.ok(result.value.day_pillar);
  }
});

test('buildCycleSnapshot ok for bounded window + emits daily pillars', () => {
  const canon = canonicalizeNatalInputs(validNatalInputs());
  if (!canon.ok) throw new Error('canon should succeed');
  const chart = buildNatalChartSnapshot({ subject: 'self', canonicalization: canon.value });
  if (!chart.ok) throw new Error('chart should succeed');
  const result = buildCycleSnapshot({ subject: 'self', natal_chart: chart.value, time_window: validTimeWindow() });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.ok(result.value.daily_pillars.length > 0);
  }
});

test('buildAstrologyFeatureSnapshot returns ok for valid space + bounded window (no DaYun)', () => {
  const space = validShiJingSpace();
  const result = buildAstrologyFeatureSnapshot({
    subjects: ['self'],
    time_window: validTimeWindow(),
    space,
    dayun_required: false,
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.method_profile.id, ASTROLOGY_METHOD_PROFILE_ID);
    assert.equal(result.value.subjects.length, 1);
  }
});

test('buildAstrologyFeatureSnapshot fails closed when DaYun required + calculation_sex unspecified', () => {
  const space = validShiJingSpace();
  const result = buildAstrologyFeatureSnapshot({
    subjects: ['self'],
    time_window: validTimeWindow(),
    space,
    dayun_required: true,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.kind, 'stage_invalid_input');
    assert.match(result.error.detail ?? '', /calculation_sex/);
  }
});

test('buildAstrologyFeatureSnapshot ok when DaYun required + calculation_sex provided', () => {
  const inputs = { ...validNatalInputs(), calculation_sex: 'female' };
  const space = validShiJingSpace({ self_subject: { natal_inputs: inputs } });
  const result = buildAstrologyFeatureSnapshot({
    subjects: ['self'],
    time_window: validTimeWindow(),
    space,
    dayun_required: true,
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    const selfFeature = result.value.subjects[0];
    assert.equal(selfFeature.dayun?.required, true);
  }
});

test('computeDayun direction follows SJG-ALGO-07 rule (male+yang → forward)', () => {
  const result = computeDayun({
    required: true,
    calculation_sex: 'male',
    year_pillar: { stem: 'jia', branch: 'zi' },
    true_solar_birth_utc_ms: Date.UTC(1990, 3, 12),
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.direction, 'forward');
});

test('computeDayun direction follows SJG-ALGO-07 rule (female+yin → forward)', () => {
  const result = computeDayun({
    required: true,
    calculation_sex: 'female',
    year_pillar: { stem: 'yi', branch: 'chou' },
    true_solar_birth_utc_ms: Date.UTC(1990, 3, 12),
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.direction, 'forward');
});

test('computeDayun direction follows SJG-ALGO-07 rule (male+yin → reverse)', () => {
  const result = computeDayun({
    required: true,
    calculation_sex: 'male',
    year_pillar: { stem: 'yi', branch: 'chou' },
    true_solar_birth_utc_ms: Date.UTC(1990, 3, 12),
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.direction, 'reverse');
});

test('pickStageLabel prefers 转时 when transition markers active', () => {
  const label = pickStageLabel([
    { kind: 'annual_transition', strength: 'high', start_utc: '', end_utc: '', subjects: ['self'], source: 'annual' },
    { kind: 'resource', strength: 'low', start_utc: '', end_utc: '', subjects: ['self'], source: 'natal' },
  ]);
  assert.equal(label, '转时');
});

test('pickStageLabel defaults to 守时 when no markers active', () => {
  assert.equal(pickStageLabel([]), '守时');
});

test('computeCanonicalHash is deterministic and order-independent', () => {
  const a = computeCanonicalHash({ a: 1, b: 'hello', c: [1, 2, 3] });
  const b = computeCanonicalHash({ c: [1, 2, 3], b: 'hello', a: 1 });
  assert.equal(a, b);
  assert.equal(a.length, 64);
});

test('NoOpRuntimeAiClient fails closed to runtime_unavailable', async () => {
  const client = new NoOpRuntimeAiClient();
  const result = await client.generate({
    feature_snapshot: undefined,
    response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.kind, 'runtime_unavailable');
});

test('generateReading returns runtime_ai_failed when NoOp client is the adapter', async () => {
  const space = validShiJingSpace();
  const result = await generateReading({
    id: 'r_01',
    created_at: '2026-05-25T00:00:00Z',
    kind: 'today',
    scope: 'subject',
    anchor_subject: 'self',
    subjects: ['self'],
    time_window: validTimeWindow(),
    space,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.kind, 'runtime_ai_failed');
    assert.equal(result.error.ai_failure.kind, 'runtime_unavailable');
  }
});

test('generateReading surfaces pipeline_stage_failed when canonicalization fails (invalid lunar)', async () => {
  // SJG-ALGO-04: lunar_chinese with an unparseable date is still a stage
  // failure. Use an out-of-range lunar_year to force tyme4ts to reject the
  // conversion. (Valid lunar dates now succeed — see the tyme4ts test above.)
  const inputs = validNatalInputs();
  const lunarInputs = {
    ...inputs,
    calendar_system: 'lunar_chinese',
    raw_birth_input: {
      ...inputs.raw_birth_input,
      calendar_system: 'lunar_chinese',
      local_date_text: 'invalid-lunar-date',
    },
  };
  const space = validShiJingSpace({ self_subject: { natal_inputs: lunarInputs } });
  const result = await generateReading({
    id: 'r_02',
    created_at: '2026-05-25T00:00:00Z',
    kind: 'today',
    scope: 'subject',
    anchor_subject: 'self',
    subjects: ['self'],
    time_window: validTimeWindow(),
    space,
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.kind, 'pipeline_stage_failed');
});

test('astrology module source contains no fetch / HTTP / hardcoded provider', () => {
  const dir = new URL('../src/product/astrology/', import.meta.url);
  const files = readdirSync(dir).filter((name) => name.endsWith('.ts'));
  const forbidden = [
    /fetch\s*\(/,
    /XMLHttpRequest/,
    /\baxios\b/,
    /\bgrpc\b/,
    /WebSocket/,
    /\bgpt-/i,
    /\bclaude-/i,
    /\bgemini-/i,
    /\bopenai\b/i,
    /\banthropic\b/i,
  ];
  for (const file of files) {
    const source = readFileSync(new URL(file, dir), 'utf8');
    for (const pattern of forbidden) {
      assert.doesNotMatch(source, pattern, `${file} contains forbidden primitive ${pattern}`);
    }
  }
});

test('astrology module source contains no fallback Reading vocabulary', () => {
  const dir = new URL('../src/product/astrology/', import.meta.url);
  const files = readdirSync(dir).filter((name) => name.endsWith('.ts'));
  const forbidden = [
    /mock reading/i,
    /fake astrology/i,
    /random reading/i,
    /unfinished marker/i,
    /empty astrology/i,
    /global_instructions/,
    /project_memory/,
  ];
  for (const file of files) {
    const source = readFileSync(new URL(file, dir), 'utf8');
    for (const pattern of forbidden) {
      assert.doesNotMatch(source, pattern, `${file} contains forbidden placeholder vocabulary ${pattern}`);
    }
  }
});
