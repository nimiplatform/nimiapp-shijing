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
  assert.match(manifest, /^\s{2}- agent\.local$/m);
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

test('renderer consumes the App Access Agent conversation path without portable authority', () => {
  const runtime = read('src/shell/local-development/shijing-local-app-runtime.ts');
  const status = read('src/shell/local-development/shijing-local-development-status.tsx');
  const productArea = read('src/shell/routes/product-area.tsx');
  const conversation = read('src/shell/ai/shijing-conversation-chat-bridge.ts');

  assert.match(runtime, /createNimiClient/);
  assert.match(runtime, /createNimiLocalAppStandardShellSurface/);
  assert.doesNotMatch(runtime, /SHIJING_AGENTS_INTERACT_PERMISSION|agents\.interact|permissions\./);
  assert.match(status, /auth\.status/);
  assert.match(status, /agents\.listReferences/);
  assert.match(status, /selectedAgentHandle/);
  assert.doesNotMatch(status, /permissions\.|agents\.interact/);
  assert.match(
    productArea,
    /const localDevelopmentPersistenceClient = new InMemoryPersistenceAdapter\(\)/,
  );
  assert.match(productArea, /persistenceClient=\{localDevelopmentPersistenceClient\}/);
  assert.doesNotMatch(productArea, /IndexedDBPersistenceAdapter/);
  assert.match(productArea, /createShijingAgentRuntimeAiClient/);
  assert.match(productArea, /createShijingConversationChatBridge/);
  assert.match(conversation, /agents\.listReferences/);
  assert.match(conversation, /conversation\.open/);
  assert.match(conversation, /conversation\.subscribe/);
  assert.match(conversation, /conversation\.send/);
  assert.match(conversation, /turn-completed/);
  assert.doesNotMatch(
    conversation,
    /permissions\.|agents\.interact|runtime\.agent\.turn\.|agent_id|localAgentId|subjectUserId|runNimiTextGenerate/,
  );
  assert.doesNotMatch(
    `${runtime}\n${status}\n${conversation}`,
    /runtimeEndpoint|NIMI_RUNTIME_GRPC_ADDR|bearerToken|accessToken|sessionProof\s*[:=]|grantId\s*[:=]/,
  );
});

test('app-managed Runtime model and self-auth paths are removed', () => {
  const productArea = read('src/shell/routes/product-area.tsx');
  const settings = read('src/product/settings/response-preferences-editor.tsx');

  assert.doesNotMatch(productArea, /AIConfig|subjectUserId|runtimeEndpoint/);
  assert.doesNotMatch(settings, /ShijingAiModelConfigSection|settings-ai-model-config/);
});
