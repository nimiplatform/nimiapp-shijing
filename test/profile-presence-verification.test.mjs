import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  AccountReasonCode,
  PresenceVerificationMethod,
  PresenceVerificationState,
  ReasonCode,
} from '@nimiplatform/sdk/runtime/generated';
import { getProductCopy } from '../src/product/i18n/copy.ts';
import { createUnavailablePresenceVerificationClient } from '../src/product/privacy/presence-verification.ts';
import {
  mapRuntimePresenceVerificationErrorReason,
  mapRuntimePresenceVerificationResponse,
} from '../src/shell/infra/shijing-presence-verification.ts';

const storeSource = readFileSync(
  new URL('../src/product/state/shijing-store.tsx', import.meta.url),
  'utf8',
);
const productAreaSource = readFileSync(
  new URL('../src/shell/routes/product-area.tsx', import.meta.url),
  'utf8',
);
const shellPresenceSource = readFileSync(
  new URL('../src/shell/infra/shijing-presence-verification.ts', import.meta.url),
  'utf8',
);

test('unavailable presence verification client fails closed', async () => {
  const client = createUnavailablePresenceVerificationClient('runtime_presence_unavailable');
  const result = await client.requestPresenceVerification({
    purpose: 'shijing.profile.reveal',
    level: 'presence',
    ttlSeconds: 300,
  });

  assert.deepEqual(result, {
    state: 'unavailable',
    reason: 'runtime_presence_unavailable',
  });
});

test('shijing store exposes an injected presence verification client', () => {
  assert.match(storeSource, /presence_verification_client/);
  assert.match(storeSource, /presenceVerificationClient\?: PresenceVerificationClient/);
  assert.match(storeSource, /createUnavailablePresenceVerificationClient/);
});

test('product area injects the shell Nimi presence verification seam', () => {
  assert.match(productAreaSource, /createShijingPresenceVerificationClient/);
  assert.match(productAreaSource, /presenceVerificationClient=\{presenceVerificationClient\}/);
});

test('shell presence verification calls the SDK account projection directly', () => {
  assert.match(
    shellPresenceSource,
    /session\.accountRuntime\.account\.requestPresenceVerification\(\{/,
  );
  assert.match(shellPresenceSource, /caller: session\.accountCaller/);
  assert.match(shellPresenceSource, /ttlSeconds: request\.ttlSeconds/);
  assert.doesNotMatch(shellPresenceSource, /typeof\s+\w+\.requestPresenceVerification/);
  assert.doesNotMatch(shellPresenceSource, /FutureRuntimePresenceAccount/);
});

test('runtime presence mapper normalizes verified account projection', () => {
  const verifiedUntilMs = Date.now() + 60_000;
  const result = mapRuntimePresenceVerificationResponse({
    accepted: true,
    state: PresenceVerificationState.VERIFIED,
    method: PresenceVerificationMethod.OS_CREDENTIAL,
    verifiedUntil: runtimeTimestamp(verifiedUntilMs),
    accountProjection: {
      accountId: ' user-1 ',
      displayName: '',
      realmEnvironmentId: '',
      workspaceMemberships: [],
    },
    purpose: 'shijing.profile.reveal',
    reasonCode: ReasonCode.ACTION_EXECUTED,
    accountReasonCode: AccountReasonCode.ACTION_EXECUTED,
    productionInert: false,
  });

  assert.deepEqual(result, {
    state: 'verified',
    subjectUserId: 'user-1',
    verifiedUntilMs,
    method: 'os_presence',
  });
});

test('runtime presence mapper fails closed for unusable responses', () => {
  const verifiedUntilMs = Date.now() + 60_000;

  assert.equal(mapRuntimePresenceVerificationResponse({
    accepted: true,
    state: PresenceVerificationState.VERIFIED,
    method: PresenceVerificationMethod.OS_CREDENTIAL,
    verifiedUntil: runtimeTimestamp(verifiedUntilMs),
    accountProjection: {
      accountId: '   ',
      displayName: '',
      realmEnvironmentId: '',
      workspaceMemberships: [],
    },
    purpose: 'shijing.profile.reveal',
    reasonCode: ReasonCode.ACTION_EXECUTED,
    accountReasonCode: AccountReasonCode.ACTION_EXECUTED,
    productionInert: false,
  }).state, 'rejected');

  assert.equal(mapRuntimePresenceVerificationResponse({
    accepted: true,
    state: PresenceVerificationState.VERIFIED,
    method: PresenceVerificationMethod.OS_CREDENTIAL,
    verifiedUntil: runtimeTimestamp(Date.now() - 1_000),
    accountProjection: {
      accountId: 'user-1',
      displayName: '',
      realmEnvironmentId: '',
      workspaceMemberships: [],
    },
    purpose: 'shijing.profile.reveal',
    reasonCode: ReasonCode.ACTION_EXECUTED,
    accountReasonCode: AccountReasonCode.ACTION_EXECUTED,
    productionInert: false,
  }).state, 'rejected');

  assert.equal(mapRuntimePresenceVerificationResponse({
    accepted: false,
    state: PresenceVerificationState.UNAVAILABLE,
    method: PresenceVerificationMethod.UNSPECIFIED,
    purpose: 'shijing.profile.reveal',
    reasonCode: ReasonCode.PRINCIPAL_UNAUTHORIZED,
    accountReasonCode: AccountReasonCode.PRESENCE_VERIFICATION_UNAVAILABLE,
    productionInert: false,
  }).state, 'unavailable');
});

test('runtime presence unavailable renders as product copy instead of protocol code', () => {
  const result = mapRuntimePresenceVerificationResponse({
    accepted: false,
    state: PresenceVerificationState.UNAVAILABLE,
    method: PresenceVerificationMethod.UNSPECIFIED,
    purpose: 'shijing.profile.reveal',
    reasonCode: ReasonCode.PRINCIPAL_UNAUTHORIZED,
    accountReasonCode: AccountReasonCode.PRESENCE_VERIFICATION_UNAVAILABLE,
    productionInert: false,
  });

  assert.deepEqual(result, {
    state: 'unavailable',
    reason: 'runtime_presence_unavailable',
  });

  const zhRendered = getProductCopy('zh').self.revealSensitiveFailed(result.reason);
  assert.doesNotMatch(zhRendered, /PRESENCE_VERIFICATION_UNAVAILABLE/);
  assert.doesNotMatch(zhRendered, /runtime_presence_unavailable/);
  assert.match(zhRendered, /当前设备还没有可用的 Nimi 本机本人确认能力/);

  const rendered = getProductCopy('en').self.revealSensitiveFailed(result.reason);
  assert.doesNotMatch(rendered, /PRESENCE_VERIFICATION_UNAVAILABLE/);
  assert.doesNotMatch(rendered, /runtime_presence_unavailable/);
  assert.match(rendered, /Nimi presence verification is not available/);
});

test('runtime presence transport error is normalized before rendering', () => {
  const reason = mapRuntimePresenceVerificationErrorReason(
    new Error('PRESENCE_VERIFICATION_UNAVAILABLE'),
  );
  assert.equal(reason, 'runtime_presence_unavailable');

  const rendered = getProductCopy('zh').self.revealSensitiveFailed(reason);
  assert.doesNotMatch(rendered, /PRESENCE_VERIFICATION_UNAVAILABLE/);
  assert.doesNotMatch(rendered, /runtime_presence_unavailable/);
  assert.match(rendered, /完整资料会继续隐藏/);
});

test('unknown runtime presence reason does not render raw protocol text', () => {
  const result = mapRuntimePresenceVerificationResponse({
    accepted: false,
    state: PresenceVerificationState.REJECTED,
    method: PresenceVerificationMethod.UNSPECIFIED,
    purpose: 'shijing.profile.reveal',
    reasonCode: ReasonCode.PRINCIPAL_UNAUTHORIZED,
    accountReasonCode: AccountReasonCode.ACTION_EXECUTED,
    productionInert: false,
  });

  assert.deepEqual(result, {
    state: 'rejected',
    reason: 'presence_verification_failed',
  });

  const rendered = getProductCopy('zh').self.revealSensitiveFailed('NEW_RUNTIME_PROTOCOL_CODE');
  assert.doesNotMatch(rendered, /NEW_RUNTIME_PROTOCOL_CODE/);
  assert.match(rendered, /完整资料会继续隐藏/);
});

function runtimeTimestamp(ms) {
  return {
    seconds: String(Math.floor(ms / 1000)),
    nanos: (ms % 1000) * 1_000_000,
  };
}
