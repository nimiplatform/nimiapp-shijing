import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAstrologyFeatureSnapshot } from '../../src/product/astrology/build-feature-snapshot.ts';
import { validConcernTag, validNatalInputs, validShiJingSpace } from '../_fixtures.mjs';

const TZ = 'Asia/Shanghai';

function qizhengNianjingCommon() {
  const tag = validConcernTag('tag_career', {
    label: '#career',
    parsed_topics: ['career'],
    prompt_text: 'career direction',
  });
  const result = buildAstrologyFeatureSnapshot({
    mirror_kind: 'nianjing',
    mirror_scope: {
      kind: 'long_horizon',
      start_date: '2026-01-01',
      end_date: '2035-12-31',
      basis_time_zone: TZ,
    },
    space: validShiJingSpace({
      self_subject: {
        natal_inputs: validNatalInputs({ calculation_sex: 'male' }),
      },
      concern_tags: [tag],
      settings: {
        ui_language: 'zh',
        response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
        method_profile_id: 'qizheng_siyu_guolao_v1',
      },
    }),
    related_person_refs: [],
    active_concern_tags: [tag],
    method_profile_id: 'qizheng_siyu_guolao_v1',
  });
  assert.equal(result.ok, true, result.ok ? '' : JSON.stringify(result.error));
  return result.value.common;
}

test('qizheng nianjing: phase nature comes from concern body house and position class', () => {
  const phases = qizhengNianjingCommon().nianjing_phase_drivers;
  assert.ok(phases.length > 0);
  assert.ok(
    phases.every((p) => p.driver_refs.some((ref) => ref.startsWith('qizheng_siyu:body.'))),
    'body evidence ref present',
  );
  assert.ok(
    phases.every((p) => p.driver_refs.some((ref) => ref.startsWith('qizheng_siyu:house.'))),
    'house evidence ref present',
  );
  assert.ok(
    phases.every((p) => p.driver_refs.some((ref) => ref.startsWith('qizheng_siyu:position_class.'))),
    'position class evidence ref present',
  );
});

test('qizheng nianjing: inflections emit annual long-horizon markers only', () => {
  const inflections = qizhengNianjingCommon().nianjing_inflection_drivers;
  assert.equal(inflections.length, 10);
  assert.ok(inflections.every((i) => i.kind === 'annual_transition'));
  assert.ok(
    inflections.every((i) =>
      i.driver_refs.some((ref) => ref.startsWith('qizheng_siyu:annual_transition@')),
    ),
  );
});
