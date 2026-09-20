import assert from 'node:assert/strict';
import test from 'node:test';

import {
  mingJingRouteFeatureIdForScope,
  resolveMingJingRouteForMethod,
  validateMingJingRouteSupport,
} from '../src/product/astrology/mingjing-route-support.ts';
import { generateReading } from '../src/product/astrology/generate-reading.ts';
import { mingJingReadiness } from '../src/product/tabs/mingjing/mingjing-readiness.ts';
import {
  natalMirrorScope,
  relationshipNatalMirrorScope,
  validNatalInputs,
  validPerson,
  validShiJingSpace,
} from './_fixtures.mjs';

const TZ = 'Asia/Shanghai';

function spaceWithMethod(methodProfileId) {
  return validShiJingSpace({
    self_subject: {
      natal_inputs: validNatalInputs({ calculation_sex: 'male' }),
    },
    persons: [
      validPerson('p_alice', {
        natal_inputs: validNatalInputs({ calculation_sex: 'female' }),
      }),
    ],
    concern_tags: [
      {
        id: 'tag_love',
        label: '#婚缘',
        status: 'active',
        sort_order: 0,
        parsed_topics: ['love'],
        mention_refs: [],
        prompt_text: 'love',
        created_at: '2026-06-22T00:00:00Z',
        updated_at: '2026-06-22T00:00:00Z',
      },
    ],
    settings: {
      ui_language: 'zh',
      response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
      method_profile_id: methodProfileId,
    },
  });
}

test('MingJing route registry declares relationship HePan for every implemented route', () => {
  const bazi = resolveMingJingRouteForMethod('bazi_ziping_v1');
  assert.equal(bazi.id, 'mingjing.route.bazi_ziping_v1');
  assert.equal(bazi.status, 'implemented');
  assert.deepEqual(bazi.supported_features, ['natal_projection', 'natal_reading', 'relationship_hepan']);

  const ziwei = resolveMingJingRouteForMethod('ziwei_sanhe_v1');
  assert.equal(ziwei.id, 'mingjing.route.ziwei_sanhe_v1');
  assert.equal(ziwei.status, 'implemented');
  assert.deepEqual(ziwei.supported_features, ['natal_projection', 'natal_reading', 'relationship_hepan']);

  const qizheng = resolveMingJingRouteForMethod('qizheng_siyu_guolao_v1');
  assert.equal(qizheng.id, 'mingjing.route.qizheng_siyu_guolao_v1');
  assert.equal(qizheng.status, 'implemented');
  assert.deepEqual(qizheng.supported_features, ['natal_projection', 'natal_reading', 'relationship_hepan']);
});

test('MingJing route feature mapping is scope-specific', () => {
  assert.equal(mingJingRouteFeatureIdForScope(natalMirrorScope()), 'natal_reading');
  assert.equal(mingJingRouteFeatureIdForScope(relationshipNatalMirrorScope()), 'relationship_hepan');
});

test('every implemented MingJing route supports relationship HePan', () => {
  for (const method_profile_id of [
    'bazi_ziping_v1',
    'ziwei_sanhe_v1',
    'qizheng_siyu_guolao_v1',
  ]) {
    const result = validateMingJingRouteSupport({
      method_profile_id,
      feature_id: 'relationship_hepan',
    });
    assert.equal(result.ok, true, JSON.stringify(result));
  }
});

test('MingJing readiness accepts the Ziwei natal route', () => {
  const result = mingJingReadiness(spaceWithMethod('ziwei_sanhe_v1'));

  assert.equal(result.ok, true, JSON.stringify(result));
});

test('MingJing readiness accepts QiZheng route without calculation sex', () => {
  const space = spaceWithMethod('qizheng_siyu_guolao_v1');
  const result = mingJingReadiness({
    ...space,
    self_subject: {
      natal_inputs: validNatalInputs({ calculation_sex: 'unspecified' }),
    },
  });

  assert.equal(result.ok, true, JSON.stringify(result));
});

test('generateReading routes relationship HePan by admitted pattern projection per MingJing route', async () => {
  let runtimeCalled = false;
  const runtimeClient = {
    async generate() {
      runtimeCalled = true;
      return {
        ok: false,
        failure: {
          kind: 'runtime_unavailable',
          detail: 'runtime intentionally unavailable after deterministic relationship evidence',
        },
      };
    },
  };
  const inputFor = (method_profile_id) => ({
    id: `rdg_mj_${method_profile_id}_hepan`,
    created_at: '2026-06-22T00:00:00Z',
    mirror_kind: 'mingjing',
    mirror_scope: relationshipNatalMirrorScope({ anchor_year: 2026, basis_time_zone: TZ }),
    related_person_refs: [{ kind: 'person', id: 'p_alice' }],
    concern_tag_refs: [],
    cited_reading_ids: [],
    cited_event_memory_refs: [],
    cited_plan_item_refs: [],
    space: spaceWithMethod(method_profile_id),
  });
  const deps = { now: new Date('2026-06-22T01:00:00Z'), runtime_ai_client: runtimeClient };

  // BaZi admits the v1 pattern-rule set: deterministic evidence plus pattern
  // projection succeed, so generation reaches Runtime AI.
  const baziResult = await generateReading(inputFor('bazi_ziping_v1'), deps);
  assert.equal(baziResult.ok, false);
  assert.equal(baziResult.failure.kind, 'runtime_ai_failed', JSON.stringify(baziResult));
  assert.equal(runtimeCalled, true);

  // Ziwei and QiZheng build relationship evidence but their pattern mappings
  // are unadmitted: generation ends in the typed patterns_unavailable state
  // before Runtime AI, without borrowing BaZi rules.
  for (const method_profile_id of ['ziwei_sanhe_v1', 'qizheng_siyu_guolao_v1']) {
    runtimeCalled = false;
    const result = await generateReading(inputFor(method_profile_id), deps);
    assert.equal(result.ok, false, method_profile_id);
    assert.equal(result.failure.kind, 'patterns_unavailable', JSON.stringify(result));
    assert.equal(result.failure.stage, 'relationship_pattern_projection', method_profile_id);
    assert.equal(result.failure.detail, `method_pattern_mapping_pending:${method_profile_id}`);
    assert.equal(runtimeCalled, false, method_profile_id);
  }
});
