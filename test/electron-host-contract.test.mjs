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

test('ShiJing ships real Electron and Tauri shells wired to the supervised development path', () => {
  for (const relativePath of [
    'src-electron/main.ts',
    'src-electron/preload.cts',
    'scripts/bundle-electron-preload.mjs',
    'scripts/ensure-dev-renderer-port.mjs',
    'tsconfig.electron.json',
  ]) {
    assert.equal(existsSync(rootPath(relativePath)), true, `${relativePath} should exist`);
  }
  assert.equal(existsSync(rootPath('src-electron/runtime-auth.ts')), false);
  assert.equal(existsSync(rootPath('scripts/runtime-app-storage-projection.mjs')), false);
  // App-local acceptance harnesses are retired: acceptance runs as the
  // platform-supervised journey (nimi-app dev --shell electron + CDP), not as
  // app-owned playwright probes of protected surfaces.
  assert.equal(existsSync(rootPath('scripts/acceptance-electron.test.mjs')), false);
  assert.equal(existsSync(rootPath('scripts/acceptance-tauri.test.mjs')), false);

  const packageJson = readJson('package.json');
  assert.equal(packageJson.scripts.dev, 'nimi-app dev --shell electron');
  assert.equal(packageJson.scripts['dev:shell'], 'nimi-app dev');
  assert.equal(packageJson.scripts['dev:electron'], 'nimi-app dev --shell electron');
  // Tauri is not an admitted local-development carrier; only Electron is.
  assert.equal(packageJson.scripts['dev:tauri'], undefined);
  assert.equal(packageJson.scripts['acceptance:electron'], undefined);
  assert.equal(packageJson.scripts['acceptance:tauri'], undefined);
  assert.match(packageJson.devDependencies.playwright || '', /^\^?1\.61\./);
  assert.equal(packageJson.devDependencies['@grpc/grpc-js'], undefined);
});

test('Electron registers only the fixed Kit app host', () => {
  const mainSource = read('src-electron/main.ts');
  const preloadSource = read('src-electron/preload.cts');

  assert.equal(SHIJING_APP_ID, 'nimi.shijing');
  assert.match(mainSource, /registerNimiElectronAppBridge/);
  assert.match(mainSource, /registerNimiElectronAppAssetProtocolScheme\(protocol\)/);
  assert.match(mainSource, /appId:\s*SHIJING_APP_ID/);
  assert.match(mainSource, /allowedRendererUrls:\s*\[activeRendererUrl\(\)\]/);
  assert.match(
    mainSource,
    /assetMediaPlatform:\s*\{\s*protocol,\s*webRequest:\s*session\.defaultSession\.webRequest,\s*webContents\s*\}/,
  );
  assert.doesNotMatch(mainSource, /registerNimiElectronRuntimeBridge/);
  assert.doesNotMatch(mainSource, /runtimeEndpoint|allowedOrigins|standardShellHost/);
  assert.doesNotMatch(mainSource, /createNimiElectronInstalledHost|capabilitySetRef|commandHandlers/);
  assert.doesNotMatch(mainSource, /createNimiElectronFileAIConfigStore|createElectronShellFileProtocolHost/);
  assert.doesNotMatch(mainSource, /trustedRuntimeMetadataProvider|additionalArguments/);
  assert.doesNotMatch(mainSource, /NIMI_RUNTIME_GRPC_ADDR|NIMI_APP_LAUNCH_NONCE|NIMI_APP_DURABLE_DATA_ROOT/);
  assert.match(mainSource, /--nimi-dev-renderer-url=/);
  assert.match(mainSource, /contextIsolation:\s*true/);
  assert.match(mainSource, /nodeIntegration:\s*false/);
  assert.match(mainSource, /sandbox:\s*true/);
  assert.match(mainSource, /minWidth:\s*390/);
  assert.match(mainSource, /setWindowOpenHandler/);
  assert.match(mainSource, /will-navigate/);
  assert.match(preloadSource, /@nimiplatform\/kit\/shell\/electron\/preload-cjs/);
  assert.match(preloadSource, /installNimiElectronRuntimeBridge/);
});

test('Tauri debug uses the local-app carrier while release fails closed without app-owned authority', () => {
  const source = read('src-tauri/src/main.rs');

  assert.match(source, /#\[cfg\(debug_assertions\)\]/);
  assert.match(source, /RuntimeBridgeLocalAppHost::platform_default\(\)/);
  assert.match(source, /nimi_shell_tauri_local_app_standard_shell_handler!\[\]/);
  assert.match(source, /#\[cfg\(not\(debug_assertions\)\)\]/);
  assert.match(source, /fail-closed release shell/);
  assert.doesNotMatch(source, /RuntimeBridgeAppHost|installed_app_standard_shell_handler/);
  assert.doesNotMatch(source, /runtime_bridge_unary|runtime_bridge_stream/);
  assert.doesNotMatch(source, /ai_config_get|ai_config_set/);
  assert.doesNotMatch(source, /storage_read_json|storage_write_json|storage_remove_json/);
  assert.doesNotMatch(source, /resolve_installed_nimi_app_launch_binding_from_env/);
  assert.doesNotMatch(source, /append_invoke_initialization_script/);
  assert.doesNotMatch(source, /dotenv|NIMI_APP_|NIMI_RUNTIME_/);
});

test('app-owned development runners are removed', () => {
  assert.equal(existsSync(rootPath('scripts/run-electron-dev.mjs')), false);
  assert.equal(existsSync(rootPath('scripts/run-tauri-dev.mjs')), false);
});
