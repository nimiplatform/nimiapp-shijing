import assert from 'node:assert/strict';
import test from 'node:test';

import { buildNianJingDirectDisplayOutput } from '../src/product/tabs/nianjing/nianjing-direct-output.ts';
import {
  longHorizonMirrorScope,
  validConcernTag,
  validNatalInputs,
  validShiJingSpace,
} from './_fixtures.mjs';

test('NianJing direct display derives deterministic phase output without a persisted Reading', () => {
  const tag = validConcernTag('tag_career', {
    label: '#事业',
    parsed_topics: ['career'],
    prompt_text: 'career direction',
  });
  const scope = longHorizonMirrorScope({
    start_date: '2026-01-01',
    end_date: '2036-12-31',
  });
  const space = validShiJingSpace({
    self_subject: {
      natal_inputs: validNatalInputs({ calculation_sex: 'male' }),
    },
    concern_tags: [tag],
    readings: [],
  });

  const result = buildNianJingDirectDisplayOutput({
    space,
    mirror_scope: scope,
    active_concern_tags: [tag],
  });

  assert.equal(result.ok, true, result.ok ? '' : JSON.stringify(result.failure));
  assert.equal(result.output.mirror_kind, 'nianjing');
  assert.deepEqual(space.readings, []);
  assert.ok(result.output.phase_bands.length > 0, 'phase bands render from deterministic drivers');
  assert.ok(
    result.output.phase_bands.every((band) => band.concern_tag_ref === tag.id),
    'direct output only renders the active concern lanes',
  );
  assert.ok(result.output.inflection_points.length > 0, 'inflection markers render from deterministic drivers');
});

test('NianJing direct display supports qizheng long-horizon phases', () => {
  const tag = validConcernTag('tag_career', {
    label: '#事业',
    parsed_topics: ['career'],
    prompt_text: 'career direction',
  });
  const scope = longHorizonMirrorScope({
    start_date: '2026-01-01',
    end_date: '2036-12-31',
  });
  const space = validShiJingSpace({
    self_subject: {
      natal_inputs: validNatalInputs({ calculation_sex: 'male' }),
    },
    concern_tags: [tag],
    readings: [],
    settings: {
      ui_language: 'zh',
      response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
      method_profile_id: 'qizheng_siyu_guolao_v1',
    },
  });

  const result = buildNianJingDirectDisplayOutput({
    space,
    mirror_scope: scope,
    active_concern_tags: [tag],
  });

  assert.equal(result.ok, true, result.ok ? '' : JSON.stringify(result.failure));
  assert.equal(result.output.mirror_kind, 'nianjing');
  assert.ok(result.output.phase_bands.length > 0, 'qizheng phase bands render');
  assert.ok(result.output.inflection_points.length > 0, 'qizheng inflection markers render');
  assert.ok(
    result.output.phase_bands.every((band) =>
      band.driver_refs.some((ref) => ref.startsWith('qizheng_siyu:period.')),
    ),
    'qizheng phase bands cite long-horizon period evidence',
  );
});
