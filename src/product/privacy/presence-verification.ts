export type PresenceVerificationPurpose = 'shijing.profile.reveal';

export type PresenceVerificationLevel = 'presence';

export type PresenceVerificationMethod =
  | 'password'
  | 'totp'
  | 'os_presence'
  | 'desktop_account'
  | 'unknown';

export interface PresenceVerificationRequest {
  readonly purpose: PresenceVerificationPurpose;
  readonly level: PresenceVerificationLevel;
  readonly ttlSeconds: number;
}

export type PresenceVerificationResult =
  | {
      readonly state: 'verified';
      readonly subjectUserId: string;
      readonly verifiedUntilMs: number;
      readonly method: PresenceVerificationMethod;
    }
  | { readonly state: 'cancelled' }
  | { readonly state: 'rejected'; readonly reason: string }
  | { readonly state: 'unavailable'; readonly reason: string };

export interface PresenceVerificationClient {
  requestPresenceVerification(
    request: PresenceVerificationRequest,
  ): Promise<PresenceVerificationResult>;
}

export const SHIJING_PROFILE_REVEAL_PRESENCE_REQUEST: PresenceVerificationRequest = {
  purpose: 'shijing.profile.reveal',
  level: 'presence',
  ttlSeconds: 300,
};

export function createUnavailablePresenceVerificationClient(
  reason: string,
): PresenceVerificationClient {
  return {
    async requestPresenceVerification() {
      return { state: 'unavailable', reason };
    },
  };
}

export function isVerifiedPresenceResult(
  result: PresenceVerificationResult,
  nowMs = Date.now(),
): result is Extract<PresenceVerificationResult, { readonly state: 'verified' }> {
  return result.state === 'verified' && result.verifiedUntilMs > nowMs;
}
