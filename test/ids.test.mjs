// W-c01 — ULID id strategy tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ULID_LENGTH,
  ULID_PATTERN,
  isUlid,
  newConcernTagId,
  newConversationId,
  newConversationTurnId,
  newEventMemoryId,
  newPlanItemId,
  newReadingId,
  newUlid,
} from '../src/product/ids/index.ts';

test('newUlid returns a 26-char Crockford base32 string', () => {
  const id = newUlid();
  assert.equal(id.length, ULID_LENGTH);
  assert.equal(ULID_PATTERN.test(id), true, `expected ULID shape, got ${id}`);
});

test('newUlid is monotonic within the same millisecond', () => {
  const now = new Date(1_700_000_000_000);
  const a = newUlid({ now });
  const b = newUlid({ now });
  const c = newUlid({ now });
  assert.equal(ULID_PATTERN.test(a), true);
  assert.equal(ULID_PATTERN.test(b), true);
  assert.equal(ULID_PATTERN.test(c), true);
  assert.ok(a < b, `expected a < b, got ${a} >= ${b}`);
  assert.ok(b < c, `expected b < c, got ${b} >= ${c}`);
});

test('newUlid resets the random tail when the millisecond advances', () => {
  const t1 = new Date(1_700_000_000_000);
  const t2 = new Date(1_700_000_000_001);
  const a = newUlid({ now: t1 });
  const b = newUlid({ now: t2 });
  assert.notEqual(a.slice(0, 10), b.slice(0, 10));
});

test('newUlid rejects non-Date now', () => {
  assert.throws(() => newUlid({ now: '2026-05-28' }), /options\.now must be a Date/);
});

test('newUlid rejects out-of-range time', () => {
  // Date with NaN getTime should throw.
  const bad = new Date('not-a-date');
  assert.throws(() => newUlid({ now: bad }), /not a valid Date/);
});

test('isUlid accepts a generated id and rejects non-ULID strings', () => {
  assert.equal(isUlid(newUlid()), true);
  assert.equal(isUlid('not-a-ulid'), false);
  assert.equal(isUlid('I'.repeat(26)), false, 'forbidden char I should reject');
  assert.equal(isUlid('L'.repeat(26)), false, 'forbidden char L should reject');
  assert.equal(isUlid('O'.repeat(26)), false, 'forbidden char O should reject');
  assert.equal(isUlid('U'.repeat(26)), false, 'forbidden char U should reject');
  assert.equal(isUlid(12345), false);
  assert.equal(isUlid(null), false);
});

test('per-entity factories all return ULID-shaped strings', () => {
  for (const factory of [
    newConcernTagId,
    newEventMemoryId,
    newPlanItemId,
    newReadingId,
    newConversationId,
    newConversationTurnId,
  ]) {
    const id = factory();
    assert.equal(ULID_PATTERN.test(id), true, `${factory.name} returned non-ULID: ${id}`);
  }
});

test('per-entity factories share monotonic ordering when called in sequence', () => {
  const now = new Date(1_700_000_001_000);
  const ids = [
    newConcernTagId({ now }),
    newEventMemoryId({ now }),
    newPlanItemId({ now }),
    newReadingId({ now }),
    newConversationId({ now }),
    newConversationTurnId({ now }),
  ];
  for (let i = 1; i < ids.length; i += 1) {
    assert.ok(ids[i - 1] < ids[i], `ids should be monotonic, got ${ids[i - 1]} >= ${ids[i]}`);
  }
});
