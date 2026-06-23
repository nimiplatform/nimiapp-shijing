import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function stripJsComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '');
}

test('RiJing evidence strip does not mount the shared citation drawer', () => {
  const raw = readFileSync(new URL('../src/product/tabs/rijing-tab.tsx', import.meta.url), 'utf8');
  const src = stripJsComments(raw);

  assert.doesNotMatch(src, /\bCitationDrawer\b/);
});
