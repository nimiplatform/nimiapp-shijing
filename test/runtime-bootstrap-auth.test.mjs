import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const BOOTSTRAP_SOURCE = readFileSync(
  new URL('../src/shell/infra/shijing-bootstrap.ts', import.meta.url),
  'utf8',
);

test('ShiJing Nimi App Runtime client registers the local dev app and auto-issues protected AI access', () => {
  assert.match(BOOTSTRAP_SOURCE, /createNimiAppRuntimePlatformClient/);
  assert.match(BOOTSTRAP_SOURCE, /mode:\s*'local-first-party'/);
  assert.match(BOOTSTRAP_SOURCE, /developerRegistration:\s*import\.meta\.env\?\.DEV\s*===\s*true/);
  assert.match(BOOTSTRAP_SOURCE, /protectedAccess:\s*\{/);
  assert.match(BOOTSTRAP_SOURCE, /autoIssueForAi:\s*true/);
});
