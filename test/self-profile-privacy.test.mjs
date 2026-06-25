import assert from 'node:assert/strict';
import test from 'node:test';

import { getProductCopy } from '../src/product/i18n/copy.ts';
import {
  isPresenceVerificationForSelfProfile,
  protectSelfProfileSummary,
  selfProfilePresenceVerificationFailureReason,
} from '../src/product/self/self-profile-privacy.ts';
import { buildEmptyShiJingSpace } from '../src/product/dev/initial-space.ts';
import { summarizeSelfSubject } from '../src/product/self/self-summary.ts';
import { validShiJingSpace } from './_fixtures.mjs';

test('locked self profile summary masks entered birth fields with a neutral symbol', () => {
  const copy = getProductCopy('en');
  const summary = summarizeSelfSubject(validShiJingSpace(), copy);
  const maskedSummary = protectSelfProfileSummary(summary, copy, false);

  assert.equal(copy.self.maskedValue, '*');
  assert.equal(maskedSummary.coreFields[1].value, copy.self.maskedValue);
  assert.equal(maskedSummary.coreFields[2].value, copy.self.maskedValue);
  assert.equal(maskedSummary.metaText, copy.self.maskedValue);
  assert.equal(maskedSummary.calibrationText, copy.self.maskedValue);
  assert.notEqual(JSON.stringify(maskedSummary), JSON.stringify(summary));
  assert.doesNotMatch(JSON.stringify(maskedSummary), /1990|08:30|Shanghai|Asia\/Shanghai/);
  assert.doesNotMatch(JSON.stringify(maskedSummary), /Protected|已保护/);
});

test('initial scaffold self profile stays empty instead of protected', () => {
  const copy = getProductCopy('en');
  const summary = summarizeSelfSubject(buildEmptyShiJingSpace('u_empty'), copy);
  const maskedSummary = protectSelfProfileSummary(summary, copy, false);

  assert.equal(summary.hasData, false);
  assert.equal(summary.isComplete, false);
  assert.deepEqual(
    maskedSummary.coreFields.map((field) => field.value),
    [copy.self.missing, copy.self.missing, copy.self.missing],
  );
  assert.equal(maskedSummary.metaText, copy.self.missing);
  assert.equal(maskedSummary.calibrationText, null);
  assert.doesNotMatch(JSON.stringify(maskedSummary), /2000|Protected|\*/);
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
