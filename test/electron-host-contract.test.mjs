import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { SHIJING_APP_ID, SHIJING_TAURI_IDENTIFIER } from '../src/contracts/app-identity.ts';

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

test('ShiJing targets the shared managed-web desktop carrier without a bundled Electron shell', () => {
  assert.equal(SHIJING_APP_ID, 'nimi.shijing');
  assert.equal(SHIJING_TAURI_IDENTIFIER, 'ai.nimi.apps.nimi.shijing');
  for (const relativePath of [
    'src-electron',
    'scripts/bundle-electron-preload.mjs',
    'scripts/clean-electron-production.mjs',
    'scripts/package-electron-production.mjs',
    'tsconfig.electron.json',
    'scripts/runtime-app-storage-projection.mjs',
    'scripts/acceptance-electron.test.mjs',
    'scripts/acceptance-tauri.test.mjs',
  ]) {
    assert.equal(existsSync(rootPath(relativePath)), false, `${relativePath} should not exist`);
  }
  assert.equal(existsSync(rootPath('scripts/ensure-dev-renderer-port.mjs')), true);

  const packageJson = readJson('package.json');
  assert.equal(packageJson.main, undefined);
  assert.equal(packageJson.scripts.dev, 'nimi-app dev --shell electron');
  assert.equal(packageJson.scripts['dev:shell'], 'nimi-app dev');
  assert.equal(packageJson.scripts['dev:electron'], undefined);
  assert.equal(packageJson.scripts['dev:tauri'], undefined);
  assert.equal(packageJson.scripts['acceptance:electron'], undefined);
  assert.equal(packageJson.scripts['acceptance:tauri'], undefined);
  assert.equal(packageJson.devDependencies.electron, undefined);
  assert.equal(packageJson.devDependencies['@electron/packager'], undefined);
  assert.equal(packageJson.devDependencies['@grpc/grpc-js'], undefined);
  assert.match(packageJson.devDependencies.playwright || '', /^\^?1\.61\./);

  const viteConfig = read('vite.config.ts');
  assert.match(viteConfig, /outDir:\s*'dist\/renderer'/);
  assert.match(viteConfig, /emptyOutDir:\s*true/);
});

test('app-owned development runners are removed', () => {
  assert.equal(existsSync(rootPath('scripts/run-electron-dev.mjs')), false);
  assert.equal(existsSync(rootPath('scripts/run-tauri-dev.mjs')), false);
});
