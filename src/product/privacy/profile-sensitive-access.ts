export interface ProfileSensitiveAccess {
  readonly revealSensitive: boolean;
  readonly verificationPending: boolean;
  readonly verificationError: string | null;
  readonly ensureSensitiveReveal: () => Promise<boolean>;
  readonly lockSensitiveProfile: () => void;
}

export const LOCKED_PROFILE_SENSITIVE_ACCESS: ProfileSensitiveAccess = {
  revealSensitive: false,
  verificationPending: false,
  verificationError: null,
  ensureSensitiveReveal: async () => false,
  lockSensitiveProfile: () => undefined,
};
