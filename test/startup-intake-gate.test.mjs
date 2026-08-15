import assert from 'node:assert/strict';
import test from 'node:test';

import { buildEmptyShiJingSpace } from '../src/product/dev/initial-space.ts';
import {
  hasCompletedMingJingStartupIntake,
  shouldGatePrimaryTabForIntake,
} from '../src/product/onboarding/startup-intake.ts';
import {
  validConcernTag,
  validNatalInputs,
  validShiJingSpace,
} from './_fixtures.mjs';

const GATED_TABS = ['rijing', 'yuejing', 'nianjing', 'hejing', 'shijing'];

test('intake gate covers the five mirrors before the first self + concern intake', () => {
  const emptySpace = buildEmptyShiJingSpace('u_gate');

  assert.equal(hasCompletedMingJingStartupIntake(emptySpace), false);
  for (const tab of GATED_TABS) {
    assert.equal(shouldGatePrimaryTabForIntake(emptySpace, tab), true, tab);
  }
});

test('mingjing itself is never gated — it hosts the intake', () => {
  const emptySpace = buildEmptyShiJingSpace('u_gate');

  assert.equal(shouldGatePrimaryTabForIntake(emptySpace, 'mingjing'), false);
});

test('intake gate lifts on every tab once the first intake completes', () => {
  const completedSpace = validShiJingSpace({
    self_subject: {
      natal_inputs: validNatalInputs({ calculation_sex: 'female' }),
    },
    concern_tags: [validConcernTag('tag_career')],
  });

  assert.equal(hasCompletedMingJingStartupIntake(completedSpace), true);
  for (const tab of [...GATED_TABS, 'mingjing']) {
    assert.equal(shouldGatePrimaryTabForIntake(completedSpace, tab), false, tab);
  }
});

test('intake gate stays on while either the self profile or any concern is still missing', () => {
  const profileOnly = validShiJingSpace({
    self_subject: {
      natal_inputs: validNatalInputs({ calculation_sex: 'female' }),
    },
    concern_tags: [],
  });
  // Scaffold natal inputs + a real concern: the profile half is still pending.
  const concernsOnly = {
    ...buildEmptyShiJingSpace('u_gate'),
    concern_tags: [validConcernTag('tag_career')],
  };

  assert.equal(shouldGatePrimaryTabForIntake(profileOnly, 'rijing'), true);
  assert.equal(shouldGatePrimaryTabForIntake(concernsOnly, 'hejing'), true);
});
