import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walk(full);
    } else if (/\.(?:ts|tsx|cts|mts)$/.test(entry)) {
      yield full;
    }
  }
}

// Retired with the permission regime and the ShiJing Agent-transport drift:
// request/approval surfaces, LocalAgent selectors, and Agent conversation
// operations never belong to ShiJing App self AI consumption.
const RETIRED_PATTERNS = [
  /permissions\./,
  /agents\.interact/,
  /onProtectedSessionFailure/,
  /protected-session/,
  /ProtectedSession/,
  /SendAppMessage/,
  /agents\.configure/,
  /localAgentId/,
  /ConnectorGrant/,
  /runtime\.agent\.turn\./,
  /agents\.listReferences/,
  /conversation\.(?:open|send|subscribe)/,
  /NimiLocalAppAgentHandle/,
  /agent\.local/,
];

test('retired permission-regime vocabulary never reappears in app sources', () => {
  const offenders = [];
  for (const scope of ['src', 'src-electron']) {
    for (const file of walk(path.join(root, scope))) {
      const text = readFileSync(file, 'utf8');
      for (const pattern of RETIRED_PATTERNS) {
        if (pattern.test(text)) {
          offenders.push(`${path.relative(root, file)} matches ${pattern}`);
        }
      }
    }
  }
  const manifest = readFileSync(path.join(root, 'nimi.app.yaml'), 'utf8');
  for (const pattern of RETIRED_PATTERNS) {
    if (pattern.test(manifest)) {
      offenders.push(`nimi.app.yaml matches ${pattern}`);
    }
  }
  assert.deepEqual(offenders, []);
});
