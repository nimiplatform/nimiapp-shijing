import type { ProductCopy } from '../i18n/copy.ts';
import type { PresenceVerificationResult } from '../privacy/presence-verification.ts';
import type { SelfProfileSummary } from './self-summary.ts';

export function protectSelfProfileSummary(
  summary: SelfProfileSummary,
  copy: ProductCopy,
  revealSensitive: boolean,
): SelfProfileSummary {
  if (revealSensitive || !summary.hasData) return summary;

  return {
    ...summary,
    coreFields: summary.coreFields.map((field) =>
      field.missing ? field : { ...field, value: copy.self.maskedValue },
    ),
    metaText: summary.metaMissing ? summary.metaText : copy.self.maskedValue,
    calibrationText: summary.calibrationText ? copy.self.maskedValue : null,
  };
}

export function isPresenceVerificationForSelfProfile(
  result: PresenceVerificationResult,
  selfUserId: string,
  nowMs = Date.now(),
): result is Extract<PresenceVerificationResult, { readonly state: 'verified' }> {
  return selfProfilePresenceVerificationFailureReason(result, selfUserId, nowMs) === null;
}

export function selfProfilePresenceVerificationFailureReason(
  result: PresenceVerificationResult,
  selfUserId: string,
  nowMs = Date.now(),
): string | null {
  if (result.state !== 'verified') {
    if (result.state === 'cancelled') return 'presence_verification_cancelled';
    return result.reason;
  }
  if (result.verifiedUntilMs <= nowMs) return 'presence_verification_expired';
  if (normalizeProfileSubjectId(result.subjectUserId) !== normalizeProfileSubjectId(selfUserId)) {
    return 'presence_subject_mismatch';
  }
  return null;
}

function normalizeProfileSubjectId(value: string): string {
  return value.trim();
}
