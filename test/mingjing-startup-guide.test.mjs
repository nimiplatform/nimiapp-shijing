import assert from 'node:assert/strict';
import test from 'node:test';

import { buildEmptyShiJingSpace } from '../src/product/dev/initial-space.ts';
import {
  hasCompletedMingJingStartupIntake,
  initialMingJingStartupGuideDismissed,
  shouldShowMingJingStartupGuide,
} from '../src/product/tabs/mingjing/mingjing-startup-guide.ts';
import {
  validConcernTag,
  validNatalInputs,
  validShiJingSpace,
} from './_fixtures.mjs';

test('MingJing startup guide shows only before the first self and concern intake', () => {
  const emptySpace = buildEmptyShiJingSpace('u_startup');

  assert.equal(hasCompletedMingJingStartupIntake(emptySpace), false);
  assert.equal(initialMingJingStartupGuideDismissed(emptySpace), false);
  assert.equal(
    shouldShowMingJingStartupGuide({
      startupGuideDismissed: false,
    }),
    true,
  );
});

test('MingJing startup guide does not return after first self and concern intake', () => {
  const completedSpace = validShiJingSpace({
    self_subject: {
      natal_inputs: validNatalInputs({ calculation_sex: 'female' }),
    },
    concern_tags: [validConcernTag('tag_career')],
  });

  assert.equal(hasCompletedMingJingStartupIntake(completedSpace), true);
  assert.equal(initialMingJingStartupGuideDismissed(completedSpace), true);
  assert.equal(
    shouldShowMingJingStartupGuide({
      startupGuideDismissed: initialMingJingStartupGuideDismissed(completedSpace),
    }),
    false,
  );
});

test('MingJing startup guide waits for explicit entry after intake becomes complete', () => {
  const emptySpace = buildEmptyShiJingSpace('u_startup');
  const startupGuideDismissed = initialMingJingStartupGuideDismissed(emptySpace);
  const completedSpace = validShiJingSpace({
    self_subject: {
      natal_inputs: validNatalInputs({ calculation_sex: 'female' }),
    },
    concern_tags: [validConcernTag('tag_career')],
  });

  assert.equal(hasCompletedMingJingStartupIntake(completedSpace), true);
  assert.equal(
    shouldShowMingJingStartupGuide({ startupGuideDismissed }),
    true,
  );
});

test('MingJing startup guide stays dismissed after first intake even when later readiness needs repair', () => {
  const repairedByRegularReadinessSpace = validShiJingSpace({
    self_subject: {
      natal_inputs: validNatalInputs({
        birth_precision: 'rough_day',
        calculation_sex: 'female',
      }),
    },
    concern_tags: [validConcernTag('tag_career', { status: 'archived' })],
  });

  assert.equal(hasCompletedMingJingStartupIntake(repairedByRegularReadinessSpace), true);
  assert.equal(
    shouldShowMingJingStartupGuide({
      startupGuideDismissed: initialMingJingStartupGuideDismissed(
        repairedByRegularReadinessSpace,
      ),
    }),
    false,
  );
});

test('MingJing startup guide can still be dismissed inside the current session', () => {
  const emptySpace = buildEmptyShiJingSpace('u_startup');

  assert.equal(
    shouldShowMingJingStartupGuide({
      startupGuideDismissed: true,
    }),
    false,
  );
});
