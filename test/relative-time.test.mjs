import assert from 'node:assert/strict';
import test from 'node:test';
import { relativeTimeShort } from '../src/product/datetime/relative-time.ts';
import { getProductCopy } from '../src/product/i18n/copy.ts';

test('relative time uses complete days and the selected UI language', () => {
  const now = new Date('2026-09-30T00:00:00Z');
  assert.equal(relativeTimeShort('2026-09-28T00:00:00Z', getProductCopy('zh').relativeTime, now), '2 天前');
  assert.equal(relativeTimeShort('2026-09-28T00:00:00Z', getProductCopy('en').relativeTime, now), '2d ago');
});
