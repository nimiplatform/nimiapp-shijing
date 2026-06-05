import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const BOOTSTRAP_SOURCE = readFileSync(
  new URL('../src/shell/infra/shijing-bootstrap.ts', import.meta.url),
  'utf8',
);

test('ShiJing Nimi client uses explicit vNext Runtime and Realm transports', () => {
  assert.match(BOOTSTRAP_SOURCE, /createNimiClient/);
  assert.match(BOOTSTRAP_SOURCE, /createRealmFetchTransport/);
  assert.match(BOOTSTRAP_SOURCE, /type:\s*'tauri-ipc'/);
  assert.match(BOOTSTRAP_SOURCE, /commandNamespace:\s*'runtime_bridge'/);
  assert.match(BOOTSTRAP_SOURCE, /app:\s*false/);
  assert.match(BOOTSTRAP_SOURCE, /permissions:\s*false/);
});
