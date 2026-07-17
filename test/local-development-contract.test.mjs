import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function read(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

test('manifest and scripts use the admitted Electron-first dual-shell pattern', () => {
  const manifest = read('nimi.app.yaml');
  const packageJson = JSON.parse(read('package.json'));

  assert.match(manifest, /^schema_version: 1$/m);
  assert.match(manifest, /^app_id: nimi\.shijing$/m);
  assert.match(manifest, /^local_development:$/m);
  assert.match(manifest, /^\s{2}electron:$/m);
  assert.match(manifest, /^\s{4}renderer_origin: http:\/\/127\.0\.0\.1:1430$/m);
  assert.match(
    manifest,
    /^\s{4}execution_profile_ref: opaque:windows-native-electron-development-v1$/m,
  );
  assert.equal(packageJson.scripts.dev, 'nimi-app dev --shell electron');
  assert.equal(packageJson.scripts['dev:renderer'], 'vite --host 127.0.0.1 --port 1430 --strictPort');
  assert.equal(packageJson.scripts['dev:electron'], 'nimi-app dev --shell electron');
  assert.equal(packageJson.scripts['dev:tauri'], 'nimi-app dev --shell tauri');
  assert.equal(packageJson.scripts['dev:shell'], 'nimi-app dev');
  assert.match(packageJson.scripts['prepare:workspace-surfaces'], /@nimiplatform\/sdk build/);
  assert.match(packageJson.scripts['prepare:workspace-surfaces'], /@nimiplatform\/kit build/);
  assert.match(packageJson.scripts['build:electron'], /tsc -p tsconfig\.electron\.json/);
  assert.match(packageJson.scripts['build:electron'], /bundle-electron-preload\.mjs/);
});

test('renderer consumes one real typed storage permission path without portable authority', () => {
  const runtime = read('src/shell/local-development/shijing-local-app-runtime.ts');
  const status = read('src/shell/local-development/shijing-local-development-status.tsx');
  const productArea = read('src/shell/routes/product-area.tsx');

  assert.match(runtime, /app_storage\.json\.write/);
  assert.match(runtime, /storage:\$\{SHIJING_LOCAL_DEVELOPMENT_STORAGE_PATH\}/);
  assert.match(runtime, /createNimiAppRuntimePlatformClient/);
  assert.match(runtime, /createNimiLocalAppStandardShellSurface/);
  assert.match(status, /permissions\.posture/);
  assert.match(status, /permissions\.request/);
  assert.match(status, /storage\.writeJson/);
  assert.match(status, /reasonCode/);
  assert.match(status, /actionHint/);
  assert.match(productArea, /persistenceClient=\{null\}/);
  assert.doesNotMatch(productArea, /RuntimeAiClient|ConversationChatBridge|PresenceVerificationClient/);
  assert.doesNotMatch(
    `${runtime}\n${status}`,
    /runtimeEndpoint|NIMI_RUNTIME_GRPC_ADDR|bearerToken|accessToken|sessionProof\s*[:=]|grantId\s*[:=]/,
  );
});

test('unadmitted AIConfig remains a typed fail-close boundary', () => {
  const source = read('src/shell/ai/shijing-ai-config.ts');

  assert.match(source, /shijing-protected-operation-set-not-admitted/);
  assert.match(source, /wait_for_shijing_protected_operation_admission/);
  assert.doesNotMatch(source, /createInstalledNimiAppStandardShellSurface/);
  assert.doesNotMatch(source, /aiConfig\.get|aiConfig\.set/);
});
