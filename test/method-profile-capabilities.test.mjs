import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';

const capabilitiesUrl = new URL(
  '../src/product/settings/method-profile-capabilities.ts',
  import.meta.url,
);

test('method profile capabilities disclose generic mirrors and MingJing route support', async () => {
  assert.equal(existsSync(capabilitiesUrl), true, 'method profile capability model is missing');

  const {
    deriveMethodProfileCapabilityRows,
  } = await import(capabilitiesUrl.href);

  const rows = deriveMethodProfileCapabilityRows();
  assert.deepEqual(
    rows.map((row) => row.method_profile_id),
    ['bazi_ziping_v1', 'ziwei_sanhe_v1'],
  );

  for (const row of rows) {
    assert.deepEqual(
      row.algorithm_neutral_features.map((feature) => [feature.id, feature.supported]),
      [
        ['rijing.daily_reading', true],
        ['yuejing.rolling_30_day_reading', true],
        ['nianjing.long_horizon_reading', true],
        ['shijing.consultation', true],
      ],
    );
  }

  const bazi = rows.find((row) => row.method_profile_id === 'bazi_ziping_v1');
  const ziwei = rows.find((row) => row.method_profile_id === 'ziwei_sanhe_v1');

  assert.equal(bazi.mingjing_route.id, 'mingjing.route.bazi_ziping_v1');
  assert.equal(bazi.mingjing_route.status, 'implemented');
  assert.deepEqual(bazi.mingjing_route.supported_features, [
    'natal_projection',
    'natal_reading',
    'relationship_hepan',
  ]);
  assert.equal(bazi.mingjing_route.fail_close_detail, null);

  assert.equal(ziwei.mingjing_route.id, 'mingjing.route.ziwei_sanhe_v1');
  assert.equal(ziwei.mingjing_route.status, 'implemented');
  assert.deepEqual(ziwei.mingjing_route.supported_features, [
    'natal_projection',
    'natal_reading',
  ]);
  assert.equal(ziwei.mingjing_route.fail_close_detail, null);
});
