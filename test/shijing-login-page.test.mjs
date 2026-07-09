import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const LOGIN_PAGE_SOURCE = readFileSync(
  new URL('../src/shell/features/auth/shijing-login-page.tsx', import.meta.url),
  'utf8',
);
const AUTH_ADAPTER_SOURCE = readFileSync(
  new URL('../src/shell/features/auth/shijing-auth-adapter.ts', import.meta.url),
  'utf8',
);

test('ShiJing login page no longer owns a desktop-browser OAuth trigger', () => {
  assert.match(
    LOGIN_PAGE_SOURCE,
    /const shijingLogoUrl = new URL\('\.\.\/\.\.\/\.\.\/\.\.\/src-tauri\/icons\/128x128@2x\.png', import\.meta\.url\)\.href;/,
  );
  assert.match(LOGIN_PAGE_SOURCE, /src=\{shijingLogoUrl\}/);
  assert.match(LOGIN_PAGE_SOURCE, /alt="ShiJing"/);
  assert.match(LOGIN_PAGE_SOURCE, /aria-label=\{t\('Auth\.enterShijing'\)\}/);
  assert.match(LOGIN_PAGE_SOURCE, /data-testid="shijing-launch-trigger"/);
  assert.doesNotMatch(LOGIN_PAGE_SOURCE, /DesktopShellAuthPage/);
  assert.doesNotMatch(LOGIN_PAGE_SOURCE, /desktopBrowserAuth/);
  assert.doesNotMatch(LOGIN_PAGE_SOURCE, /shijingTauriOAuthBridge/);
});

test('ShiJing auth adapter keeps token and OAuth custody out of the installed app renderer', () => {
  assert.doesNotMatch(LOGIN_PAGE_SOURCE, /createShijingRuntimeAccountBrowserBroker\(\)/);
  assert.doesNotMatch(AUTH_ADAPTER_SOURCE, /createRuntimeAccountBrowserBroker\(\{/);
  assert.doesNotMatch(AUTH_ADAPTER_SOURCE, /shijingTauriOAuthBridge/);
  assert.doesNotMatch(AUTH_ADAPTER_SOURCE, /runtime\.account\.beginLogin|runtime\.account\.completeLogin/);
});

test('ShiJing installed app auth adapter does not mint login idempotency envelopes', () => {
  assert.doesNotMatch(AUTH_ADAPTER_SOURCE, /withNimiRuntimeIdempotencyMetadata/);
  assert.doesNotMatch(AUTH_ADAPTER_SOURCE, /createNimiClientId\('shijing-runtime-account-begin-login'\)/);
  assert.doesNotMatch(AUTH_ADAPTER_SOURCE, /createNimiClientId\('shijing-runtime-account-complete-login'\)/);
});
