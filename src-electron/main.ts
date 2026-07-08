import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { appendFile, mkdir } from 'node:fs/promises';
import { app, BrowserWindow, ipcMain, Menu, protocol, shell } from 'electron';
import {
  assertOpaqueElectronLocalAgentRef,
  createElectronShellFileProtocolHost,
  createNimiElectronStandardApplicationMenuTemplate,
  createNimiElectronFileAIConfigStore,
  isAllowedElectronRendererUrl,
  registerNimiElectronRuntimeBridge,
  type NimiElectronRuntimeTrustedCallerMode,
  type NimiElectronStandardDataRootBinding,
} from '@nimiplatform/kit/shell/electron/main';
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
} from '../src/contracts/app-identity.js';
import { createShijingElectronTrustedRuntimeMetadataProvider } from './runtime-auth.js';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const appRoot = resolveAppRoot(currentDir);
const preloadPath = path.join(currentDir, 'preload.cjs');
const rendererDistIndex = path.join(appRoot, 'dist', 'index.html');
const rendererDistUrl = pathToFileURL(rendererDistIndex).toString();
const rendererUrl = normalizeText(process.env.NIMI_SHIJING_ELECTRON_RENDERER_URL);
const runtimeEndpoint = normalizeText(process.env.NIMI_RUNTIME_GRPC_ADDR)
  || normalizeText(process.env.NIMI_SHIJING_ELECTRON_RUNTIME_ENDPOINT)
  || '127.0.0.1:46371';
let mainWindow: BrowserWindow | undefined;

createShijingFileProtocolHost([]).registerPrivilegedSchemes();

app.setName('ShiJing');
installShijingStandardApplicationMenu();
configureShijingElectronChromiumRuntime();

void app.whenReady().then(bootstrapElectron).catch(handleElectronStartupFailure);

async function bootstrapElectron(): Promise<void> {
  const standardStorageRoots = await resolveStandardDataRoot();
  const localAssetRoots = resolveStandardLocalAssetRoots(standardStorageRoots.durableDataRoot);
  const fileProtocolHost = createShijingFileProtocolHost(localAssetRoots);
  fileProtocolHost.registerProtocolHandler();
  const localAgentIdentity = resolveShijingElectronLocalAgentIdentity();
  registerNimiElectronRuntimeBridge({
    appId: SHIJING_APP_ID,
    runtimeEndpoint,
    allowedOrigins: allowedRendererOrigins(),
    allowedRendererUrls: allowedRendererUrls(),
    ipcMain,
    trustedRuntimeMetadataProvider: createShijingElectronTrustedRuntimeMetadataProvider({
      appId: SHIJING_APP_ID,
      runtimeEndpoint,
    }),
    standardShellHost: {
      standardDataRootBinding: standardDataRootBinding(standardStorageRoots),
      localAssetRoots,
      localAssetProtocolHost: fileProtocolHost,
      openExternalUrl: openShijingExternalUrl,
      focusMainWindow,
      ...(localAgentIdentity ? { localAgentIdentity } : {}),
      runtimeTrustedCaller: {
        mode: resolveRuntimeTrustedCallerMode(),
      },
      aiConfigStore: createShijingAiConfigStore(standardStorageRoots.durableDataRoot),
    },
  });

  await createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow();
    }
  });
}

function handleElectronStartupFailure(error: unknown): void {
  process.stderr.write(`${error instanceof Error ? error.message : String(error || 'ShiJing Electron startup failed')}\n`);
  app.quit();
}

function resolveAppRoot(electronDir: string): string {
  if (path.basename(electronDir) === 'src-electron' && path.basename(path.dirname(electronDir)) === 'dist-electron') {
    return path.resolve(electronDir, '..', '..');
  }
  return path.resolve(electronDir, '..');
}

function configureShijingElectronChromiumRuntime(): void {
  app.commandLine.appendSwitch('disable-background-networking');
}

function installShijingStandardApplicationMenu(): void {
  Menu.setApplicationMenu(Menu.buildFromTemplate(
    createNimiElectronStandardApplicationMenuTemplate({ appName: 'ShiJing' }),
  ));
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

async function createMainWindow(): Promise<BrowserWindow> {
  const window = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 1100,
    minHeight: 760,
    title: 'ShiJing',
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow = window;
  window.on('closed', () => {
    if (mainWindow === window) {
      mainWindow = undefined;
    }
  });
  hardenShijingWindowChrome(window);
  secureShijingWindow(window);
  await loadRenderer(window);
  return window;
}

async function loadRenderer(window: BrowserWindow): Promise<void> {
  if (rendererUrl) {
    await window.loadURL(rendererUrl);
    return;
  }
  await window.loadURL(rendererDistUrl);
}

function hardenShijingWindowChrome(window: BrowserWindow): void {
  window.setAutoHideMenuBar(true);
  window.setMenuBarVisibility(false);
}

function secureShijingWindow(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (!isShijingRendererUrl(url)) {
      event.preventDefault();
    }
  });
}

function allowedRendererOrigins(): string[] {
  const origins = new Set<string>();
  for (const url of allowedRendererUrls()) {
    origins.add(originForRendererUrl(url));
  }
  for (const origin of normalizeText(process.env.NIMI_SHIJING_ELECTRON_ALLOWED_ORIGINS).split(',')) {
    const normalized = normalizeText(origin);
    if (normalized) {
      origins.add(normalized);
    }
  }
  return [...origins];
}

function originForRendererUrl(url: string): string {
  const parsed = new URL(url);
  return parsed.protocol === 'file:' ? 'file://' : parsed.origin;
}

function allowedRendererUrls(): string[] {
  const urls = new Set<string>([rendererUrl || rendererDistUrl]);
  for (const url of normalizeText(process.env.NIMI_SHIJING_ELECTRON_ALLOWED_RENDERER_URLS).split(',')) {
    const normalized = normalizeText(url);
    if (normalized) {
      urls.add(normalized);
    }
  }
  return [...urls];
}

function isShijingRendererUrl(url: string): boolean {
  return isAllowedElectronRendererUrl(url, allowedRendererUrls());
}

type ShijingStandardStorageRoots = {
  readonly durableDataRoot: string;
  readonly cacheRoot: string;
  readonly tempRoot: string;
  readonly projectionRef: string;
};

async function resolveStandardDataRoot(): Promise<ShijingStandardStorageRoots> {
  const fromEnv = normalizeText(process.env.NIMI_APP_DURABLE_DATA_ROOT)
    || normalizeText(process.env.NIMI_SHIJING_ELECTRON_DURABLE_DATA_ROOT)
    || normalizeText(process.env.NIMI_SHIJING_ELECTRON_STANDARD_DATA_ROOT);
  if (fromEnv) {
    const durableDataRoot = path.resolve(fromEnv);
    return {
      durableDataRoot,
      cacheRoot: resolveOptionalStandardRoot([
        'NIMI_APP_CACHE_ROOT',
        'NIMI_SHIJING_ELECTRON_CACHE_ROOT',
      ]) ?? durableDataRoot,
      tempRoot: resolveOptionalStandardRoot([
        'NIMI_APP_TEMP_ROOT',
        'NIMI_SHIJING_ELECTRON_TEMP_ROOT',
      ]) ?? durableDataRoot,
      projectionRef: 'shijing-electron-env-runtime-launch-projection',
    };
  }
  return resolveRuntimeProjectedStandardStorageRoots();
}

async function resolveRuntimeProjectedStandardStorageRoots(): Promise<ShijingStandardStorageRoots> {
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
        rejectionLabel: 'ShiJing Electron Runtime registration rejected',
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
        appInstanceId: `${SHIJING_APP_ID}.electron-host-session`,
        deviceId: 'shijing-electron-host-session',
        capabilities: [],
        developerRegistration: true,
        auth: accountRuntime.auth,
      }),
    });
    const roots = await resolveNimiRuntimeAppStorageRoots({
      appLifecycle: runtime.appLifecycle,
      appId: SHIJING_APP_ID,
      label: 'ShiJing Electron host',
    });
    return {
      durableDataRoot: path.resolve(roots.dataRoot),
      cacheRoot: path.resolve(roots.cacheRoot),
      tempRoot: path.resolve(roots.tempRoot),
      projectionRef: 'shijing-electron-runtime-launch-projection',
    };
  } catch (error) {
    throw new Error(
      `ShiJing Electron failed to resolve Runtime app storage projection from ${runtimeEndpoint}: ${errorMessage(error)}`,
      { cause: error },
    );
  }
}

function resolveOptionalStandardRoot(envKeys: readonly string[]): string | undefined {
  for (const key of envKeys) {
    const normalized = normalizeText(process.env[key]);
    if (normalized) {
      return path.resolve(normalized);
    }
  }
  return undefined;
}

function standardDataRootBinding(roots: ShijingStandardStorageRoots): NimiElectronStandardDataRootBinding {
  return {
    source: 'runtime-launch-projection',
    durableDataRoot: roots.durableDataRoot,
    cacheRoot: roots.cacheRoot,
    tempRoot: roots.tempRoot,
    projectionRef: roots.projectionRef,
  };
}

function resolveStandardLocalAssetRoots(durableDataRoot: string): string[] {
  const fromEnv = normalizeText(process.env.NIMI_SHIJING_ELECTRON_STANDARD_LOCAL_ASSET_ROOTS);
  if (!fromEnv) {
    return [durableDataRoot, app.getPath('downloads')].map((filePath) => path.resolve(filePath));
  }
  return fromEnv
    .split(path.delimiter)
    .map((filePath) => normalizeText(filePath))
    .filter(Boolean)
    .map((filePath) => path.resolve(filePath));
}

function createShijingAiConfigStore(durableDataRoot: string) {
  const dataRoot = durableDataRoot;
  return createNimiElectronFileAIConfigStore({
    dataRoot,
    storeLabel: 'ShiJing AI Config',
  });
}

function resolveRuntimeTrustedCallerMode(): NimiElectronRuntimeTrustedCallerMode {
  const mode = normalizeText(process.env.NIMI_SHIJING_ELECTRON_RUNTIME_TRUSTED_CALLER_MODE) || 'local-developer-app';
  if (
    mode === 'local-developer-app'
    || mode === 'local-first-party-app'
    || mode === 'desktop-shell'
  ) {
    return mode;
  }
  throw new Error(`unsupported ShiJing Electron Runtime trusted caller mode: ${mode}`);
}

function resolveShijingElectronLocalAgentIdentity(): {
  readonly ownerUserId: string;
  readonly runtimeSourceRef: string;
  readonly localAgentRef: string;
} | undefined {
  const localAgentRef = normalizeText(process.env.NIMI_SHIJING_ELECTRON_LOCAL_AGENT_REF);
  if (!localAgentRef) {
    return undefined;
  }
  const ownerUserId = normalizeRequiredEnv(
    process.env.NIMI_SHIJING_ELECTRON_LOCAL_AGENT_OWNER_USER_ID,
    'NIMI_SHIJING_ELECTRON_LOCAL_AGENT_OWNER_USER_ID',
  );
  const runtimeSourceRef = normalizeRequiredEnv(
    process.env.NIMI_SHIJING_ELECTRON_LOCAL_AGENT_RUNTIME_SOURCE_REF,
    'NIMI_SHIJING_ELECTRON_LOCAL_AGENT_RUNTIME_SOURCE_REF',
  );
  if (!localAgentRef.startsWith('local-agent:')) {
    throw new Error('NIMI_SHIJING_ELECTRON_LOCAL_AGENT_REF must start with local-agent:');
  }
  assertOpaqueElectronLocalAgentRef({
    ownerUserId,
    runtimeSourceRef,
    localAgentRef,
    command: 'NIMI_SHIJING_ELECTRON_LOCAL_AGENT_REF',
  });
  return {
    ownerUserId,
    runtimeSourceRef,
    localAgentRef,
  };
}

function createShijingFileProtocolHost(roots: readonly string[]) {
  return createElectronShellFileProtocolHost({
    protocol: {
      registerSchemesAsPrivileged: (customSchemes) => protocol.registerSchemesAsPrivileged([...customSchemes]),
      handle: (scheme, handler) => protocol.handle(scheme, (request) => handler(request) as Promise<Response>),
    },
    roots,
  });
}

function normalizeRequiredEnv(value: unknown, field: string): string {
  const normalized = normalizeText(value);
  if (!normalized) {
    throw new Error(`${field} is required when NIMI_SHIJING_ELECTRON_LOCAL_AGENT_REF is set`);
  }
  return normalized;
}

async function openShijingExternalUrl(url: string): Promise<void> {
  const capturePath = normalizeText(process.env.NIMI_SHIJING_ELECTRON_OPEN_EXTERNAL_CAPTURE_FILE);
  if (capturePath) {
    const resolved = path.resolve(capturePath);
    await mkdir(path.dirname(resolved), { recursive: true });
    await appendFile(resolved, `${url}\n`, 'utf8');
    return;
  }
  await shell.openExternal(url);
}

async function focusMainWindow(): Promise<void> {
  const window = mainWindow && !mainWindow.isDestroyed()
    ? mainWindow
    : BrowserWindow.getAllWindows().find((candidate) => !candidate.isDestroyed());
  if (!window) {
    throw new Error('ShiJing Electron main window unavailable');
  }
  if (window.isMinimized()) {
    window.restore();
  }
  window.show();
  window.focus();
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error || 'unknown error');
}
