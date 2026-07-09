import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { app, BrowserWindow, ipcMain, Menu, protocol } from 'electron';
import {
  createElectronShellFileProtocolHost,
  createNimiElectronStandardApplicationMenuTemplate,
  createNimiElectronFileAIConfigStore,
  isAllowedElectronRendererUrl,
  registerNimiElectronRuntimeBridge,
  type NimiElectronStandardDataRootBinding,
} from '@nimiplatform/kit/shell/electron/main';
import {
  SHIJING_APP_ID,
} from '../src/contracts/app-identity.js';
import {
  createShijingElectronTrustedRuntimeMetadataProvider,
  createShijingRendererLaunchBinding,
} from './runtime-auth.js';

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
      capabilitySetRef: 'installed-nimi-app-standard-shell-v1',
      standardDataRootBinding: standardDataRootBinding(standardStorageRoots),
      localAssetRoots,
      localAssetProtocolHost: fileProtocolHost,
      focusMainWindow,
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
  const launchBinding = createShijingRendererLaunchBinding();
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
      additionalArguments: [
        `--nimi-installed-app-launch-binding=${Buffer.from(JSON.stringify(launchBinding), 'utf8').toString('base64url')}`,
      ],
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
  return {
    durableDataRoot: path.join(app.getPath('userData'), 'installed-app-data'),
    cacheRoot: path.join(app.getPath('userData'), 'installed-app-cache'),
    tempRoot: path.join(app.getPath('temp'), 'shijing'),
    projectionRef: 'shijing-electron-dev-shell',
  };
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

function createShijingFileProtocolHost(roots: readonly string[]) {
  return createElectronShellFileProtocolHost({
    protocol: {
      registerSchemesAsPrivileged: (customSchemes) => protocol.registerSchemesAsPrivileged([...customSchemes]),
      handle: (scheme, handler) => protocol.handle(scheme, (request) => handler(request) as Promise<Response>),
    },
    roots,
  });
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
