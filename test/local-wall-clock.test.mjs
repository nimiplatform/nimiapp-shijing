// Tests for local→UTC conversion and the China-1986–1991 DST reminder trigger.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  localWallClockToUtcInstant,
  isDaylightSavingActive,
} from '../src/product/astrology/local-wall-clock.ts';

test('localWallClockToUtcInstant honours China 1986–1991 DST (+9 in summer)', () => {
  // July 1988 Shanghai was on summer time (UTC+9): 12:00 local → 03:00Z.
  assert.equal(
    localWallClockToUtcInstant('1988-07-01T12:00:00', 'Asia/Shanghai')?.toISOString(),
    '1988-07-01T03:00:00.000Z',
  );
  // Winter is standard +8: 12:00 local → 04:00Z.
  assert.equal(
    localWallClockToUtcInstant('1988-01-01T12:00:00', 'Asia/Shanghai')?.toISOString(),
    '1988-01-01T04:00:00.000Z',
  );
});

test('isDaylightSavingActive flags China DST-window summer births', () => {
  assert.equal(isDaylightSavingActive('1988-07-01', '08:30', 'Asia/Shanghai'), true);
  assert.equal(isDaylightSavingActive('1990-08-15', '08:30', 'Asia/Shanghai'), true);
});

test('isDaylightSavingActive is quiet outside DST', () => {
  // Winter inside the DST era.
  assert.equal(isDaylightSavingActive('1988-01-01', '08:30', 'Asia/Shanghai'), false);
  // April 12 1990 — DST had not started yet that year.
  assert.equal(isDaylightSavingActive('1990-04-12', '08:30', 'Asia/Shanghai'), false);
  // Post-1991: China no longer observes DST.
  assert.equal(isDaylightSavingActive('2000-07-01', '08:30', 'Asia/Shanghai'), false);
});

test('isDaylightSavingActive returns false for unparseable / zoneless input', () => {
  assert.equal(isDaylightSavingActive('not-a-date', '08:30', 'Asia/Shanghai'), false);
  assert.equal(isDaylightSavingActive('1988-07-01', '08:30', ''), false);
});
