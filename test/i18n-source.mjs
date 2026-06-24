import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const i18nRoot = join(repoRoot, 'src/product/i18n');

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

export function readI18nSource() {
  return collectTsFiles(i18nRoot)
    .sort()
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
}
