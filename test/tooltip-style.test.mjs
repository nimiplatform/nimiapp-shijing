import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import test from 'node:test';

const productRoot = fileURLToPath(new URL('../src/product', import.meta.url));

function tsxFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return tsxFiles(path);
    return entry.name.endsWith('.tsx') ? [path] : [];
  });
}

function nativeTitleHosts(source) {
  const offenders = [];
  const openingTagPattern = /<([a-z][\w:-]*)(?=[\s>/])(?!!--)([\s\S]*?)(\/?)>/gu;
  for (const match of source.matchAll(openingTagPattern)) {
    const tag = match[1];
    const attrs = match[2] ?? '';
    if (/\btitle\s*=/u.test(attrs)) {
      offenders.push(tag);
    }
  }
  return offenders;
}

test('product tooltips use Nimi Kit Tooltip instead of native title bubbles', () => {
  const files = tsxFiles(productRoot).filter((file) => statSync(file).isFile());
  const offenders = files.flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return nativeTitleHosts(source).map((tag) => `${relative(process.cwd(), file)}:<${tag} title=...>`);
  });

  assert.deepEqual(offenders, []);
});
