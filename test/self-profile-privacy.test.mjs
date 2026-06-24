import assert from 'node:assert/strict';
import test from 'node:test';

import { getProductCopy } from '../src/product/i18n/copy.ts';
import {
  isPresenceVerificationForSelfProfile,
  protectSelfProfileSummary,
  selfProfilePresenceVerificationFailureReason,
} from '../src/product/self/self-profile-privacy.ts';
import { summarizeSelfSubject } from '../src/product/self/self-summary.ts';
import { validShiJingSpace } from './_fixtures.mjs';

test('locked self profile summary does not expose entered birth fields', () => {
  const copy = getProductCopy('en');
  const summary = summarizeSelfSubject(validShiJingSpace(), copy);
  const protectedSummary = protectSelfProfileSummary(summary, copy, false);

  assert.equal(protectedSummary.coreFields[1].value, copy.self.protectedValue);
  assert.equal(protectedSummary.coreFields[2].value, copy.self.protectedValue);
  assert.equal(protectedSummary.metaText, copy.self.protectedValue);
  assert.equal(protectedSummary.calibrationText, copy.self.protectedValue);
  assert.notEqual(JSON.stringify(protectedSummary), JSON.stringify(summary));
  assert.doesNotMatch(JSON.stringify(protectedSummary), /1990|08:30|Shanghai|Asia\/Shanghai/);
});

test('verified self profile summary preserves the real summary', () => {
  const copy = getProductCopy('en');
  const summary = summarizeSelfSubject(validShiJingSpace(), copy);

  assert.deepEqual(protectSelfProfileSummary(summary, copy, true), summary);
});

test('self profile reveal requires presence verification for the same subject', () => {
  const nowMs = Date.UTC(2026, 5, 24, 10, 0, 0);
  const result = {
    state: 'verified',
    subjectUserId: ' user-1 ',
    verifiedUntilMs: nowMs + 60_000,
    method: 'os_presence',
  };

  assert.equal(isPresenceVerificationForSelfProfile(result, 'user-1', nowMs), true);
  assert.equal(
    selfProfilePresenceVerificationFailureReason(result, 'user-2', nowMs),
    'presence_subject_mismatch',
  );
  assert.equal(isPresenceVerificationForSelfProfile(result, 'user-2', nowMs), false);
});

test('self profile reveal rejects expired presence verification', () => {
  const nowMs = Date.UTC(2026, 5, 24, 10, 0, 0);
  const result = {
    state: 'verified',
    subjectUserId: 'user-1',
    verifiedUntilMs: nowMs,
    method: 'os_presence',
  };

  assert.equal(isPresenceVerificationForSelfProfile(result, 'user-1', nowMs), false);
  assert.equal(
    selfProfilePresenceVerificationFailureReason(result, 'user-1', nowMs),
    'presence_verification_expired',
  );
});
