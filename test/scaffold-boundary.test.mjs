import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const bootstrapSource = readFileSync(
  new URL('../src/shell/infra/shijing-bootstrap.ts', import.meta.url),
  'utf8',
);
const productAreaSource = readFileSync(
  new URL('../src/shell/routes/product-area.tsx', import.meta.url),
  'utf8',
);
const manifest = readFileSync(new URL('../nimi.app.yaml', import.meta.url), 'utf8');
const submission = readFileSync(new URL('../.nimi/admission/submission.yaml', import.meta.url), 'utf8');

test('bootstrap uses local-first-party runtime platform client', () => {
  assert.match(bootstrapSource, /createLocalFirstPartyRuntimePlatformClient/);
  // SJG-PROD-02: only the helper-bound client is admitted. Raw
  // createPlatformClient calls would imply app-owned token surfaces.
  assert.doesNotMatch(bootstrapSource, /\bcreatePlatformClient\s*\(/);
});

test('bootstrap declares the ShiJing runtime account caller (SJG-PROD-02)', () => {
  assert.match(bootstrapSource, /SHIJING_RUNTIME_APP_ID\s*=\s*'app\.nimi\.shijing'/);
  assert.match(bootstrapSource, /AccountCallerMode\.LOCAL_FIRST_PARTY_APP/);
  assert.match(bootstrapSource, /tauri-ipc/);
  assert.match(bootstrapSource, /commandNamespace:\s*'runtime_bridge'/);
});

test('product area wires real runtime AI adapter (no NoOp default)', () => {
  // SJG-PROD-07 / SJG-ALGO-12: production must invoke the SDK-backed
  // runtime AI text generator. The wave-12 NoOp default is removed.
  assert.match(productAreaSource, /createSdkRuntimeAiAdapter/);
  assert.match(productAreaSource, /runtime\.ai/);
  assert.doesNotMatch(productAreaSource, /NoOpRuntimeAiClient/);
});

test('product area gates mock runtime AI to Vite dev only', () => {
  assert.match(productAreaSource, /USE_MOCK_RUNTIME_AI\s*=\s*import\.meta\.env\?\.DEV\s*===\s*true/);
  assert.match(productAreaSource, /if\s*\(\s*USE_MOCK_RUNTIME_AI\s*\)/);
});

test('product area threads authenticated user_id into ShiJingSpace', () => {
  // SJG-DATA-02: ShiJingSpace.user_id must be the runtime-projected account id.
  assert.match(productAreaSource, /useAppStore/);
  assert.match(productAreaSource, /buildEmptySnapshot\(userId\)/);
  assert.doesNotMatch(productAreaSource, /'pending'/);
});

test('manifest remains submitted input', () => {
  assert.match(manifest, /manifest_role: submitted-input/);
  assert.match(manifest, /declared_nimi_api_scopes/);
});

test('admission request remains submitted input', () => {
  assert.match(submission, /submission_role: developer-submitted-input/);
  assert.match(submission, /dev_shell_command: pnpm dev:shell/);
  assert.match(submission, /admission_truth: platform-owned-after-review/);
});
