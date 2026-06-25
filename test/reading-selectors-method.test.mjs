import assert from 'node:assert/strict';
import test from 'node:test';

import { latestReadingByMirrorKind } from '../src/product/reading/reading-selectors.ts';
import {
  dailyMirrorScope,
  validMethodProfile,
} from './_fixtures.mjs';

function reading(id, methodId, createdAt) {
  return {
    id,
    mirror_kind: 'rijing',
    mirror_scope: dailyMirrorScope(),
    created_at: createdAt,
    inputs_summary: {
      method_profile: { ...validMethodProfile(), id: methodId },
    },
    output: { mirror_kind: 'rijing' },
  };
}

test('latestReadingByMirrorKind can filter the visible current reading by method profile', () => {
  const olderZiwei = reading('ziwei_old', 'ziwei_sanhe_v1', '2026-06-20T00:00:00Z');
  const newerBazi = reading('bazi_new', 'bazi_ziping_v1', '2026-06-21T00:00:00Z');

  assert.equal(
    latestReadingByMirrorKind({
      readings: [olderZiwei, newerBazi],
      mirror_kind: 'rijing',
      method_profile_id: 'ziwei_sanhe_v1',
    })?.id,
    'ziwei_old',
  );
});
