import assert from 'node:assert/strict';
import test from 'node:test';

import {
  mingJingRouteFailCloseDetail,
  mingJingRouteFeatureIdForScope,
  resolveMingJingRouteForMethod,
  validateMingJingRouteSupport,
} from '../src/product/astrology/mingjing-route-support.ts';
import { buildMingJingProjection } from '../src/product/astrology/mingjing-projection.ts';
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

test('MingJing route registry declares BaZi implemented and Ziwei not implemented', () => {
  const bazi = resolveMingJingRouteForMethod('bazi_ziping_v1');
  assert.equal(bazi.id, 'mingjing.route.bazi_ziping_v1');
  assert.equal(bazi.status, 'implemented');
  assert.deepEqual(bazi.supported_features, ['natal_projection', 'natal_reading', 'relationship_hepan']);

  const ziwei = resolveMingJingRouteForMethod('ziwei_sanhe_v1');
  assert.equal(ziwei.id, 'mingjing.route.ziwei_sanhe_v1');
  assert.equal(ziwei.status, 'not_implemented');
  assert.deepEqual(ziwei.supported_features, []);
});

test('MingJing route feature mapping is scope-specific', () => {
  assert.equal(mingJingRouteFeatureIdForScope(natalMirrorScope()), 'natal_reading');
  assert.equal(mingJingRouteFeatureIdForScope(relationshipNatalMirrorScope()), 'relationship_hepan');
});

test('Ziwei MingJing route fails as route unavailable, not as conceptually unsupported', () => {
  const result = validateMingJingRouteSupport({
    method_profile_id: 'ziwei_sanhe_v1',
    feature_id: 'natal_projection',
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'mingjing_route_not_implemented');
  assert.equal(result.error.route_id, 'mingjing.route.ziwei_sanhe_v1');
  assert.equal(result.error.method_profile_id, 'ziwei_sanhe_v1');
  assert.match(
    mingJingRouteFailCloseDetail(result.error),
    /mingjing_route_not_implemented:mingjing\.route\.ziwei_sanhe_v1:ziwei_sanhe_v1/u,
  );
});

test('MingJing live natal projection fails closed when selected route is unavailable', () => {
  const result = buildMingJingProjection({ space: spaceWithMethod('ziwei_sanhe_v1'), reference_year: 2026 });

  assert.equal(result.ok, false);
  assert.equal(result.error.stage, 'mingjing_route_support');
  assert.match(
    result.error.detail ?? '',
    /mingjing_route_not_implemented:mingjing\.route\.ziwei_sanhe_v1:ziwei_sanhe_v1/u,
  );
});

test('MingJing readiness surfaces route unavailable before rendering the BaZi route', () => {
  const result = mingJingReadiness(spaceWithMethod('ziwei_sanhe_v1'));

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'mingjing_route_unavailable');
  assert.match(result.detail, /mingjing_route_not_implemented:mingjing\.route\.ziwei_sanhe_v1/u);
});

test('generateReading fails before Runtime AI when selected MingJing route is unavailable', async () => {
  let runtimeCalled = false;
  const result = await generateReading(
    {
      id: 'rdg_mj_ziwei_route_unavailable',
      created_at: '2026-06-22T00:00:00Z',
      mirror_kind: 'mingjing',
      mirror_scope: natalMirrorScope({ anchor_year: 2026, basis_time_zone: TZ }),
      related_person_refs: [],
      concern_tag_refs: [],
      cited_reading_ids: [],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      space: spaceWithMethod('ziwei_sanhe_v1'),
    },
    {
      now: new Date('2026-06-22T01:00:00Z'),
      runtime_ai_client: {
        async generate() {
          runtimeCalled = true;
          throw new Error('unavailable route should not call Runtime AI');
        },
      },
    },
  );

  assert.equal(runtimeCalled, false);
  assert.equal(result.ok, false);
  assert.equal(result.failure.kind, 'algorithm_fail_closed');
  assert.equal(result.failure.stage, 'mingjing_route_support');
  assert.match(
    result.failure.detail ?? '',
    /mingjing_route_not_implemented:mingjing\.route\.ziwei_sanhe_v1:ziwei_sanhe_v1/u,
  );
});
