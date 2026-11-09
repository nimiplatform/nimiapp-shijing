import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import { SHIJING_APP_ID } from '../src/contracts/app-identity.ts';

function read(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}


test('ShiJing keeps app identity public while removing portable installed-session identity', () => {
  const identitySource = read('src/contracts/app-identity.ts');
  const manifestSource = read('nimi.app.yaml');

  assert.equal(SHIJING_APP_ID, 'nimi.shijing');
  assert.match(manifestSource, /app_id:\s*nimi\.shijing/);
  assert.doesNotMatch(identitySource, /APP_INSTANCE_ID|RUNTIME_DEVICE_ID|RELEASE_DESCRIPTOR_REF/);
});
