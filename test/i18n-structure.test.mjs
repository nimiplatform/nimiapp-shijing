import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ZH_SHIJING_COPY } from '../src/product/i18n/zh/shijing.ts';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const i18nRoot = join(repoRoot, 'src/product/i18n');
const maxI18nModuleLines = 799;

function collectTsFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...collectTsFiles(path));
    } else if (entry.endsWith('.ts')) {
      files.push(path);
    }
  }
  return files;
}

function lineCount(source) {
  return source.split(/\r?\n/u).length;
}

test('i18n modules stay below the AI structure budget', () => {
  for (const file of collectTsFiles(i18nRoot)) {
    const source = readFileSync(file, 'utf8');
    const count = lineCount(source);
    assert.ok(
      count <= maxI18nModuleLines,
      `${relative(repoRoot, file)} has ${count} lines, expected <= ${maxI18nModuleLines}`,
    );
  }
});

test('Chinese ShiJing pending answer copy is localized', () => {
  assert.notEqual(ZH_SHIJING_COPY.thinking, 'Thinking...');
  assert.match(ZH_SHIJING_COPY.thinking, /思考|正在|稍等/u);
});
