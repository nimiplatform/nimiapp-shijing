// Audit P2 — 八字 evidence (旺衰/用神) was only shown in the RiJing tab's bar.
// The deriver is method-agnostic and now feeds the SHARED CitationDrawer, so
// every mirror (月镜/年镜/时镜) shows the engine-specific evidence chips.

import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAstrologyFeatureSnapshot } from '../src/product/astrology/build-feature-snapshot.ts';
import { localWallClockToUtcInstant } from '../src/product/astrology/local-wall-clock.ts';
import { deriveMethodEvidenceChips } from '../src/product/tabs/shared/method-evidence-chips.ts';
import { validConcernTag } from './_fixtures.mjs';

const TZ = 'Asia/Shanghai';
function readingWith(method) {
  const natal = {
    raw_birth_input: { calendar_system: 'gregorian', local_date_text: '1990-04-12', local_time_text: '08:30', place_text: 'Shanghai' },
    birth_datetime_utc: localWallClockToUtcInstant('1990-04-12T08:30:00', TZ).toISOString(),
    birth_precision: 'exact', calendar_system: 'gregorian', calculation_sex: 'male',
    birth_location: { latitude: 31.2304, longitude: 121.4737, iana_time_zone: TZ, place_name: 'Shanghai' },
  };
  const space = {
    user_id: 'u', self_subject: { natal_inputs: natal }, persons: [], concern_tags: [], event_memories: [], plan_items: [], readings: [], conversations: [],
    settings: { ui_language: 'zh', response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' }, ...(method ? { method_profile_id: method } : {}) },
  };
  const fs = buildAstrologyFeatureSnapshot({
    mirror_kind: 'rijing', mirror_scope: { kind: 'daily', date: '2026-06-05', basis_time_zone: TZ },
    space, related_person_refs: [], active_concern_tags: [validConcernTag('t', { parsed_topics: ['general'], prompt_text: 'x' })],
  });
  assert.equal(fs.ok, true, JSON.stringify(fs));
  return { inputs_summary: { feature_snapshot: fs.value } };
}
const groups = (chips) => chips.map((c) => c.group);

test('八字 reading: shared chips expose 旺衰 + 用神 (the interpretive evidence)', () => {
  const chips = deriveMethodEvidenceChips(readingWith('bazi_ziping_v1'));
  const g = groups(chips);
  for (const want of ['日柱', '月令', '旺衰', '用神', '数据完整度']) {
    assert.ok(g.includes(want), `expected chip ${want}, got ${g.join(',')}`);
  }
  const yong = chips.find((c) => c.group === '用神');
  assert.ok(/[木火土金水]/.test(yong.value), `用神 should be element labels, got ${yong.value}`);
});

test('紫微 reading: shared chips expose 命宫 + 命主 + 五行局', () => {
  const chips = deriveMethodEvidenceChips(readingWith('ziwei_sanhe_v1'));
  const g = groups(chips);
  for (const want of ['命宫', '命主', '五行局']) {
    assert.ok(g.includes(want), `expected chip ${want}, got ${g.join(',')}`);
  }
});
