import assert from 'node:assert/strict';
import test from 'node:test';

import { generateNianJingOutput } from '../src/product/astrology/nianjing-generator.ts';
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

test('NianJing generator words phase summaries from selected method driver refs', () => {
  const result = generateNianJingOutput({
    feature_snapshot: {
      method_profile: {
        id: 'ziwei_sanhe_v1',
        contract_version: 'SJG-ALGO-v1',
        feature_schema_version: 'SJG-FEATURE-v2',
        ephemeris_version: 'test',
      },
      mirror_kind: 'nianjing',
      canonical_window: {
        start_utc: '2026-01-01T00:00:00.000Z',
        end_utc: '2026-12-31T15:59:59.999Z',
        basis_time_zone: 'Asia/Shanghai',
        scope_kind: 'long_horizon',
      },
      common: {
        stage_drivers: [],
        key_windows: [],
        yuejing_tendency_drivers: [],
        nianjing_phase_drivers: [
          {
            concern_tag_ref: 'tag_career',
            start_date: '2026-01-01',
            end_date: '2026-12-31',
            nature: 'steady',
            driver_refs: ['ziwei:daxian@官禄', 'ziwei:daxian_hua@官禄@2026'],
          },
          {
            concern_tag_ref: 'tag_love',
            start_date: '2026-01-01',
            end_date: '2026-12-31',
            nature: 'steady',
            driver_refs: ['ziwei:daxian@夫妻', 'ziwei:daxian_hua@夫妻@2026'],
          },
        ],
        nianjing_inflection_drivers: [],
        uncertainty_inputs: [],
      },
      method_evidence: { method_id: 'ziwei_sanhe_v1', ziwei: { self_subject: {}, related_persons: [] } },
    },
    mirror_scope: {
      kind: 'long_horizon',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      basis_time_zone: 'Asia/Shanghai',
    },
    active_concern_tags: [
      validConcernTag('tag_career', { label: '#事业', parsed_topics: ['career'] }),
      validConcernTag('tag_love', { label: '#姻缘', parsed_topics: ['love'] }),
    ],
    cited_event_memory_refs: [],
    cited_plan_item_refs: [],
  });

  assert.equal(result.ok, true, result.ok ? '' : JSON.stringify(result.error));
  assert.notEqual(
    result.value.phase_bands[0].summary,
    result.value.phase_bands[1].summary,
    'same-nature phase summaries should reflect method-specific driver refs',
  );
  assert.match(result.value.phase_bands[0].summary, /ziwei|紫微|官禄/);
  assert.match(result.value.phase_bands[1].summary, /ziwei|紫微|夫妻/);
});
