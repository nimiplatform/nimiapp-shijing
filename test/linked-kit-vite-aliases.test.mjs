import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const viteConfig = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

test('standalone Vite config has no Nimi SDK or Kit parent-source alias', () => {
  assert.doesNotMatch(viteConfig, /nimiRepoRoot|nimiSdkSourceRoot|nimiKitSourceRoot/u);
  assert.doesNotMatch(viteConfig, /find:\s*\/\^@nimiplatform\\\/(?:sdk|kit)/u);
  assert.doesNotMatch(viteConfig, /server\s*:\s*\{[\s\S]*?fs\s*:\s*\{[\s\S]*?allow\s*:/u);
});

test('Tailwind scans the installed public Kit package instead of the parent workspace', () => {
  assert.match(styles, /@source "\.\.\/node_modules\/@nimiplatform\/kit\/\*\*\/\*\.\{js,mjs,ts,tsx\}";/u);
  assert.doesNotMatch(styles, /(?:\.\.\/){2,}nimi\/kit/u);
});
