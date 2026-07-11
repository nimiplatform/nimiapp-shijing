export type ShijingProtectedSessionState =
  | 'login-required'
  | 'runtime-unavailable'
  | 'permission-denied'
  | 'repair-required'
  | 'capability-unavailable';

export type ShijingProtectedSessionFailure = {
  readonly state: ShijingProtectedSessionState;
  readonly reasonCode: string;
  readonly actionHint: string;
  readonly message: string;
};

const LOGIN_REQUIRED_REASONS = new Set([
  'account-authentication-required',
  'runtime-account-authentication-required',
  'installed-app-account-authentication-required',
]);

const RUNTIME_UNAVAILABLE_REASONS = new Set([
  'runtime-service-unavailable',
  'runtime-service-not-running',
  'runtime-connection-unavailable',
  'installed-artifact-runtime-unavailable',
]);

const PERMISSION_DENIED_REASONS = new Set([
  'runtime-permission-denied',
  'installed-app-permission-denied',
  'installed-artifact-forbidden',
]);

const REPAIR_REQUIRED_REASONS = new Set([
  'protected-carrier-required',
  'SDK_INSTALLED_APP_PROTECTED_CARRIER_REQUIRED',
  'runtime-service-repair-required',
  'runtime-service-untrusted',
  'protected-peer-untrusted',
  'installed-app-release-untrusted',
  'installed-artifact-runtime-untrusted',
]);

export function classifyShijingProtectedSessionFailure(
  error: unknown,
): ShijingProtectedSessionFailure {
  const direct = asRecord(error);
  const message = messageFrom(error);
  const embedded = parseEmbeddedError(message);
  const reasonCode = firstText(
    direct?.reasonCode,
    direct?.code,
    embedded?.reasonCode,
    embedded?.code,
  ) || 'shijing-protected-operation-set-not-admitted';
  const actionHint = firstText(
    direct?.actionHint,
    embedded?.actionHint,
  ) || actionHintFor(reasonCode);

  return {
    state: stateFor(reasonCode),
    reasonCode,
    actionHint,
    message,
  };
}

function stateFor(reasonCode: string): ShijingProtectedSessionState {
  if (LOGIN_REQUIRED_REASONS.has(reasonCode)) return 'login-required';
  if (RUNTIME_UNAVAILABLE_REASONS.has(reasonCode)) return 'runtime-unavailable';
  if (PERMISSION_DENIED_REASONS.has(reasonCode)) return 'permission-denied';
  if (REPAIR_REQUIRED_REASONS.has(reasonCode)) return 'repair-required';
  return 'capability-unavailable';
}

function actionHintFor(reasonCode: string): string {
  const state = stateFor(reasonCode);
  if (state === 'login-required') return 'sign_in_with_nimi_desktop';
  if (state === 'runtime-unavailable') return 'start_verified_runtime_service';
  if (state === 'permission-denied') return 'review_installed_app_permissions';
  if (state === 'repair-required') return 'repair_verified_runtime_service';
  return 'wait_for_shijing_protected_operation_admission';
}

function messageFrom(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  const record = asRecord(error);
  return firstText(record?.message, record?.reasonCode, record?.code)
    || 'The protected ShiJing operation set is unavailable.';
}

function parseEmbeddedError(message: string): Record<string, unknown> | undefined {
  try {
    return asRecord(JSON.parse(message) as unknown);
  } catch {
    return undefined;
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function firstText(...values: readonly unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}
