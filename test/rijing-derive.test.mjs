import assert from 'node:assert/strict';
import test from 'node:test';

import { deriveRiJingActions } from '../src/product/tabs/rijing/rijing-derive.ts';
import { validReading } from './_fixtures.mjs';

function avoidAction(items) {
  return items.find((item) => item.slot === 'avoid');
}

test('deriveRiJingActions does not turn exact birth precision into an avoid action', () => {
  const reading = validReading({
    uncertainty: {
      confidence: 'high',
      caveats: ['出生时刻精确,可应用全四柱'],
      data_gaps: ['birth_precision_exact'],
    },
  });

  const avoid = avoidAction(deriveRiJingActions(reading));

  assert.equal(avoid, undefined);
});

test('deriveRiJingActions returns empty actions when no reading exists', () => {
  assert.deepEqual(deriveRiJingActions(undefined), []);
});

test('deriveRiJingActions skips info-only caveats but keeps actionable caveats', () => {
  const reading = validReading({
    uncertainty: {
      confidence: 'low',
      caveats: [
        '出生时刻精确,可应用全四柱',
        '出生地缺失,经度修正与真太阳时无法计算',
      ],
      data_gaps: ['birth_precision_exact', 'location_missing'],
    },
  });

  const avoid = avoidAction(deriveRiJingActions(reading));

  assert.equal(avoid?.title, '出生地缺失,经度修正与真太阳…');
  assert.equal(avoid?.body, '出生地缺失,经度修正与真太阳时无法计算');
});
