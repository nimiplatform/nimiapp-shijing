// 生时校正 — event-based birth-time rectification: the recommended 时辰 genuinely
// aligns with the planted life events, determinism, and the input guards.

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  rectifyBirthTime,
  applyRectifiedBirthTime,
} from '../src/product/astrology/birth-time-rectification.ts';
import { transitPillarsForCivilDate } from '../src/product/astrology/engines/bazi/bazi-calendar.ts';
import { isClashPair } from '../src/product/astrology/branch-relations.ts';

const TZ = 'Asia/Shanghai';

function baseNatal(overrides = {}) {
  return {
    raw_birth_input: { calendar_system: 'gregorian', local_date_text: '1990-04-12', place_text: 'Shanghai' },
    birth_datetime_utc: '1990-04-12T04:00:00Z',
    birth_precision: 'rough_day',
    calendar_system: 'gregorian',
    calculation_sex: 'male',
    birth_location: { latitude: 31.23, longitude: 121.47, iana_time_zone: TZ, place_name: 'Shanghai' },
    ...overrides,
  };
}

function ev(id, year) {
  return {
    id,
    occurred_at: `${year}-06-01T00:00:00Z`,
    body: 'x',
    person_refs: [],
    concern_tag_refs: [],
    source: 'manual',
    admissible_use: 'eligible_for_retrieval',
    created_at: `${year}-06-02T00:00:00Z`,
    updated_at: `${year}-06-02T00:00:00Z`,
  };
}

test('rectification needs at least two in-life events', () => {
  const out = rectifyBirthTime({ natal_inputs: baseNatal(), events: [ev('e1', 2010)] });
  assert.equal(out.ok, false);
  assert.equal(out.reason, 'not_enough_events');
});

test('rectification requires a specified calculation sex', () => {
  const out = rectifyBirthTime({
    natal_inputs: baseNatal({ calculation_sex: 'unspecified' }),
    events: [ev('e1', 2008), ev('e2', 2015)],
  });
  assert.equal(out.ok, false);
  assert.equal(out.reason, 'calculation_sex_unspecified');
});

test('rectification supports gregorian birth dates (v1)', () => {
  const out = rectifyBirthTime({
    natal_inputs: baseNatal({ raw_birth_input: { calendar_system: 'lunar_chinese', local_date_text: '1990-04-12' } }),
    events: [ev('e1', 2008), ev('e2', 2015)],
  });
  assert.equal(out.ok, false);
  assert.equal(out.reason, 'calendar_not_gregorian');
});

test('the recommended 时辰 is the one whose 时支 the event 流年 repeatedly 冲', () => {
  // 午时's 时支 (午) is 冲'd by 子 years. Plant events in 子 years → the 午 candidate
  // is the only one whose 时支 is hit, so it must win clearly.
  const targetBranch = 'wu';
  const clashYears = [];
  for (let y = 2000; y <= 2055 && clashYears.length < 3; y += 1) {
    if (isClashPair(transitPillarsForCivilDate(y, 6, 1).year.branch, targetBranch)) clashYears.push(y);
  }
  assert.ok(clashYears.length >= 2, 'need at least two 冲-午 years');
  const events = clashYears.map((y, i) => ev(`c${i}`, y));

  const out = rectifyBirthTime({ natal_inputs: baseNatal(), events });
  assert.equal(out.ok, true);
  const target = out.result.candidates.find((c) => c.hour_branch === targetBranch);
  assert.ok(target, 'expected a 午时 (wu) candidate');

  const maxFit = Math.max(...out.result.candidates.map((c) => c.fit_score));
  assert.equal(target.fit_score, maxFit, 'the 时支-冲 candidate should score highest');
  assert.ok(
    target.aligned_events.every((a) => a.hour_interaction === '相冲'),
    'every planted event should 冲 the 午 时支',
  );
  // Clear separation → a recommendation, and it is the 午 candidate.
  assert.ok(out.result.recommended, 'strong separation should surface a recommendation');
  assert.equal(out.result.recommended.hour_branch, targetBranch);
});

test('rectification is deterministic', () => {
  const events = [ev('a', 2008), ev('b', 2016), ev('c', 2022)];
  const a = rectifyBirthTime({ natal_inputs: baseNatal(), events });
  const b = rectifyBirthTime({ natal_inputs: baseNatal(), events });
  assert.deepEqual(a, b);
});

test('adopting a candidate corrects the natal inputs to an exact birth time', () => {
  const corrected = applyRectifiedBirthTime(baseNatal(), '12:00');
  assert.ok(corrected);
  assert.equal(corrected.birth_precision, 'exact');
  assert.equal(corrected.raw_birth_input.local_time_text, '12:00');
  assert.match(corrected.birth_datetime_utc, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
});
