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

test('ShiJing login page uses the ShiJing logo as the desktop-browser trigger', () => {
  assert.match(
    LOGIN_PAGE_SOURCE,
    /const shijingLogoUrl = new URL\('\.\.\/\.\.\/\.\.\/\.\.\/src-tauri\/icons\/128x128@2x\.png', import\.meta\.url\)\.href;/,
  );
  assert.match(LOGIN_PAGE_SOURCE, /logo=\{shijingLogoUrl\}/);
  assert.match(LOGIN_PAGE_SOURCE, /logoAltText="ShiJing"/);
  assert.match(LOGIN_PAGE_SOURCE, /logoTrigger: 'shijing-login-trigger'/);
});

test('ShiJing login keeps the Nimi Tester Runtime account broker path', () => {
  assert.match(LOGIN_PAGE_SOURCE, /createShijingRuntimeAccountBrowserBroker\(\)/);
  assert.match(LOGIN_PAGE_SOURCE, /desktopBrowserAuth=\{\{[\s\S]*bridge: shijingTauriOAuthBridge,[\s\S]*runtimeAccountBroker,[\s\S]*\}\}/);
  assert.match(AUTH_ADAPTER_SOURCE, /createRuntimeAccountBrowserBroker\(\{/);
  assert.match(AUTH_ADAPTER_SOURCE, /caller: shijingRuntimeAccountCaller/);
  assert.match(AUTH_ADAPTER_SOURCE, /beforeRequest: ensureShijingRuntimeClientReady/);
  assert.match(AUTH_ADAPTER_SOURCE, /getClient: createShijingRuntimeAccountBrowserBrokerClient/);
});

test('ShiJing Runtime account browser login supplies idempotency metadata', () => {
  assert.match(AUTH_ADAPTER_SOURCE, /withNimiRuntimeIdempotencyMetadata/);
  assert.match(AUTH_ADAPTER_SOURCE, /createNimiClientId\('shijing-runtime-account-begin-login'\)/);
  assert.match(AUTH_ADAPTER_SOURCE, /createNimiClientId\('shijing-runtime-account-complete-login'\)/);
  assert.match(AUTH_ADAPTER_SOURCE, /client\.runtime\.account\.beginLogin\(request, beginOptions\)/);
  assert.match(AUTH_ADAPTER_SOURCE, /client\.runtime\.account\.completeLogin\(request, completeOptions\)/);
});
