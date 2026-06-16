// Audit P1 (Claude) — readiness must mirror the engine's own SJG-ALGO-10
// disposition, which is capability-shaped. The pre-refactor gate hardcoded 八字
// graceful degradation, so 紫微 (which needs the 时辰 to place 命宫) showed
// "ready" for rough_day and then failed closed at generation — a false-ready UX.

import assert from 'node:assert/strict';
import test from 'node:test';
import { subjectMirrorReadiness } from '../src/product/subjects/natal-readiness.ts';
import { dailyMirrorScope, validNatalInputs, validShiJingSpace } from './_fixtures.mjs';

function spaceWith(methodProfileId, natalOverrides) {
  return validShiJingSpace({
    self_subject: { natal_inputs: validNatalInputs(natalOverrides) },
    settings: {
      ui_language: 'zh',
      response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
      ...(methodProfileId ? { method_profile_id: methodProfileId } : {}),
    },
  });
}

const rijing = { mirror_kind: 'rijing', mirror_scope: dailyMirrorScope() };

test('八字 (default): rough_day stays ready — graceful degradation, hour pillar omitted', () => {
  const space = spaceWith(undefined, { birth_precision: 'rough_day', calculation_sex: 'male' });
  const r = subjectMirrorReadiness({ subject: 'self', space, ...rijing });
  assert.equal(r.ok, true, JSON.stringify(r));
});

test('紫微: rough_day is a hard blocker (命宫 needs the 时辰) — not false-ready', () => {
  const space = spaceWith('ziwei_sanhe_v1', { birth_precision: 'rough_day', calculation_sex: 'male' });
  const r = subjectMirrorReadiness({ subject: 'self', space, ...rijing });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.reason, 'birth_time_required_for_method');
});

test('紫微: exact birth time is ready', () => {
  const space = spaceWith('ziwei_sanhe_v1', { birth_precision: 'exact', calculation_sex: 'male' });
  const r = subjectMirrorReadiness({ subject: 'self', space, ...rijing });
  assert.equal(r.ok, true, JSON.stringify(r));
});

test('八字: rough_year remains blocked for any mirror (unchanged)', () => {
  const space = spaceWith('bazi_ziping_v1', { birth_precision: 'rough_year', calculation_sex: 'male' });
  const r = subjectMirrorReadiness({ subject: 'self', space, ...rijing });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.reason, 'birth_precision_rough_year_for_mirror');
});
