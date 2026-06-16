import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deriveRiJingActions,
  deriveRiJingHero,
  rijingDateLabel,
} from '../src/product/tabs/rijing/rijing-derive.ts';
import { getProductCopy } from '../src/product/i18n/copy.ts';
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

test('deriveRiJingHero names profile blockers instead of asking for refresh', () => {
  const hero = deriveRiJingHero(undefined, { empty_state: 'profile_incomplete' });

  assert.equal(hero.hasReading, false);
  assert.match(hero.description, /完善本人生辰资料/);
  assert.doesNotMatch(hero.description, /刷新/);
});

test('deriveRiJingHero names missing focus blockers', () => {
  const hero = deriveRiJingHero(undefined, { empty_state: 'missing_focus' });

  assert.match(hero.description, /激活一个关注/);
  assert.match(hero.reminder, /不会生成泛化建议/);
});

test('deriveRiJingHero preserves runtime AI fail-close recovery copy', () => {
  const hero = deriveRiJingHero(undefined, { empty_state: 'runtime_ai_failed' });

  assert.match(hero.description, /Runtime AI wording 未完成/);
  assert.match(hero.reminder, /AI 模型配置/);
});

test('deriveRiJing helpers use English product copy when provided', () => {
  const copy = getProductCopy('en');
  const hero = deriveRiJingHero(undefined, { empty_state: 'missing_focus', copy });
  const actions = deriveRiJingActions(
    validReading({
      uncertainty: {
        confidence: 'low',
        caveats: ['出生地缺失,经度修正与真太阳时无法计算'],
        data_gaps: ['location_missing'],
      },
    }),
    copy,
  );
  const date = rijingDateLabel('Asia/Shanghai', copy, new Date('2026-06-17T00:00:00Z'));

  assert.equal(hero.headline, 'Daily Mirror has not been generated');
  assert.match(hero.description, /Add and activate one concern/);
  assert.equal(avoidAction(actions)?.eyebrow, 'Avoid one thing today');
  assert.equal(date.weekday, 'Wednesday');
  assert.equal(date.zone, 'Beijing time');
});
