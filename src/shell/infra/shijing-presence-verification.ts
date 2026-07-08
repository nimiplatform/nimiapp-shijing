import {
  AccountReasonCode,
  PresenceVerificationMethod as RuntimePresenceVerificationMethod,
  PresenceVerificationState as RuntimePresenceVerificationState,
  type RequestPresenceVerificationResponse,
} from '@nimiplatform/sdk/runtime/wire-types';
import type {
  PresenceVerificationClient,
  PresenceVerificationMethod,
  PresenceVerificationResult,
} from '../../product/privacy/presence-verification.ts';
import { getShijingRuntimeSession } from './shijing-runtime-session.ts';

export function createShijingPresenceVerificationClient(): PresenceVerificationClient {
  return {
    async requestPresenceVerification(request) {
      try {
        const session = getShijingRuntimeSession();
        const response = await session.accountRuntime.account.requestPresenceVerification({
          caller: session.accountCaller,
          purpose: request.purpose,
          ttlSeconds: request.ttlSeconds,
        });
        return mapRuntimePresenceVerificationResponse(response);
      } catch (error) {
        return {
          state: 'unavailable',
          reason: mapRuntimePresenceVerificationErrorReason(error),
        };
      }
    },
  };
}

export function mapRuntimePresenceVerificationResponse(
  response: RequestPresenceVerificationResponse,
): PresenceVerificationResult {
  const subjectUserId = response.accountProjection?.accountId.trim() ?? '';
  if (
    response.accepted
    && response.state === RuntimePresenceVerificationState.VERIFIED
    && subjectUserId
  ) {
    const verifiedUntilMs = runtimeTimestampMillis(response.verifiedUntil);
    if (verifiedUntilMs !== null && verifiedUntilMs > Date.now()) {
      return {
        state: 'verified',
        subjectUserId,
        verifiedUntilMs,
        method: mapRuntimePresenceVerificationMethod(response.method),
      };
    }
  }

  if (
    response.state === RuntimePresenceVerificationState.UNAVAILABLE
    || response.accountReasonCode === AccountReasonCode.PRESENCE_VERIFICATION_UNAVAILABLE
  ) {
    return { state: 'unavailable', reason: runtimePresenceReason(response) };
  }

  return { state: 'rejected', reason: runtimePresenceReason(response) };
}

function mapRuntimePresenceVerificationMethod(
  method: RuntimePresenceVerificationMethod,
): PresenceVerificationMethod {
  switch (method) {
    case RuntimePresenceVerificationMethod.OS_CREDENTIAL:
      return 'os_presence';
    case RuntimePresenceVerificationMethod.NIMI_REAUTH:
      return 'desktop_account';
    default:
      return 'unknown';
  }
}

function runtimePresenceReason(response: RequestPresenceVerificationResponse): string {
  switch (response.accountReasonCode) {
    case AccountReasonCode.PRESENCE_VERIFICATION_UNAVAILABLE:
      return 'runtime_presence_unavailable';
    case AccountReasonCode.ACCOUNT_UNAVAILABLE:
      return 'runtime_account_unavailable';
    case AccountReasonCode.CALLER_UNAUTHORIZED:
      return 'runtime_presence_caller_unauthorized';
    case AccountReasonCode.PROOF_MISMATCHED:
      return 'presence_verification_rejected';
    default:
      return 'presence_verification_failed';
  }
}

export function mapRuntimePresenceVerificationErrorReason(error: unknown): string {
  const fields = errorFields(error);
  const candidates = [
    fields.accountReasonCode,
    fields.reasonCode,
    fields.code,
    error instanceof Error ? error.message : undefined,
    typeof error === 'string' ? error : undefined,
  ];
  for (const candidate of candidates) {
    const reason = normalizeRuntimePresenceReasonText(candidate);
    if (reason) return reason;
  }
  return 'runtime_presence_unavailable';
}

function errorFields(error: unknown): {
  readonly accountReasonCode?: unknown;
  readonly code?: unknown;
  readonly reasonCode?: unknown;
} {
  if (!error || typeof error !== 'object') return {};
  return error as {
    readonly accountReasonCode?: unknown;
    readonly code?: unknown;
    readonly reasonCode?: unknown;
  };
}

function normalizeRuntimePresenceReasonText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  switch (value.trim()) {
    case 'PRESENCE_VERIFICATION_UNAVAILABLE':
    case 'ACCOUNT_REASON_CODE_PRESENCE_VERIFICATION_UNAVAILABLE':
      return 'runtime_presence_unavailable';
    case 'ACCOUNT_UNAVAILABLE':
    case 'ACCOUNT_REASON_CODE_ACCOUNT_UNAVAILABLE':
      return 'runtime_account_unavailable';
    case 'CALLER_UNAUTHORIZED':
    case 'ACCOUNT_REASON_CODE_CALLER_UNAUTHORIZED':
      return 'runtime_presence_caller_unauthorized';
    case 'PROOF_MISMATCHED':
    case 'ACCOUNT_REASON_CODE_PROOF_MISMATCHED':
      return 'presence_verification_rejected';
    default:
      return null;
  }
}

function runtimeTimestampMillis(
  timestamp: RequestPresenceVerificationResponse['verifiedUntil'],
): number | null {
  if (!timestamp) return null;
  const seconds = Number(timestamp.seconds);
  const nanos = Number(timestamp.nanos ?? 0);
  if (!Number.isFinite(seconds) || !Number.isFinite(nanos)) return null;
  return seconds * 1000 + Math.floor(nanos / 1_000_000);
}
