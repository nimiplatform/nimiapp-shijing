import { createNimiClient } from '@nimiplatform/sdk';
import type { NimiLocalAppClient } from '@nimiplatform/sdk/app';
import { createNimiLocalAppStandardShellSurface } from '@nimiplatform/kit/shell/renderer/bridge';

export const SHIJING_AGENTS_INTERACT_PERMISSION = 'agents.interact';
export const SHIJING_AGENTS_INTERACT_REASON =
  '允许时镜使用您账户中的 Agent 完成基于占星解读的咨询对话。';

/**
 * The only renderer entry into the Desktop-supervised local-app carrier.
 * Kit owns the host bridge and SDK owns projection validation; ShiJing never
 * receives a principal, grant id, session proof, endpoint, or bearer.
 */
export const shijingLocalAppRuntimePlatform: NimiLocalAppClient = createNimiClient({
  localApp: {
    standardShell: createNimiLocalAppStandardShellSurface(),
  },
});

export type ShijingLocalAppErrorEvidence = {
  readonly reasonCode: string;
  readonly actionHint: string;
  readonly message: string;
  readonly retryable: boolean;
};

const SHIJING_LOCAL_APP_RESPONSE_DEADLINE_MS = 10_000;

export async function withShijingLocalAppResponseDeadline<T>(
  operation: Promise<T>,
  operationName: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timeoutId = setTimeout(() => {
          reject(Object.assign(
            new Error(`ShiJing local-app carrier timed out during ${operationName}.`),
            {
              reasonCode: 'runtime-service-unavailable',
              actionHint: 'retry_from_nimi_desktop_local_development_supervisor',
              retryable: true,
            },
          ));
        }, SHIJING_LOCAL_APP_RESPONSE_DEADLINE_MS);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

export function normalizeShijingLocalAppError(
  error: unknown,
): ShijingLocalAppErrorEvidence {
  const direct = asRecord(error);
  const message = error instanceof Error
    ? error.message.trim()
    : firstText(direct?.message) || String(error || '').trim();
  const embedded = parseEmbeddedRecord(message);
  const envelope = asRecord(direct?.envelope) ?? asRecord(embedded?.envelope);
  const reasonCode = firstText(
    direct?.reasonCode,
    embedded?.reasonCode,
    envelope?.reasonCode,
    direct?.code,
    embedded?.code,
    envelope?.code,
  ) || 'local-app-operation-failed';
  const actionHint = firstText(
    direct?.actionHint,
    embedded?.actionHint,
    envelope?.actionHint,
  ) || 'refresh_local_app_runtime_projection';
  const retryable = firstBoolean(
    direct?.retryable,
    embedded?.retryable,
    envelope?.retryable,
  ) ?? false;
  return {
    reasonCode,
    actionHint,
    message: message || reasonCode,
    retryable,
  };
}

function parseEmbeddedRecord(value: string): Record<string, unknown> | undefined {
  try {
    return asRecord(JSON.parse(value) as unknown);
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
