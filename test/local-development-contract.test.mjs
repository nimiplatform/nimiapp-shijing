import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

function read(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

test('manifest declares App Access with the minimal domain set on the shared managed desktop carrier', () => {
  const manifest = read('nimi.app.yaml');
  const buildProfile = read('.nimi/config/build-profile.yaml');
  const appIdentity = read('.nimi/config/app-identity.yaml');
  const submission = read('.nimi/admission/submission.yaml');
  const packageJson = JSON.parse(read('package.json'));

  assert.match(manifest, /^app_id: nimi\.shijing$/m);
  assert.match(manifest, /^profile: standalone$/m);
  assert.match(manifest, /^manifest_role: submitted-input$/m);
  assert.match(manifest, /^desktop:$/m);
  assert.match(manifest, /^\s{2}window:$/m);
  assert.match(manifest, /^\s{4}width: 1320$/m);
  assert.match(manifest, /^\s{4}height: 900$/m);
  assert.match(manifest, /^\s{4}min_width: 390$/m);
  assert.match(manifest, /^\s{4}min_height: 620$/m);
  assert.match(manifest, /^\s{4}title_bar_style: hidden$/m);
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
  assert.match(buildProfile, /^build_profile_ref: managed-web-pnpm-vite$/m);
  assert.match(buildProfile, /^\s{2}desktop-universal:$/m);
  assert.match(buildProfile, /^\s{4}payload_path: dist\/renderer$/m);
  assert.match(buildProfile, /^\s{4}runtime_entry: payload\/index\.html$/m);
  assert.match(appIdentity, /^app_id: nimi\.shijing$/m);
  assert.match(appIdentity, /^tauri_identifier: ai\.nimi\.apps\.nimi\.shijing$/m);
  assert.match(submission, /^app_id: nimi\.shijing$/m);
  assert.match(submission, /^profile: standalone$/m);
  assert.match(submission, /^tauri_identifier: ai\.nimi\.apps\.nimi\.shijing$/m);
  assert.equal(existsSync(new URL('../.nimi/scaffold.lock.json', import.meta.url)), false);
  assert.equal(existsSync(new URL('../src-electron', import.meta.url)), false);
  assert.equal(packageJson.scripts.dev, 'nimi-app dev --shell electron');
  assert.equal(packageJson.scripts['dev:renderer'], 'vite --host 127.0.0.1 --port 1430 --strictPort');
  assert.equal(packageJson.scripts['dev:electron'], undefined);
  assert.equal(packageJson.scripts['dev:tauri'], undefined);
  assert.equal(packageJson.scripts['acceptance:electron'], undefined);
  assert.equal(packageJson.scripts['acceptance:tauri'], undefined);
  assert.equal(packageJson.scripts['dev:shell'], 'nimi-app dev');
  assert.equal(packageJson.scripts.sync, 'nimi-app sync');
  assert.equal(packageJson.scripts['check:platform'], 'nimi-app check');
  assert.match(packageJson.scripts.check, /^pnpm run check:platform && /);
  assert.equal(packageJson.scripts.pack, 'nimi-app pack');
  assert.equal(packageJson.scripts.doctor, undefined);
  assert.equal(packageJson.scripts['prepare:workspace-surfaces'], undefined);
  assert.equal(packageJson.scripts['build:electron'], undefined);
  assert.equal(packageJson.devDependencies.electron, undefined);
  assert.equal(packageJson.devDependencies['@electron/packager'], undefined);
});

test('renderer consumes the App self text candidate path without portable authority', () => {
  const runtime = read('src/shell/local-development/shijing-local-app-runtime.ts');
  const status = read('src/shell/local-development/shijing-local-development-status.tsx');
  const productArea = read('src/shell/routes/product-area.tsx');
  const runtimeAI = read('src/shell/ai/shijing-runtime-ai.ts');

  assert.match(read('src/main.tsx'), /createDesktopNimiAppSession/);
  assert.match(read('src/main.web.tsx'), /createWebNimiAppSession/);
  assert.match(runtime, /extractNimiErrorFields/);
  assert.doesNotMatch(runtime, /SHIJING_AGENTS_INTERACT_PERMISSION|agents\.interact|permissions\./);
  assert.doesNotMatch(status, /auth\.status/);
  assert.match(status, /aiConfig\.get/);
  assert.match(read('src/main.tsx'), /openDesktopIntent/);
  assert.doesNotMatch(status, /agents\.listReferences|selectedAgentHandle/);
  assert.doesNotMatch(status, /permissions\.|agents\.interact/);
  assert.match(
    productArea,
    /new ShijingRuntimeStoragePersistenceClient\(/,
  );
  assert.match(productArea, /persistenceClient=\{shijingPersistenceClient\}/);
  assert.doesNotMatch(productArea, /IndexedDBPersistenceAdapter|InMemoryPersistenceAdapter/);
  // The installed renderer shares this route and must not project account identity.
  assert.doesNotMatch(productArea, /currentUser|ShijingShellAccount|<ShijingShell\s+account=/);
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

test('local development status renders inside the settings page, not above the product shell', () => {
  const productArea = read('src/shell/routes/product-area.tsx');
  const shell = read('src/product/shell/shijing-shell.tsx');
  const settingsPage = read('src/product/settings/settings-page-view.tsx');
  const styles = read('src/styles.css');

  // The status panel is injected into the 设置 sub-page as an extra module.
  assert.match(productArea, /targetId: 'settings-local-development'/);
  assert.match(productArea, /<ShijingShell settingsExtras=\{settingsExtras\}[^>]*\/>/);
  // Saved RiJing Readings are published through the SDK App activity client.
  assert.match(productArea, /activity=\{activity\}/);
  assert.doesNotMatch(productArea, /^\s*<ShijingLocalDevelopmentStatus \/>$/m);
  assert.match(shell, /settingsExtras=\{props\.settingsExtras \?\? null\}/);
  assert.match(settingsPage, /extras\.targetId/);
  assert.match(settingsPage, /extras\.content/);

  // The shell grid is single-row again: no status band above the product.
  assert.match(
    styles,
    /\.shijing-local-development-shell\s*\{[^}]*grid-template-rows:\s*minmax\(0, 1fr\)/s,
  );
  assert.match(
    styles,
    /\.shijing-local-development-shell\s*>\s*\.shijing-app\s*\{[^}]*height:\s*100%/s,
  );
  assert.doesNotMatch(
    styles,
    /\.shijing-local-development-shell\s*\{[^}]*grid-template-rows:\s*auto/s,
  );
  // The panel flows with the settings scroll container instead of capping its
  // own height, and it is never fixed-positioned over product controls.
  assert.doesNotMatch(
    styles,
    /\.shijing-local-development\s*\{[^}]*position:\s*fixed/s,
  );
  assert.doesNotMatch(
    styles,
    /\.shijing-local-development\s*\{[^}]*max-height/s,
  );
});

test('app-managed Runtime model and self-auth paths are removed', () => {
  const productArea = read('src/shell/routes/product-area.tsx');
  const settings = read('src/product/settings/response-preferences-editor.tsx');

  assert.doesNotMatch(productArea, /subjectUserId|runtimeEndpoint|AgentHandle/);
  assert.doesNotMatch(settings, /ShijingAiModelConfigSection|settings-ai-model-config/);
});
