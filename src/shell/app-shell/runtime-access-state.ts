/**
 * ShiJing runtime-access posture (App Access regime).
 *
 * Access loss never quits the app and never replaces the host. Every failure
 * is typed and bounded; the boundary page offers an in-place retry on the
 * same host while the platform owns any rebind.
 */
export type ShijingRuntimeAccessState =
  | 'action-required'
  | 'access-ended'
  | 'runtime-unavailable'
  | 'capability-unavailable';

export type ShijingRuntimeAccessFailure = {
  readonly state: ShijingRuntimeAccessState;
  readonly reasonCode: string;
  readonly actionHint: string;
  readonly message: string;
  readonly retryable: boolean;
};

export type ShijingRuntimeAccessSessionInput = {
  readonly state: string;
  readonly reasonCode: string;
  readonly actionHint: string;
  readonly retryable: boolean;
};

const ACTION_REQUIRED_SESSION_STATES = new Set([
  'action-required',
]);

const ACCESS_ENDED_SESSION_STATES = new Set([
  'revoked',
  'account-changed',
  'project-changed',
]);

const RUNTIME_UNAVAILABLE_SESSION_STATES = new Set([
  'process-replaced',
  'runtime-restarted',
  'unavailable',
]);

const ACTION_REQUIRED_REASONS = new Set([
  'account-authentication-required',
  'runtime-account-authentication-required',
]);

const RUNTIME_UNAVAILABLE_REASONS = new Set([
  'runtime-service-unavailable',
  'runtime-service-not-running',
  'runtime-connection-unavailable',
  'electron-runtime-bridge-unavailable',
  'electron-runtime-endpoint-unavailable',
]);

export function shijingRuntimeAccessFromSession(
  session: ShijingRuntimeAccessSessionInput,
): ShijingRuntimeAccessFailure {
  const state = stateForSessionState(session.state);
  return {
    state,
    reasonCode: session.reasonCode || `shijing-session-${session.state || 'unknown'}`,
    actionHint: session.actionHint || actionHintFor(state),
    message: `Nimi access session state is ${session.state || 'unknown'}.`,
    retryable: session.retryable,
  };
}

export function classifyShijingRuntimeAccessFailure(
  error: unknown,
): ShijingRuntimeAccessFailure {
  const direct = asRecord(error);
  const message = messageFrom(error);
  const embedded = parseEmbeddedError(message);
  const reasonCode = firstText(
    direct?.reasonCode,
    direct?.code,
    embedded?.reasonCode,
    embedded?.code,
  ) || 'shijing-runtime-access-unavailable';
  const state = stateForReasonCode(reasonCode);

  return {
    state,
    reasonCode,
    actionHint: firstText(
      direct?.actionHint,
      embedded?.actionHint,
    ) || actionHintFor(state),
    message,
    retryable: firstBoolean(
      direct?.retryable,
      embedded?.retryable,
    ) ?? state !== 'capability-unavailable',
  };
}

function stateForSessionState(sessionState: string): ShijingRuntimeAccessState {
  if (ACTION_REQUIRED_SESSION_STATES.has(sessionState)) return 'action-required';
  if (ACCESS_ENDED_SESSION_STATES.has(sessionState)) return 'access-ended';
  if (RUNTIME_UNAVAILABLE_SESSION_STATES.has(sessionState)) return 'runtime-unavailable';
  return 'capability-unavailable';
}

function stateForReasonCode(reasonCode: string): ShijingRuntimeAccessState {
  if (ACTION_REQUIRED_REASONS.has(reasonCode)) return 'action-required';
  if (RUNTIME_UNAVAILABLE_REASONS.has(reasonCode)) return 'runtime-unavailable';
  return 'capability-unavailable';
}

function actionHintFor(state: ShijingRuntimeAccessState): string {
  if (state === 'action-required') return 'finish_action_in_nimi_desktop';
  if (state === 'access-ended') return 'relaunch_or_retry_same_host';
  if (state === 'runtime-unavailable') return 'start_runtime_from_nimi_desktop';
  return 'retry_same_host';
}

function messageFrom(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  const record = asRecord(error);
  return firstText(record?.message, record?.reasonCode, record?.code)
    || 'Nimi access is unavailable.';
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

function firstBoolean(...values: readonly unknown[]): boolean | undefined {
  for (const value of values) {
    if (typeof value === 'boolean') return value;
  }
  return undefined;
}
