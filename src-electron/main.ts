import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import {
  createNimiElectronStandardApplicationMenuTemplate,
  isAllowedElectronRendererUrl,
  registerNimiElectronInstalledAppBridge,
} from '@nimiplatform/kit/shell/electron/main';
import { SHIJING_APP_ID } from '../src/contracts/app-identity.js';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const appRoot = resolveAppRoot(currentDir);
const preloadPath = path.join(currentDir, 'preload.cjs');
const rendererDistIndex = path.join(appRoot, 'dist', 'index.html');
const rendererDistUrl = pathToFileURL(rendererDistIndex).toString();
const devRendererUrl = 'http://127.0.0.1:1430';

app.setName('ShiJing');
installShijingStandardApplicationMenu();
configureShijingElectronChromiumRuntime();

void app.whenReady().then(bootstrapElectron).catch(handleElectronStartupFailure);

async function bootstrapElectron(): Promise<void> {
  registerNimiElectronInstalledAppBridge({
    appId: SHIJING_APP_ID,
    allowedRendererUrls: [activeRendererUrl()],
    ipcMain,
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
    minWidth: 390,
    minHeight: 620,
    title: 'ShiJing',
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  hardenShijingWindowChrome(window);
  secureShijingWindow(window);
  await window.loadURL(activeRendererUrl());
  return window;
}

function activeRendererUrl(): string {
  return app.isPackaged ? rendererDistUrl : devRendererUrl;
}

function hardenShijingWindowChrome(window: BrowserWindow): void {
  window.setAutoHideMenuBar(true);
  window.setMenuBarVisibility(false);
}

function secureShijingWindow(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedElectronRendererUrl(url, [activeRendererUrl()])) {
      event.preventDefault();
    }
  });
}
