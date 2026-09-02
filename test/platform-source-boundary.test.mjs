import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const viteConfig = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const tauriConfig = JSON.parse(
  readFileSync(new URL('../src-tauri/tauri.conf.json', import.meta.url), 'utf8'),
);
const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

test('standalone resolver consumes public Nimi packages without parent-source aliases', () => {
  assert.match(viteConfig, /const appTauriApiCore = fileURLToPath\(new URL\('\.\/node_modules\/@tauri-apps\/api\/core\.js', import\.meta\.url\)\);/);
  assert.match(viteConfig, /const appTauriApiEvent = fileURLToPath\(new URL\('\.\/node_modules\/@tauri-apps\/api\/event\.js', import\.meta\.url\)\);/);
  assert.ok(viteConfig.includes('find: /^@tauri-apps\\/api\\/core$/'));
  assert.ok(viteConfig.includes('replacement: appTauriApiCore'));
  assert.ok(viteConfig.includes('find: /^@tauri-apps\\/api\\/event$/'));
  assert.ok(viteConfig.includes('replacement: appTauriApiEvent'));
  assert.doesNotMatch(viteConfig, /nimiRepoRoot|nimiSdkSourceRoot|nimiKitSourceRoot|\/nimi-realm\/nimi\/(?:sdks|kit)/u);
  assert.doesNotMatch(viteConfig, /find:\s*\/\^@nimiplatform\/(?:sdk|kit)/u);
  assert.match(styles, /@source "\.\.\/node_modules\/@nimiplatform\/kit\/\*\*\/\*\.\{js,mjs,ts,tsx\}";/);
  assert.doesNotMatch(styles, /\.\.\/\.\.\/\.\.\/nimi\/kit/u);
});

test('Desktop-supervised Electron development and the installed Tauri build share the exact IPv4 renderer endpoint', () => {
  const devRenderer = packageJson.scripts['dev:renderer'];
  assert.match(devRenderer, /vite --host 127\.0\.0\.1 --port 1430 --strictPort/);
  assert.equal(
    tauriConfig.build.beforeDevCommand,
    'node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port 1430 --strictPort',
  );
  assert.doesNotMatch(tauriConfig.build.beforeDevCommand, /\bpnpm\s+run\b/);
  assert.equal(tauriConfig.build.devUrl, 'http://127.0.0.1:1430');
  assert.equal(packageJson.scripts.dev, 'nimi-app dev --shell electron');
  // Tauri is not an admitted local-development carrier; only Electron is.
  assert.equal(packageJson.scripts['dev:tauri'], undefined);
  assert.equal(packageJson.scripts['dev:shell'], 'nimi-app dev');
});
