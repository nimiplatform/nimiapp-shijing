import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function read(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

test('manifest declares App Access with the minimal domain set on the Desktop-supervised Electron development path', () => {
  const manifest = read('nimi.app.yaml');
  const packageJson = JSON.parse(read('package.json'));
  const electronMain = read('src-electron/main.ts');

  assert.match(manifest, /^app_id: nimi\.shijing$/m);
  assert.match(manifest, /^profile: standalone$/m);
  assert.match(manifest, /^manifest_role: submitted-input$/m);
  assert.match(manifest, /^app_access:$/m);
  assert.match(manifest, /^\s{2}- runtime\.consume$/m);
  assert.doesNotMatch(manifest, /agent\.local|agent\.configure/);
  assert.match(manifest, /^local_development:$/m);
  assert.match(manifest, /^\s{2}electron:$/m);
  assert.match(manifest, /^\s{4}renderer_origin: http:\/\/127\.0\.0\.1:1430$/m);
  assert.doesNotMatch(
    manifest,
    /schema_version|permissions:|execution_profile_ref|workspace-app|agents\.interact/,
  );
  assert.doesNotMatch(electronMain, /onProtectedSessionFailure/);
  assert.equal(packageJson.scripts.dev, 'nimi-app dev --shell electron');
  assert.equal(packageJson.scripts['dev:renderer'], 'vite --host 127.0.0.1 --port 1430 --strictPort');
  assert.equal(packageJson.scripts['dev:electron'], 'nimi-app dev --shell electron');
  assert.equal(packageJson.scripts['dev:tauri'], undefined);
  assert.equal(packageJson.scripts['acceptance:electron'], undefined);
  assert.equal(packageJson.scripts['acceptance:tauri'], undefined);
  assert.equal(packageJson.scripts['dev:shell'], 'nimi-app dev');
  assert.equal(packageJson.scripts['prepare:workspace-surfaces'], undefined);
  assert.match(packageJson.scripts['build:electron'], /tsc -p tsconfig\.electron\.json/);
  assert.match(packageJson.scripts['build:electron'], /bundle-electron-preload\.mjs/);
  assert.doesNotMatch(packageJson.scripts['build:electron'], /prepare:workspace-surfaces|build:sdk|build:kit/);
  assert.doesNotMatch(
    electronMain,
    /NIMI_SHIJING_ELECTRON_ACCEPTANCE_CDP_PORT|remote-debugging-(?:address|port)/,
  );
});

test('renderer consumes the App self text candidate path without portable authority', () => {
  const runtime = read('src/shell/local-development/shijing-local-app-runtime.ts');
  const status = read('src/shell/local-development/shijing-local-development-status.tsx');
  const productArea = read('src/shell/routes/product-area.tsx');
  const runtimeAI = read('src/shell/ai/shijing-runtime-ai.ts');

  assert.match(runtime, /createNimiClient/);
  assert.match(runtime, /createNimiLocalAppStandardShellSurface/);
  assert.doesNotMatch(runtime, /SHIJING_AGENTS_INTERACT_PERMISSION|agents\.interact|permissions\./);
  assert.match(status, /auth\.status/);
  assert.match(status, /aiConfig\.get/);
  assert.match(status, /openDesktopIntent/);
  assert.doesNotMatch(status, /agents\.listReferences|selectedAgentHandle/);
  assert.doesNotMatch(status, /permissions\.|agents\.interact/);
  assert.match(
    productArea,
    /const localDevelopmentPersistenceClient = new InMemoryPersistenceAdapter\(\)/,
  );
  assert.match(productArea, /persistenceClient=\{localDevelopmentPersistenceClient\}/);
  assert.doesNotMatch(productArea, /IndexedDBPersistenceAdapter/);
  assert.match(productArea, /createShijingRuntimeAiClient/);
  assert.match(productArea, /createShijingConversationChatBridge/);
  assert.match(runtimeAI, /client\.ai\.text\.generateCandidate/);
  assert.doesNotMatch(
    runtimeAI,
    /agents\.listReferences|conversation\.(?:open|send|subscribe)|NimiLocalAppAgentHandle|localAgentId|subjectUserId|runNimiTextGenerate/,
  );
  assert.doesNotMatch(
    `${runtime}\n${status}\n${runtimeAI}`,
    /runtimeEndpoint|NIMI_RUNTIME_GRPC_ADDR|bearerToken|accessToken|sessionProof\s*[:=]|grantId\s*[:=]/,
  );
});

test('local development status reserves layout space instead of covering product controls', () => {
  const styles = read('src/styles.css');

  assert.match(
    styles,
    /\.shijing-local-development-shell\s*\{[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\)/s,
  );
  assert.match(
    styles,
    /\.shijing-local-development-shell\s*>\s*\.shijing-app\s*\{[^}]*height:\s*100%/s,
  );
  assert.doesNotMatch(
    styles,
    /\.shijing-local-development\s*\{[^}]*position:\s*fixed/s,
  );
});

test('app-managed Runtime model and self-auth paths are removed', () => {
  const productArea = read('src/shell/routes/product-area.tsx');
  const settings = read('src/product/settings/response-preferences-editor.tsx');

  assert.doesNotMatch(productArea, /subjectUserId|runtimeEndpoint|AgentHandle/);
  assert.doesNotMatch(settings, /ShijingAiModelConfigSection|settings-ai-model-config/);
});
