import {
  createNimiElectronInstalledAppRuntimeAccountTrustedMetadataProvider,
  resolveElectronRuntimeDefaults,
  type ElectronRuntimeBridgeTrustedMetadataProvider,
} from '@nimiplatform/kit/shell/electron/main';
import {
  SHIJING_APP_ID,
  SHIJING_RELEASE_DESCRIPTOR_REF,
  SHIJING_RUNTIME_APP_INSTANCE_ID,
  SHIJING_RUNTIME_DEVICE_ID,
} from '../src/contracts/app-identity.js';

export type ShijingRendererLaunchBinding = {
  readonly appId: string;
  readonly appInstanceId: string;
  readonly deviceId: string;
  readonly launchHostId: string;
  readonly launchNonce: string;
  readonly releaseDescriptorRef: string;
  readonly realmBaseUrl: string;
};

const DESKTOP_INSTALLED_APP_LAUNCH_HOST_ID = 'desktop-electron-installed-app-host';

export function createShijingElectronTrustedRuntimeMetadataProvider(input: {
  readonly appId: string;
  readonly runtimeEndpoint: string;
}): ElectronRuntimeBridgeTrustedMetadataProvider {
  const appId = requireText(input.appId, 'appId');
  if (appId !== SHIJING_APP_ID) {
    throw new Error(`ShiJing Electron Runtime auth requires appId ${SHIJING_APP_ID}`);
  }
  const launchBinding = createShijingRendererLaunchBinding();
  return createNimiElectronInstalledAppRuntimeAccountTrustedMetadataProvider({
    appId,
    runtimeEndpoint: requireText(input.runtimeEndpoint, 'runtimeEndpoint'),
    installedApp: {
      appInstanceId: launchBinding.appInstanceId,
      deviceId: launchBinding.deviceId,
      launchHostId: launchBinding.launchHostId,
      launchNonce: launchBinding.launchNonce,
      releaseDescriptorRef: launchBinding.releaseDescriptorRef,
    },
    appSession: {
      appVersion: '0.1.0',
      capabilities: [],
      developerRegistration: false,
    },
    protectedAccess: {
      consentId: `${SHIJING_APP_ID}:electron-installed-app-runtime-account`,
      authorizationVersion: 'electron-installed-app-runtime-account-v1',
      scopeCatalogVersion: 'desktop-installed-app-standard-shell-v1',
      scopes: [],
    },
  });
}

export function createShijingRendererLaunchBinding(): ShijingRendererLaunchBinding {
  return {
    appId: SHIJING_APP_ID,
    appInstanceId: optionalText(process.env.NIMI_SHIJING_ELECTRON_APP_INSTANCE_ID)
      || SHIJING_RUNTIME_APP_INSTANCE_ID,
    deviceId: optionalText(process.env.NIMI_SHIJING_ELECTRON_DEVICE_ID)
      || SHIJING_RUNTIME_DEVICE_ID,
    launchHostId: DESKTOP_INSTALLED_APP_LAUNCH_HOST_ID,
    launchNonce: requireText(
      optionalText(process.env.NIMI_APP_LAUNCH_NONCE)
        || optionalText(process.env.NIMI_SHIJING_ELECTRON_LAUNCH_NONCE),
      'NIMI_APP_LAUNCH_NONCE or NIMI_SHIJING_ELECTRON_LAUNCH_NONCE',
    ),
    releaseDescriptorRef: optionalText(process.env.NIMI_SHIJING_ELECTRON_RELEASE_DESCRIPTOR_REF)
      || SHIJING_RELEASE_DESCRIPTOR_REF,
    realmBaseUrl: resolveShijingRealmBaseUrl(),
  };
}

function resolveShijingRealmBaseUrl(): string {
  const defaults = resolveElectronRuntimeDefaults();
  const realm = defaults.realm;
  const realmBaseUrl = realm && typeof realm === 'object' && !Array.isArray(realm)
    ? optionalText((realm as { realmBaseUrl?: unknown }).realmBaseUrl)
    : '';
  if (!realmBaseUrl) {
    throw new Error('ShiJing Electron launch binding requires host-projected Realm base URL.');
  }
  try {
    return new URL(realmBaseUrl).toString();
  } catch (error) {
    throw new Error(`ShiJing Electron launch binding has invalid Realm base URL: ${realmBaseUrl}`, {
      cause: error,
    });
  }
}

function requireText(value: unknown, field: string): string {
  const normalized = optionalText(value);
  if (!normalized) {
    throw new Error(`ShiJing Electron Runtime auth requires ${field}`);
  }
  return normalized;
}

function optionalText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
