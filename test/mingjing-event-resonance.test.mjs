// SJG-ALGO-16 / 历史事件验证 — deterministic event resonance overlay.

import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMingJingProjection } from '../src/product/astrology/mingjing-projection.ts';
import { computeEventResonance } from '../src/product/astrology/engines/bazi/bazi-event-resonance.ts';
import { localWallClockToUtcInstant } from '../src/product/astrology/local-wall-clock.ts';

const TZ = 'Asia/Shanghai';

function chart() {
  const space = {
    user_id: 'u',
    self_subject: {
      natal_inputs: {
        raw_birth_input: { calendar_system: 'gregorian', local_date_text: '1990-04-12', local_time_text: '08:30', place_text: 'Shanghai' },
        birth_datetime_utc: localWallClockToUtcInstant('1990-04-12T08:30:00', TZ).toISOString(),
        birth_precision: 'exact',
        calendar_system: 'gregorian',
        calculation_sex: 'male',
        birth_location: { latitude: 31.23, longitude: 121.47, iana_time_zone: TZ, place_name: 'Shanghai' },
      },
    },
    persons: [], concern_tags: [], event_memories: [], plan_items: [], readings: [], conversations: [],
    settings: { ui_language: 'zh', response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' } },
  };
  const r = buildMingJingProjection({ space, reference_year: 2026 });
  assert.equal(r.ok, true);
  return r.value;
}

function event(id, occurredAt) {
  return {
    id,
    occurred_at: occurredAt,
    body: 'x',
    person_refs: [],
    concern_tag_refs: [],
    source: 'manual',
    admissible_use: 'eligible_for_retrieval',
    created_at: occurredAt,
    updated_at: occurredAt,
  };
}

test('event resonance maps each event year onto the DaYun period covering it', () => {
  const c = chart();
  const resonance = computeEventResonance(c, [event('e1', '2015-03-20T00:00:00Z'), event('e2', '2024-11-01T00:00:00Z')]);
  assert.equal(resonance.length, 2);

  for (const r of resonance) {
    if (r.dayun_pillar) {
      // The reported 大运 must be the period whose [start_year,end_year] covers the event.
      const period = c.dayun.periods.find((p) => p.pillar.stem === r.dayun_pillar.stem && p.pillar.branch === r.dayun_pillar.branch);
      assert.ok(period, 'dayun_pillar must be one of the chart periods');
      assert.ok(r.occurred_year >= period.start_year && r.occurred_year <= period.end_year);
      assert.equal(r.dayun_nature, period.nature);
    }
    // 流年 nature is one of the closed tendency classes.
    assert.ok(['supportive', 'steady', 'watch', 'blocked', 'turning'].includes(r.liunian_nature));
    assert.ok(['喜', '忌', '平'].includes(r.liunian_favor));
  }
});

test('event resonance is deterministic', () => {
  const c = chart();
  const a = computeEventResonance(c, [event('e1', '2015-03-20T00:00:00Z')]);
  const b = computeEventResonance(c, [event('e1', '2015-03-20T00:00:00Z')]);
  assert.deepEqual(a, b);
});
