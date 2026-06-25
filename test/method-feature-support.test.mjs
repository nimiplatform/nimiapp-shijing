import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SHIJING_METHOD_FEATURE_DECLARATIONS,
  methodFeatureIdForMirror,
  methodSupportsFeature,
  validateMethodFeatureSupport,
} from '../src/product/astrology/method-feature-support.ts';
import {
  dailyMirrorScope,
  longHorizonMirrorScope,
  natalMirrorScope,
  rolling30DayMirrorScope,
} from './_fixtures.mjs';

test('method feature matrix explicitly declares support for every algorithm-neutral product feature', () => {
  const byId = new Map(SHIJING_METHOD_FEATURE_DECLARATIONS.map((feature) => [feature.id, feature]));

  assert.deepEqual(
    [...byId.keys()],
    [
      'rijing.daily_reading',
      'yuejing.rolling_30_day_reading',
      'nianjing.long_horizon_reading',
      'shijing.consultation',
    ],
  );

  assert.equal(methodSupportsFeature('ziwei_sanhe_v1', 'rijing.daily_reading'), true);
  assert.equal(methodSupportsFeature('ziwei_sanhe_v1', 'yuejing.rolling_30_day_reading'), true);
  assert.equal(methodSupportsFeature('ziwei_sanhe_v1', 'nianjing.long_horizon_reading'), true);
  assert.equal(methodSupportsFeature('ziwei_sanhe_v1', 'shijing.consultation'), true);
  assert.equal(methodSupportsFeature('qizheng_siyu_guolao_v1', 'rijing.daily_reading'), true);
  assert.equal(methodSupportsFeature('qizheng_siyu_guolao_v1', 'yuejing.rolling_30_day_reading'), true);
  assert.equal(methodSupportsFeature('qizheng_siyu_guolao_v1', 'nianjing.long_horizon_reading'), true);
  assert.equal(methodSupportsFeature('qizheng_siyu_guolao_v1', 'shijing.consultation'), false);
});

test('methodFeatureIdForMirror maps only algorithm-neutral mirrors to product features', () => {
  assert.equal(methodFeatureIdForMirror('rijing', dailyMirrorScope()), 'rijing.daily_reading');
  assert.equal(methodFeatureIdForMirror('yuejing', rolling30DayMirrorScope()), 'yuejing.rolling_30_day_reading');
  assert.equal(methodFeatureIdForMirror('nianjing', longHorizonMirrorScope()), 'nianjing.long_horizon_reading');
  assert.equal(methodFeatureIdForMirror('mingjing', natalMirrorScope()), null);
});

test('supported feature validation accepts every admitted method for ShiJing consultation', () => {
  const result = validateMethodFeatureSupport({
    method_profile_id: 'ziwei_sanhe_v1',
    feature_id: 'shijing.consultation',
  });

  assert.equal(result.ok, true);
});
