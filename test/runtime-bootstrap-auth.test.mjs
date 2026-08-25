import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import { SHIJING_APP_ID } from '../src/contracts/app-identity.ts';

function read(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

const APP_SOURCE = read('src/shell/App.tsx');
const ACCESS_BOUNDARY_SOURCE = read('src/shell/app-shell/runtime-access-boundary.tsx');
const BOOTSTRAP_SOURCE = read('src/shell/infra/shijing-bootstrap.ts');
const STORE_SOURCE = read('src/shell/app-shell/app-store.ts');
const LOCAL_APP_SOURCE = read('src/shell/local-development/shijing-local-app-runtime.ts');

test('ShiJing keeps app identity public while removing portable installed-session identity', () => {
  const identitySource = read('src/contracts/app-identity.ts');
  const manifestSource = read('nimi.app.yaml');

  assert.equal(SHIJING_APP_ID, 'nimi.shijing');
  assert.match(manifestSource, /app_id:\s*nimi\.shijing/);
  assert.doesNotMatch(identitySource, /APP_INSTANCE_ID|RUNTIME_DEVICE_ID|RELEASE_DESCRIPTOR_REF/);
});

test('renderer mounts product only behind the App Access runtime boundary', () => {
  assert.doesNotMatch(APP_SOURCE, /ProductArea|routes\/product-area/);
  assert.match(APP_SOURCE, /RuntimeAccessBoundary/);
  assert.match(ACCESS_BOUNDARY_SOURCE, /if \(ready\) return <ProductArea/);
  assert.doesNotMatch(ACCESS_BOUNDARY_SOURCE, /ShijingLoginPage|beginLogin|completeLogin|OAuth/i);
  assert.doesNotMatch(ACCESS_BOUNDARY_SOURCE, /app\.quit|process\.exit/);
  assert.doesNotMatch(STORE_SOURCE, /AuthUser|AuthStatus|setAuthSession|clearAuthSession|auth:/);
  assert.doesNotMatch(STORE_SOURCE, /__SHIJING_APP_STORE__/);
  assert.equal(existsSync(new URL('../src/shell/features/auth/shijing-login-page.tsx', import.meta.url)), false);
  assert.equal(existsSync(new URL('../src/shell/features/auth/shijing-auth-adapter.ts', import.meta.url)), false);
});

test('bootstrap consumes only Kit and SDK local-app projections', () => {
  assert.match(BOOTSTRAP_SOURCE, /shijingLocalAppRuntimePlatform\.auth\.status\(\)/);
  assert.match(BOOTSTRAP_SOURCE, /shijingLocalAppRuntimePlatform\.aiConfig\.get\(\)/);
  assert.match(BOOTSTRAP_SOURCE, /session\.sessionBound/);
  assert.match(BOOTSTRAP_SOURCE, /classifyShijingRuntimeAccessFailure/);
  assert.match(BOOTSTRAP_SOURCE, /shijingRuntimeAccessFromSession/);
  assert.match(BOOTSTRAP_SOURCE, /setBootstrapReady\(true\)/);
  assert.doesNotMatch(BOOTSTRAP_SOURCE, /createNimiClient|configureShijingRuntimeSession/);
  assert.doesNotMatch(BOOTSTRAP_SOURCE, /Account|Realm|setShijingNimiClient/);
  assert.match(LOCAL_APP_SOURCE, /createNimiClient/);
  assert.match(LOCAL_APP_SOURCE, /createNimiLocalAppStandardShellSurface/);
  assert.doesNotMatch(
    LOCAL_APP_SOURCE,
    /grantId\s*[:=]|sessionProof\s*[:=]|runtimeEndpoint|bearerToken|accessToken/,
  );
  assert.equal(existsSync(new URL('../src/shell/infra/shijing-runtime-session.ts', import.meta.url)), false);
  assert.equal(existsSync(new URL('../src/shell/infra/shijing-nimi-client.ts', import.meta.url)), false);
});

test('four stable runtime-access states drive same-host retry fail-close UI', () => {
  const stateSource = read('src/shell/app-shell/runtime-access-state.ts');
  for (const state of [
    'action-required',
    'access-ended',
    'runtime-unavailable',
    'capability-unavailable',
  ]) {
    assert.match(stateSource, new RegExp(state));
  }
  assert.match(ACCESS_BOUNDARY_SOURCE, /data-testid="shijing-runtime-access-failure"/);
  assert.match(ACCESS_BOUNDARY_SOURCE, /data-testid="shijing-runtime-access-retry"/);
  assert.match(ACCESS_BOUNDARY_SOURCE, /<details[\s>]/);
  assert.doesNotMatch(ACCESS_BOUNDARY_SOURCE, /protected-session|protectedSession|ProtectedSession/);
});
