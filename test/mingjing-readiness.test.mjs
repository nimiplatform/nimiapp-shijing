// SJG-IA-05 / SJG-IA-08 — 命镜 readiness gating.

import assert from 'node:assert/strict';
import test from 'node:test';
import { mingJingReadiness } from '../src/product/tabs/mingjing/mingjing-readiness.ts';
import { localWallClockToUtcInstant } from '../src/product/astrology/local-wall-clock.ts';

const TZ = 'Asia/Shanghai';

function spaceFor(sex, overrides = {}) {
  const natal = {
    raw_birth_input: { calendar_system: 'gregorian', local_date_text: '1990-04-12', local_time_text: '08:30', place_text: 'Shanghai' },
    birth_datetime_utc: localWallClockToUtcInstant('1990-04-12T08:30:00', TZ).toISOString(),
    birth_precision: 'exact',
    calendar_system: 'gregorian',
    calculation_sex: sex,
    birth_location: { latitude: 31.23, longitude: 121.47, iana_time_zone: TZ, place_name: 'Shanghai' },
    ...overrides,
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

test('readiness ok for an exact birth with a specified calculation sex', () => {
  const r = mingJingReadiness(spaceFor('male'));
  assert.equal(r.ok, true, JSON.stringify(r));
});

test('readiness blocks an unspecified calculation sex (DaYun direction)', () => {
  const r = mingJingReadiness(spaceFor('unspecified'));
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'calculation_sex_unspecified_for_dayun');
});

test('readiness blocks an unknown birth precision', () => {
  const r = mingJingReadiness(spaceFor('male', { birth_precision: 'unknown' }));
  assert.equal(r.ok, false);
});
