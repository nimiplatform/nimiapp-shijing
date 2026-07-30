import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function read(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

test('manifest and scripts use only the admitted Desktop-supervised Electron development path', () => {
  const manifest = read('nimi.app.yaml');
  const packageJson = JSON.parse(read('package.json'));
  const electronMain = read('src-electron/main.ts');

  assert.match(manifest, /^schema_version: 1$/m);
  assert.match(manifest, /^app_id: nimi\.shijing$/m);
  assert.match(manifest, /^local_development:$/m);
  assert.match(manifest, /^\s{2}electron:$/m);
  assert.match(manifest, /^\s{4}renderer_origin: http:\/\/127\.0\.0\.1:1430$/m);
  assert.match(
    manifest,
    /^\s{4}execution_profile_ref: opaque:windows-native-electron-development-v1$/m,
  );
  assert.match(manifest, /^\s{2}- id: agents\.interact$/m);
  assert.equal(packageJson.scripts.dev, 'nimi-app dev --shell electron');
  assert.equal(packageJson.scripts['dev:renderer'], 'vite --host 127.0.0.1 --port 1430 --strictPort');
  assert.equal(packageJson.scripts['dev:electron'], 'nimi-app dev --shell electron');
  assert.equal(packageJson.scripts['dev:tauri'], undefined);
  assert.equal(packageJson.scripts['acceptance:electron'], undefined);
  assert.equal(packageJson.scripts['acceptance:tauri'], undefined);
  assert.equal(packageJson.scripts['dev:shell'], 'nimi-app dev');
  assert.match(packageJson.scripts['prepare:workspace-surfaces'], /@nimiplatform\/sdk build/);
  assert.match(packageJson.scripts['prepare:workspace-surfaces'], /@nimiplatform\/kit build/);
  assert.match(packageJson.scripts['build:electron'], /tsc -p tsconfig\.electron\.json/);
  assert.match(packageJson.scripts['build:electron'], /bundle-electron-preload\.mjs/);
  assert.doesNotMatch(
    electronMain,
    /NIMI_SHIJING_ELECTRON_ACCEPTANCE_CDP_PORT|remote-debugging-(?:address|port)/,
  );
});

test('renderer consumes the Desktop-supervised Agent conversation path without portable authority', () => {
  const runtime = read('src/shell/local-development/shijing-local-app-runtime.ts');
  const status = read('src/shell/local-development/shijing-local-development-status.tsx');
  const productArea = read('src/shell/routes/product-area.tsx');
  const conversation = read('src/shell/ai/shijing-conversation-chat-bridge.ts');

  assert.match(runtime, /SHIJING_AGENTS_INTERACT_PERMISSION = 'agents\.interact'/);
  assert.match(runtime, /createNimiClient/);
  assert.match(runtime, /createNimiLocalAppStandardShellSurface/);
  assert.match(status, /permissions\.status/);
  assert.match(status, /permissions\.request/);
  assert.match(status, /selectedAgentHandle/);
  assert.match(status, /reasonCode/);
  assert.match(status, /actionHint/);
  assert.match(productArea, /persistenceClient=\{null\}/);
  assert.match(productArea, /createShijingAgentRuntimeAiClient/);
  assert.match(productArea, /createShijingConversationChatBridge/);
  assert.match(conversation, /conversation\.open/);
  assert.match(conversation, /conversation\.subscribe/);
  assert.match(conversation, /conversation\.send/);
  assert.match(conversation, /runtime\.agent\.turn\.completed/);
  assert.doesNotMatch(conversation, /agent_id|localAgentId|subjectUserId|runNimiTextGenerate/);
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
