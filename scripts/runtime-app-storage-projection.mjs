import {
  Runtime,
  createNimiRuntimeAppSessionMetadataProvider,
  createNimiRuntimeFullAppRegistration,
  resolveNimiRuntimeAppStorageRoots,
} from '@nimiplatform/sdk/runtime';
import {
  SHIJING_APP_ID,
  SHIJING_RUNTIME_APP_INSTANCE_ID,
  SHIJING_RUNTIME_DEVICE_ID,
} from '../src/contracts/app-identity.ts';

export const DEFAULT_SHIJING_RUNTIME_ENDPOINT = '127.0.0.1:46371';

export function resolveShijingRuntimeEndpoint(...envKeys) {
  for (const key of envKeys) {
    const value = String(process.env[key] || '').trim();
    if (value) return value;
  }
  return DEFAULT_SHIJING_RUNTIME_ENDPOINT;
}

export async function resolveShijingRuntimeAppStorageRoots(input) {
  const runtimeEndpoint = String(input.runtimeEndpoint || '').trim() || DEFAULT_SHIJING_RUNTIME_ENDPOINT;
  const sessionKind = normalizeSessionKind(input.sessionKind);
  const accountRuntime = new Runtime({
    appId: SHIJING_APP_ID,
    transport: {
      type: 'node-grpc',
      endpoint: runtimeEndpoint,
    },
  });
  try {
    await accountRuntime.ready();
    await createNimiRuntimeFullAppRegistration(
      () => ({ auth: accountRuntime.auth }),
      {
        appId: SHIJING_APP_ID,
        appInstanceId: SHIJING_RUNTIME_APP_INSTANCE_ID,
        deviceId: SHIJING_RUNTIME_DEVICE_ID,
        capabilities: [],
        developerRegistration: true,
        rejectionLabel: `${input.label} Runtime registration rejected`,
      },
    )();
    const runtime = new Runtime({
      appId: SHIJING_APP_ID,
      transport: {
        type: 'node-grpc',
        endpoint: runtimeEndpoint,
      },
      authMetadata: createNimiRuntimeAppSessionMetadataProvider({
        appId: SHIJING_APP_ID,
        appInstanceId: `${SHIJING_APP_ID}.${sessionKind}-session`,
        deviceId: `shijing-${sessionKind}-session`,
        capabilities: [],
        developerRegistration: true,
        auth: accountRuntime.auth,
      }),
    });
    return await resolveNimiRuntimeAppStorageRoots({
      appLifecycle: runtime.appLifecycle,
      appId: SHIJING_APP_ID,
      label: input.label,
    });
  } catch (error) {
    throw new Error(
      `${input.errorPrefix} failed to resolve Runtime app storage projection from ${runtimeEndpoint}: ${errorMessage(error)}`,
      { cause: error },
    );
  }
}

function normalizeSessionKind(value) {
  const normalized = String(value || '').trim();
  if (!/^[a-z0-9-]+$/u.test(normalized)) {
    throw new Error(`ShiJing Runtime session kind is invalid: ${normalized || '(empty)'}`);
  }
  return normalized;
}

function errorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error || 'unknown error');
}
