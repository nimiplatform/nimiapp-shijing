import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { SHIJING_APP_ID } from '../src/contracts/app-identity.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function rootPath(relativePath) {
  return path.join(root, relativePath);
}

function read(relativePath) {
  return readFileSync(rootPath(relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

test('ShiJing owns an Electron shell beside the Tauri shell', () => {
  for (const relativePath of [
    'src-electron/main.ts',
    'src-electron/preload.cts',
    'src-electron/runtime-auth.ts',
    'scripts/run-electron-dev.mjs',
    'scripts/run-tauri-dev.mjs',
    'scripts/runtime-app-storage-projection.mjs',
    'scripts/bundle-electron-preload.mjs',
    'scripts/ensure-dev-renderer-port.mjs',
    'tsconfig.electron.json',
  ]) {
    assert.equal(existsSync(rootPath(relativePath)), true, `${relativePath} should exist`);
  }
  assert.equal(
    existsSync(rootPath('src-electron/commands/shijing-commands.ts')),
    false,
    'ShiJing must consume Nimi standard shell primitives instead of owning app-local Electron commands',
  );

  const packageJson = readJson('package.json');
  assert.match(packageJson.scripts['dev:electron'], /run-electron-dev\.mjs/);
  assert.match(packageJson.scripts['dev:shell'], /run-tauri-dev\.mjs/);
  assert.match(packageJson.scripts['build:electron'], /tsconfig\.electron\.json/);
  assert.match(packageJson.scripts['build:electron'], /bundle-electron-preload\.mjs/);
  assert.match(packageJson.devDependencies.electron || '', /^\^?42\./);
  assert.match(packageJson.devDependencies.esbuild || '', /^\^?0\.28\./);
  assert.equal(packageJson.devDependencies['@grpc/grpc-js'], undefined, 'ShiJing app must not own raw gRPC');
});

test('Electron host reuses Kit bridge without ShiJing platform primitive commands', () => {
  const mainSource = read('src-electron/main.ts');
  const preloadSource = read('src-electron/preload.cts');
  const runtimeAuthSource = read('src-electron/runtime-auth.ts');
  const tauriSource = read('src-tauri/src/main.rs');
  const platformPrimitiveCommands = [
    'get_storage_dirs',
    'shijing_space_load',
    'shijing_space_save',
    'shijing_space_clear',
  ];

  assert.match(mainSource, /SHIJING_APP_ID/);
  assert.doesNotMatch(mainSource, /const APP_ID = 'nimi\.shijing'/);
  assert.match(mainSource, /createElectronShellFileProtocolHost/);
  assert.match(mainSource, /registerNimiElectronRuntimeBridge/);
  assert.match(mainSource, /createNimiElectronFileAIConfigStore/);
  assert.match(mainSource, /createShijingElectronTrustedRuntimeMetadataProvider/);
  assert.match(mainSource, /@nimiplatform\/sdk\/runtime/);
  assert.match(mainSource, /resolveNimiRuntimeAppStorageRoots/);
  assert.match(mainSource, /await resolveStandardDataRoot\(\)/);
  assert.match(mainSource, /standardDataRootBinding:\s*standardDataRootBinding\(standardStorageRoots\)/);
  assert.match(mainSource, /localAssetProtocolHost/);
  assert.match(mainSource, /registerPrivilegedSchemes\(\)/);
  assert.match(mainSource, /registerProtocolHandler\(\)/);
  assert.match(mainSource, /\.catch\(handleElectronStartupFailure\)/);
  assert.match(mainSource, /NIMI_SHIJING_ELECTRON_RENDERER_URL/);
  assert.match(mainSource, /127\.0\.0\.1:46371/);
  assert.match(mainSource, /BrowserWindow/);
  assert.match(mainSource, /title:\s*'ShiJing'/);
  assert.match(mainSource, /createNimiElectronStandardApplicationMenuTemplate/);
  assert.match(mainSource, /Menu\.buildFromTemplate/);
  assert.doesNotMatch(mainSource, /Menu\.setApplicationMenu\(null\)/);
  assert.doesNotMatch(mainSource, /\.removeMenu\(/);
  assert.match(mainSource, /contextIsolation:\s*true/);
  assert.match(mainSource, /nodeIntegration:\s*false/);
  assert.match(mainSource, /sandbox:\s*true/);
  assert.match(mainSource, /setWindowOpenHandler/);
  assert.match(mainSource, /will-navigate/);
  assert.match(mainSource, /isAllowedElectronRendererUrl/);
  assert.match(mainSource, /disable-background-networking/);
  assert.match(preloadSource, /@nimiplatform\/kit\/shell\/electron\/preload-cjs/);
  assert.match(preloadSource, /installNimiElectronRuntimeBridge/);
  assert.match(runtimeAuthSource, /createNimiElectronRuntimeAccountTrustedMetadataProvider/);
  assert.match(runtimeAuthSource, /RUNTIME_ACCOUNT_CALLER_MODE_LOCAL_DEVELOPER_APP/);
  assert.doesNotMatch(runtimeAuthSource, /@nimiplatform\/sdk\/runtime/);
  assert.doesNotMatch(mainSource, /standardShellHost:\s*{[\s\S]*?\bdataRoot:\s*standardDataRoot/);
  assert.doesNotMatch(mainSource, /resolveLocalAssetUrl:\s*resolveShijingLocalAssetUrl/);
  assert.doesNotMatch(mainSource, /function\s+resolveShijingLocalAssetUrl/);
  assert.doesNotMatch(mainSource, /createShijingElectronCommandHandlers|commandHandlers/);
  assert.doesNotMatch(mainSource, /standard-shell-data/);
  assert.match(mainSource, /standardShellHost/);
  assert.match(mainSource, /standardDataRootBinding/);
  assert.match(mainSource, /localAssetProtocolHost/);
  assert.doesNotMatch(mainSource, /dataRoot:\s*standardDataRoot/);
  assert.doesNotMatch(mainSource, /resolveLocalAssetUrl/);
  assert.doesNotMatch(mainSource, /const FILE_PROTOCOL|readableFiles|protocol\.handle\(FILE_PROTOCOL/);
  for (const command of platformPrimitiveCommands) {
    assert.doesNotMatch(mainSource, new RegExp(command));
    assert.doesNotMatch(tauriSource, new RegExp(command));
  }

  for (const source of [mainSource, preloadSource, runtimeAuthSource]) {
    assert.doesNotMatch(source, /tester_|world_tour|World Tour|NIMI_TESTER/);
    assert.doesNotMatch(source, /@grpc\/grpc-js|runtime\/internal/);
  }
});

test('Renderer persistence uses Runtime app storage for any standard shell host', () => {
  const productAreaSource = read('src/shell/routes/product-area.tsx');

  assert.match(productAreaSource, /hasShellHostInvoke/);
  assert.match(productAreaSource, /new RuntimeAppStoragePersistenceAdapter\(\{ user_id: userId \}\)/);
  assert.doesNotMatch(productAreaSource, /__TAURI_INTERNALS__/);
});

test('Electron dev runner binds the same renderer endpoint as Vite and owns cleanup', () => {
  const runnerSource = read('scripts/run-electron-dev.mjs');
  const projectionSource = read('scripts/runtime-app-storage-projection.mjs');
  const preflightSource = read('scripts/ensure-dev-renderer-port.mjs');

  assert.match(runnerSource, /resolveShijingRuntimeAppStorageRoots/);
  assert.match(projectionSource, /@nimiplatform\/sdk\/runtime/);
  assert.match(projectionSource, /resolveNimiRuntimeAppStorageRoots/);
  assert.match(projectionSource, /appLifecycle:\s*runtime\.appLifecycle/);
  assert.match(projectionSource, /appId:\s*SHIJING_APP_ID/);
  assert.match(runnerSource, /NIMI_APP_DURABLE_DATA_ROOT/);
  assert.match(runnerSource, /NIMI_APP_CACHE_ROOT/);
  assert.match(runnerSource, /NIMI_APP_TEMP_ROOT/);
  assert.match(runnerSource, /NIMI_SHIJING_ELECTRON_DURABLE_DATA_ROOT/);
  assert.match(runnerSource, /NIMI_SHIJING_ELECTRON_CACHE_ROOT/);
  assert.match(runnerSource, /NIMI_SHIJING_ELECTRON_TEMP_ROOT/);
  assert.match(runnerSource, /127\.0\.0\.1:1430/);
  assert.match(runnerSource, /node_modules['"], ['"]vite['"], ['"]bin['"], ['"]vite\.js/);
  assert.match(runnerSource, /require\(['"]electron['"]\)/);
  assert.match(runnerSource, /const SIGNAL_EXIT_CODES = new Map/);
  assert.match(runnerSource, /function spawnElectron\(storageRoots\)/);
  assert.match(runnerSource, /stdio:\s*\[\s*'ignore'\s*,\s*'pipe'\s*,\s*'pipe'\s*\]/);
  assert.match(runnerSource, /forwardChildOutput\(electron\.stdout,\s*process\.stdout\)/);
  assert.match(runnerSource, /forwardChildOutput\(electron\.stderr,\s*process\.stderr\)/);
  assert.match(runnerSource, /function formatWindowsExitCode\(code\)/);
  assert.match(runnerSource, /toString\(16\)\.toUpperCase\(\)/);
  assert.match(runnerSource, /function requestProcessTreeShutdown\(child, signal\)/);
  assert.match(runnerSource, /taskkill\.exe/);
  assert.doesNotMatch(runnerSource, /spawnTracked\(electronBin,\s*\[[^\]]*\],\s*\{\s*stdio:\s*'inherit'/);
  assert.doesNotMatch(runnerSource, /cmd\.exe|ComSpec|corepack\.cmd/);
  assert.match(preflightSource, /const rendererPort = 1430/);
  assert.match(preflightSource, /isShijingRendererProcess/);
  assert.match(preflightSource, /readProcessWorkingDirectory/);
  assert.match(preflightSource, /-d['"], ['"]cwd/);
  assert.doesNotMatch(preflightSource, /tester|NIMI_TESTER|1468/);
});

test('Tauri dev runner injects Runtime-projected app storage before launching shell', () => {
  const runnerSource = read('scripts/run-tauri-dev.mjs');
  const tauriMainSource = read('src-tauri/src/main.rs');
  const packageJson = readJson('package.json');

  assert.match(packageJson.scripts['dev:shell'], /node scripts\/run-tauri-dev\.mjs/);
  assert.match(runnerSource, /resolveShijingRuntimeAppStorageRoots/);
  assert.match(runnerSource, /NIMI_RUNTIME_GRPC_ADDR/);
  assert.match(runnerSource, /NIMI_APP_DURABLE_DATA_ROOT/);
  assert.match(runnerSource, /NIMI_APP_CACHE_ROOT/);
  assert.match(runnerSource, /NIMI_APP_TEMP_ROOT/);
  assert.match(runnerSource, /NIMI_SHIJING_TAURI_DURABLE_DATA_ROOT/);
  assert.match(runnerSource, /NIMI_SHIJING_TAURI_CACHE_ROOT/);
  assert.match(runnerSource, /NIMI_SHIJING_TAURI_TEMP_ROOT/);
  assert.match(runnerSource, /node_modules['"], ['"]\.bin/);
  assert.match(runnerSource, /tauri(?:\.cmd)?/);
  assert.match(runnerSource, /dev/);
  assert.match(runnerSource, /ensure-dev-renderer-port\.mjs/);
  assert.doesNotMatch(runnerSource, /standard-shell-data|apps\/\$\{SHIJING_APP_ID\}/);
  assert.match(tauriMainSource, /StandardAppStorageRootSlot/);
  assert.match(tauriMainSource, /StandardDataRootBinding::RuntimeLaunchProjection/);
  assert.doesNotMatch(tauriMainSource, /StandardAppStorageRoot::from_path/);
  assert.doesNotMatch(tauriMainSource, /storage::StandardAppStorageRoot\b/);
});
