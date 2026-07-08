import { createNimiClient, type NimiClient } from '@nimiplatform/sdk';
import {
  Runtime,
  createNimiDeveloperRegisteredRuntimeAccountCaller,
  createNimiRuntimeAppSessionMetadataProvider,
  createNimiRuntimeFullAppRegistration,
  toNimiRuntimeTimestamp,
  withNimiRuntimeIdempotencyMetadata,
  type NimiRuntimeAccountCaller,
  type RuntimeOptions,
} from '@nimiplatform/sdk/runtime';
import {
  AccountSessionState,
  AuthorizationPreset,
  ExternalPrincipalType,
  PolicyMode,
  type AccountProjection,
  type AuthorizeExternalPrincipalResponse,
} from '@nimiplatform/sdk/runtime/wire-types';
import {
  createNimiClientId,
  createNimiError,
  ReasonCode,
  type CoreMetadata,
} from '@nimiplatform/sdk/types';
import { hasElectronRuntime } from '@nimiplatform/kit/shell/renderer/bridge';
import {
  SHIJING_RUNTIME_APP_ID,
  SHIJING_RUNTIME_APP_INSTANCE_ID,
  SHIJING_RUNTIME_DEVICE_ID,
} from '../../contracts/app-identity.ts';

export {
  SHIJING_RUNTIME_APP_ID,
  SHIJING_RUNTIME_APP_INSTANCE_ID,
  SHIJING_RUNTIME_DEVICE_ID,
};

const SHIJING_RUNTIME_DEVELOPER_REGISTRATION = true;
const RUNTIME_APP_SESSION_INSTANCE_ID = `${SHIJING_RUNTIME_APP_ID}.platform-runtime-session`;
const RUNTIME_APP_SESSION_DEVICE_ID = 'platform-runtime-session';
const RUNTIME_APP_SESSION_TTL_SECONDS = 3600;
const RUNTIME_APP_SESSION_REFRESH_SKEW_MS = 30_000;
const RUNTIME_PROTECTED_SCOPES = ['ai.spend.meter'] as const;
const RUNTIME_PROTECTED_SCOPE_CATALOG_VERSION = 'sdk-v2';
const RUNTIME_PROTECTED_TOKEN_TTL_SECONDS = 3600;
const RUNTIME_PROTECTED_TOKEN_REFRESH_SKEW_MS = 60_000;
const RUNTIME_PROTECTED_CONSENT_ID = 'shijing-runtime-account';
const RUNTIME_BRIDGE_NAMESPACE = 'runtime_bridge';

export type ShijingAuthUser = {
  id: string;
  displayName: string;
};

export type ShijingRuntimeSession = {
  readonly client: NimiClient;
  readonly runtime: Runtime;
  readonly accountRuntime: Runtime;
  readonly accountCaller: NimiRuntimeAccountCaller;
};

export type ShijingRuntimeHostKind = 'node' | 'electron' | 'tauri';

export const shijingRuntimeAccountCaller = createNimiDeveloperRegisteredRuntimeAccountCaller({
  appId: SHIJING_RUNTIME_APP_ID,
  appInstanceId: SHIJING_RUNTIME_APP_INSTANCE_ID,
  deviceId: SHIJING_RUNTIME_DEVICE_ID,
});

let currentSession: ShijingRuntimeSession | null = null;

type ProtectedAccessMetadata = {
  readonly subjectUserId: string;
  readonly metadata: CoreMetadata;
  readonly expiresAtMs: number;
};

let protectedAccessCache: ProtectedAccessMetadata | null = null;

let protectedAccessInflight: {
  readonly subjectUserId: string;
  readonly promise: Promise<ProtectedAccessMetadata>;
} | null = null;

export async function configureShijingRuntimeSession(): Promise<ShijingRuntimeSession> {
  const runtimeHostKind = resolveShijingRuntimeHostKind();
  const transport = createShijingRuntimeTransportConfig(runtimeHostKind);
  const accountRuntime = new Runtime({
    appId: SHIJING_RUNTIME_APP_ID,
    transport,
  });
  await accountRuntime.ready();
  await registerShijingRuntimeAccountCaller(accountRuntime);

  const runtime = new Runtime(
    runtimeHostKind === 'electron'
      ? {
          appId: SHIJING_RUNTIME_APP_ID,
          transport,
        }
      : {
          appId: SHIJING_RUNTIME_APP_ID,
          transport,
          authMetadata: createShijingRuntimeAppSessionMetadataProvider(accountRuntime),
        },
  );
  const client = createNimiClient({
    appId: SHIJING_RUNTIME_APP_ID,
    runtime,
    realm: false,
    app: false,
    permissions: false,
  });
  await client.runtime.ready();
  const session: ShijingRuntimeSession = {
    client,
    runtime,
    accountRuntime,
    accountCaller: shijingRuntimeAccountCaller,
  };
  currentSession = session;
  return session;
}

export function getShijingRuntimeSession(): ShijingRuntimeSession {
  if (!currentSession) {
    throw createNimiError({
      message: 'ShiJing Runtime session is not ready.',
      reasonCode: ReasonCode.SDK_PLATFORM_CLIENT_NOT_READY,
      actionHint: 'run_shijing_bootstrap',
      source: 'sdk',
    });
  }
  return currentSession;
}

export function clearShijingRuntimeSession(): void {
  currentSession = null;
  protectedAccessCache = null;
  protectedAccessInflight = null;
}

export function normalizeShijingAccountProjection(
  projection: AccountProjection | null | undefined,
): ShijingAuthUser | null {
  const accountId = normalizeText(projection?.accountId);
  if (!accountId) return null;
  return {
    id: accountId,
    displayName: normalizeText(projection?.displayName),
  };
}

export async function loadShijingRuntimeAccountUser(
  runtime: Runtime,
): Promise<ShijingAuthUser | null> {
  const response = await runtime.account.getAccountSessionStatus({
    caller: shijingRuntimeAccountCaller,
  });
  if (response.state !== AccountSessionState.AUTHENTICATED) return null;
  return normalizeShijingAccountProjection(response.accountProjection);
}

export async function requireShijingRuntimeSubjectUserId(): Promise<string> {
  const session = getShijingRuntimeSession();
  const response = await session.accountRuntime.account.getAccountSessionStatus({
    caller: session.accountCaller,
  });
  const accountId = response.state === AccountSessionState.AUTHENTICATED
    ? normalizeText(response.accountProjection?.accountId)
    : '';
  if (!accountId) {
    throw createNimiError({
      message: 'ShiJing Runtime AI requires an authenticated Runtime account subject.',
      reasonCode: ReasonCode.AUTH_CONTEXT_MISSING,
      actionHint: 'complete_runtime_account_login',
      source: 'runtime',
    });
  }
  return accountId;
}

export async function logoutShijingRuntimeAccount(): Promise<void> {
  throw createNimiError({
    message: 'ShiJing is a developer-registered local app and cannot own Runtime account logout. Sign out from the first-party Desktop account surface.',
    reasonCode: ReasonCode.PRINCIPAL_UNAUTHORIZED,
    actionHint: 'use_desktop_account_surface',
    source: 'runtime',
  });
}

export function resolveShijingRuntimeHostKind(): ShijingRuntimeHostKind {
  if (isNodeRuntime()) {
    return 'node';
  }
  return hasElectronRuntime() ? 'electron' : 'tauri';
}

export function createShijingRuntimeTransportConfig(
  hostKind: ShijingRuntimeHostKind = resolveShijingRuntimeHostKind(),
): RuntimeOptions['transport'] | undefined {
  if (hostKind === 'node') {
    return undefined;
  }
  if (hostKind === 'electron') {
    return {
      type: 'electron-ipc',
    };
  }
  return {
    type: 'tauri-ipc',
    commandNamespace: RUNTIME_BRIDGE_NAMESPACE,
    eventNamespace: RUNTIME_BRIDGE_NAMESPACE,
  };
}

function isNodeRuntime(): boolean {
  if (typeof window !== 'undefined') {
    return false;
  }
  const maybeProcess = (globalThis as typeof globalThis & {
    process?: { versions?: { node?: string } };
  }).process;
  return Boolean(maybeProcess?.versions?.node);
}

async function registerShijingRuntimeAccountCaller(runtime: Runtime): Promise<void> {
  await createNimiRuntimeFullAppRegistration(
    () => ({ auth: runtime.auth }),
    {
      appId: SHIJING_RUNTIME_APP_ID,
      appInstanceId: shijingRuntimeAccountCaller.appInstanceId,
      deviceId: shijingRuntimeAccountCaller.deviceId,
      capabilities: [...RUNTIME_PROTECTED_SCOPES],
      developerRegistration: SHIJING_RUNTIME_DEVELOPER_REGISTRATION,
      rejectionLabel: 'ShiJing Runtime account caller registration rejected',
    },
  )();
}

function createShijingRuntimeAppSessionMetadataProvider(
  accountRuntime: Runtime,
): () => Promise<CoreMetadata> {
  const requiredRuntimeSessionMetadata = createNimiRuntimeAppSessionMetadataProvider({
    appId: SHIJING_RUNTIME_APP_ID,
    appInstanceId: RUNTIME_APP_SESSION_INSTANCE_ID,
    deviceId: RUNTIME_APP_SESSION_DEVICE_ID,
    capabilities: [...RUNTIME_PROTECTED_SCOPES],
    ttlSeconds: RUNTIME_APP_SESSION_TTL_SECONDS,
    refreshSkewMs: RUNTIME_APP_SESSION_REFRESH_SKEW_MS,
    developerRegistration: SHIJING_RUNTIME_DEVELOPER_REGISTRATION,
    auth: accountRuntime.auth,
  });

  return async () => {
    const session = await accountRuntime.account.getAccountSessionStatus({
      caller: shijingRuntimeAccountCaller,
    });
    const subjectUserId = session.state === AccountSessionState.AUTHENTICATED
      ? normalizeText(session.accountProjection?.accountId)
      : '';
    if (!subjectUserId) {
      return {};
    }
    const appSessionMetadata = await requiredRuntimeSessionMetadata();
    const protectedAccessMetadata = await getShijingRuntimeProtectedAccessMetadata(
      accountRuntime,
      subjectUserId,
    );
    return {
      ...appSessionMetadata,
      ...protectedAccessMetadata,
    };
  };
}

async function getShijingRuntimeProtectedAccessMetadata(
  accountRuntime: Runtime,
  subjectUserId: string,
): Promise<CoreMetadata> {
  if (
    protectedAccessCache
    && protectedAccessCache.subjectUserId === subjectUserId
    && protectedAccessCache.expiresAtMs - Date.now() > RUNTIME_PROTECTED_TOKEN_REFRESH_SKEW_MS
  ) {
    return protectedAccessCache.metadata;
  }
  if (!protectedAccessInflight || protectedAccessInflight.subjectUserId !== subjectUserId) {
    protectedAccessInflight = {
      subjectUserId,
      promise: issueShijingRuntimeProtectedAccessMetadata(accountRuntime, subjectUserId),
    };
  }
  const inflight = protectedAccessInflight;
  try {
    const issued = await inflight.promise;
    protectedAccessCache = issued;
    return issued.metadata;
  } finally {
    if (protectedAccessInflight === inflight) {
      protectedAccessInflight = null;
    }
  }
}

async function issueShijingRuntimeProtectedAccessMetadata(
  accountRuntime: Runtime,
  subjectUserId: string,
): Promise<ProtectedAccessMetadata> {
  const token = await accountRuntime.grants.authorizeExternalPrincipal({
    domain: 'app-auth',
    appId: SHIJING_RUNTIME_APP_ID,
    externalPrincipalId: SHIJING_RUNTIME_APP_ID,
    externalPrincipalType: ExternalPrincipalType.APP,
    subjectUserId,
    consentId: RUNTIME_PROTECTED_CONSENT_ID,
    consentVersion: 'v1',
    decisionAt: toNimiRuntimeTimestamp(new Date()),
    policyVersion: 'shijing-runtime-account-v1',
    policyMode: PolicyMode.CUSTOM,
    preset: AuthorizationPreset.UNSPECIFIED,
    scopes: [...RUNTIME_PROTECTED_SCOPES],
    resourceSelectors: {
      conversationIds: [],
      messageIds: [],
      documentIds: [],
      labels: {},
    },
    canDelegate: false,
    maxDelegationDepth: 0,
    ttlSeconds: RUNTIME_PROTECTED_TOKEN_TTL_SECONDS,
    scopeCatalogVersion: RUNTIME_PROTECTED_SCOPE_CATALOG_VERSION,
    policyOverride: false,
  }, withNimiRuntimeIdempotencyMetadata({
    metadata: { domain: 'app-auth' },
  }, createRuntimeProtectedAccessIdempotencyKey(subjectUserId)));
  const tokenId = normalizeText(token.tokenId);
  const secret = normalizeText(token.secret);
  if (!tokenId || !secret) {
    throw createNimiError({
      message: 'ShiJing Runtime protected access token response is missing credentials.',
      reasonCode: ReasonCode.PRINCIPAL_UNAUTHORIZED,
      actionHint: 'authorize_shijing_runtime_protected_access',
      source: 'runtime',
    });
  }
  return {
    subjectUserId,
    metadata: {
      'x-nimi-access-token-id': tokenId,
      'x-nimi-access-token-secret': secret,
    },
    expiresAtMs: runtimeTimestampMillis(token)
      || Date.now() + (RUNTIME_PROTECTED_TOKEN_TTL_SECONDS * 1000),
  };
}

function createRuntimeProtectedAccessIdempotencyKey(subjectUserId: string): string {
  const normalizedSubject = subjectUserId.replace(/[^a-zA-Z0-9._:-]/g, '_').slice(0, 80) || 'unknown';
  return createNimiClientId(`shijing-runtime-protected-${normalizedSubject}`);
}

function runtimeTimestampMillis(token: AuthorizeExternalPrincipalResponse): number {
  const expiresAt = token.expiresAt;
  if (!expiresAt) return 0;
  const seconds = Number(expiresAt.seconds || 0);
  const nanos = Number(expiresAt.nanos || 0);
  const millis = (seconds * 1000) + Math.floor(nanos / 1_000_000);
  return Number.isFinite(millis) && millis > 0 ? millis : 0;
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
