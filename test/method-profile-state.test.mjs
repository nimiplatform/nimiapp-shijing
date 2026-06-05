import assert from 'node:assert/strict';
import test from 'node:test';
import { commitMethodProfile } from '../src/product/settings/method-profile-state.ts';
import { validShiJingSpace } from './_fixtures.mjs';

test('commitMethodProfile: selects an admitted method id, preserving other settings', () => {
  const space = validShiJingSpace();
  const next = commitMethodProfile(space, 'ziwei_sanhe_v1');
  assert.equal(next.settings.method_profile_id, 'ziwei_sanhe_v1');
  assert.deepEqual(next.settings.response_preferences, space.settings.response_preferences);
});

test('commitMethodProfile: rejects an unadmitted id and falls back to the default', () => {
  const space = validShiJingSpace();
  const next = commitMethodProfile(space, 'bazi_ganzhi_jieqi_dayun_v1');
  assert.equal(next.settings.method_profile_id, 'bazi_ziping_v1');
});
