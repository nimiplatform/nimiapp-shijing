import {
  createInstalledNimiAppBootstrap,
  createNimiClient,
  type NimiClient,
} from '@nimiplatform/sdk';
import { createNimiError } from '@nimiplatform/sdk/types';
import {
  Runtime,
  type NimiRuntimeAccountCaller,
  type RuntimeOptions,
} from '@nimiplatform/sdk/runtime';
import {
  AccountSessionState,
  type AccountProjection,
} from '@nimiplatform/sdk/runtime/wire-types';
import {
  SHIJING_RUNTIME_APP_ID,
} from '../../contracts/app-identity.ts';
import {
  createInstalledNimiAppStandardShellSurface,
  hasElectronRuntime,
  hasTauriRuntime,
  readInstalledNimiAppLaunchBinding,
} from '../bridge/index.ts';

const RUNTIME_BRIDGE_NAMESPACE = 'runtime_bridge';

export type ShijingAuthUser = {
  readonly id: string;
  readonly displayName: string;
};

export type ShijingRuntimeHostKind = 'node' | 'electron' | 'tauri';

export type ShijingRuntimeSession = {
  readonly client: NimiClient;
  readonly runtime: Runtime;
  readonly accountRuntime: Runtime;
  readonly accountCaller: NimiRuntimeAccountCaller;
};

let currentSession: ShijingRuntimeSession | null = null;

export function clearShijingRuntimeSession(): void {
  currentSession = null;
}

export function getShijingRuntimeSession(): ShijingRuntimeSession {
  if (!currentSession) {
    throw createShijingRuntimeUnavailableError(
      'ShiJing Runtime session is unavailable.',
      'run_shijing_installed_app_bootstrap',
    );
  }
  return currentSession;
}

export function normalizeShijingAccountProjection(
  projection: AccountProjection | null | undefined,
): ShijingAuthUser | null {
  const accountId = String(projection?.accountId || '').trim();
  if (!accountId) {
    return null;
  }
  return {
    id: accountId,
    displayName: String(projection?.displayName || accountId).trim(),
  };
}

export async function loadShijingRuntimeAccountUser(
  runtime: Runtime,
  caller: NimiRuntimeAccountCaller = getShijingRuntimeSession().accountCaller,
): Promise<ShijingAuthUser | null> {
  const response = await runtime.account.getAccountSessionStatus({ caller });
  if (response.state !== AccountSessionState.AUTHENTICATED) {
    return null;
  }
  return normalizeShijingAccountProjection(response.accountProjection);
}

export async function requireShijingRuntimeSubjectUserId(): Promise<string> {
  const session = getShijingRuntimeSession();
  const user = await loadShijingRuntimeAccountUser(session.accountRuntime, session.accountCaller);
  const subjectUserId = String(user?.id || '').trim();
  if (!subjectUserId) {
    throw createShijingRuntimeUnavailableError(
      'ShiJing Runtime AI requires an authenticated Runtime account.',
      'authenticate_in_nimi_desktop_account_surface',
    );
  }
  return subjectUserId;
}

export async function logoutShijingRuntimeAccount(): Promise<void> {
  throw createShijingRuntimeUnavailableError(
    'ShiJing is an installed Nimi app and cannot own Runtime account logout.',
    'use_nimi_desktop_account_surface',
  );
}

export function resolveShijingRuntimeHostKind(): ShijingRuntimeHostKind {
  if (hasElectronRuntime()) {
    return 'electron';
  }
  if (hasTauriRuntime() || typeof window !== 'undefined') {
    return 'tauri';
  }
  return 'node';
}

export function createShijingRuntimeTransportConfig(): RuntimeOptions['transport'] | undefined {
  const runtimeHostKind = resolveShijingRuntimeHostKind();
  if (runtimeHostKind === 'electron') {
    return { type: 'electron-ipc' };
  }
  if (runtimeHostKind === 'tauri') {
    return {
      type: 'tauri-ipc',
      commandNamespace: RUNTIME_BRIDGE_NAMESPACE,
      eventNamespace: RUNTIME_BRIDGE_NAMESPACE,
    };
  }
  return undefined;
}

export async function configureShijingRuntimeSession(): Promise<ShijingRuntimeSession> {
  const standardShell = createInstalledNimiAppStandardShellSurface();
  const launchBinding = readInstalledNimiAppLaunchBinding();
  if (launchBinding.appId !== SHIJING_RUNTIME_APP_ID) {
    throw createShijingRuntimeUnavailableError(
      `ShiJing received launch binding for ${launchBinding.appId}.`,
      'launch_matching_shijing_app_id',
    );
  }
  const realmBaseUrl = requireHostProjectedRealmBaseUrl(launchBinding.realmBaseUrl);
  const runtime = new Runtime({
    appId: SHIJING_RUNTIME_APP_ID,
    transport: createShijingRuntimeTransportConfig(),
    metadata: {
      surfaceId: 'shijing.runtime',
    },
  });
  const bootstrap = createInstalledNimiAppBootstrap({
    realmBaseUrl,
    runtime,
    launchBinding,
    standardShell,
  });
  const client = createNimiClient({
    appId: SHIJING_RUNTIME_APP_ID,
    runtime: bootstrap.runtime,
    realm: false,
    app: false,
    permissions: false,
  });
  await client.runtime.ready();
  currentSession = {
    client,
    runtime: bootstrap.runtime,
    accountRuntime: bootstrap.runtime,
    accountCaller: bootstrap.accountCaller,
  };
  return currentSession;
}

function requireHostProjectedRealmBaseUrl(value: unknown): string {
  const realmBaseUrl = String(value || '').trim();
  if (!realmBaseUrl) {
    throw createShijingRuntimeUnavailableError(
      'ShiJing requires host-projected Realm base URL.',
      'provide_installed_app_realm_base_url_projection',
    );
  }
  return realmBaseUrl;
}

function createShijingRuntimeUnavailableError(message: string, actionHint: string): Error {
  return createNimiError({
    message,
    reasonCode: 'SHIJING_RUNTIME_SESSION_UNAVAILABLE',
    actionHint,
    source: 'sdk',
  });
}
