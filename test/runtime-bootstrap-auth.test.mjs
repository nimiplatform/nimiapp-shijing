import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  SHIJING_APP_ID,
  SHIJING_RUNTIME_APP_ID,
  SHIJING_RUNTIME_APP_INSTANCE_ID,
  SHIJING_RUNTIME_DEVICE_ID,
} from '../src/contracts/app-identity.ts';

const BOOTSTRAP_SOURCE = readFileSync(
  new URL('../src/shell/infra/shijing-bootstrap.ts', import.meta.url),
  'utf8',
);
const SESSION_SOURCE = readFileSync(
  new URL('../src/shell/infra/shijing-runtime-session.ts', import.meta.url),
  'utf8',
);
const RUNTIME_AI_SOURCE = readFileSync(
  new URL('../src/shell/ai/shijing-runtime-ai-client.ts', import.meta.url),
  'utf8',
);
const RUNTIME_APP_STORAGE_SOURCE = readFileSync(
  new URL('../src/shell/persistence/runtime-app-storage-adapter.ts', import.meta.url),
  'utf8',
);
const BRIDGE_SOURCE = readFileSync(
  new URL('../src/shell/bridge/index.ts', import.meta.url),
  'utf8',
);
const TAURI_MAIN_SOURCE = readFileSync(
  new URL('../src-tauri/src/main.rs', import.meta.url),
  'utf8',
);

test('ShiJing uses one canonical Nimi app id across manifest, Runtime, and Tauri identity', () => {
  assert.equal(SHIJING_APP_ID, 'nimi.shijing');
  assert.equal(SHIJING_RUNTIME_APP_ID, 'nimi.shijing');
  assert.equal(SHIJING_RUNTIME_APP_INSTANCE_ID, 'nimi.shijing.local-developer');
  assert.equal(SHIJING_RUNTIME_DEVICE_ID, 'shijing-local-developer-device');
  assert.equal(SHIJING_RUNTIME_APP_ID, SHIJING_APP_ID);
});

test('ShiJing Nimi client uses developer-registered Runtime session without raw Realm tokens', () => {
  assert.match(BOOTSTRAP_SOURCE, /configureShijingRuntimeSession/);
  assert.doesNotMatch(BOOTSTRAP_SOURCE, /syncShijingRuntimeDeveloperRegistrationConfig/);
  assert.match(SESSION_SOURCE, /createNimiClient/);
  assert.match(SESSION_SOURCE, /createNimiDeveloperRegisteredRuntimeAccountCaller/);
  assert.doesNotMatch(SESSION_SOURCE, /createRealmFetchTransport/);
  assert.doesNotMatch(SESSION_SOURCE, /getAccessToken/);
  assert.match(SESSION_SOURCE, /createNimiRuntimeAppSessionMetadataProvider/);
  assert.match(SESSION_SOURCE, /authorizeExternalPrincipal/);
  assert.match(SESSION_SOURCE, /protectedAccessInflight\.subjectUserId !== subjectUserId/);
  assert.match(SESSION_SOURCE, /protectedAccessInflight === inflight/);
  assert.match(SESSION_SOURCE, /realm:\s*false/);
  assert.doesNotMatch(SESSION_SOURCE, /credentials:\s*'include'/);
  assert.match(SESSION_SOURCE, /type:\s*'tauri-ipc'/);
  assert.match(SESSION_SOURCE, /commandNamespace:\s*'runtime_bridge'/);
  assert.match(SESSION_SOURCE, /eventNamespace:\s*'runtime_bridge'/);
  assert.match(SESSION_SOURCE, /app:\s*false/);
  assert.match(SESSION_SOURCE, /permissions:\s*false/);
  assert.match(SESSION_SOURCE, /appId:\s*SHIJING_RUNTIME_APP_ID/);
  assert.match(SESSION_SOURCE, /externalPrincipalId:\s*SHIJING_RUNTIME_APP_ID/);
  assert.match(RUNTIME_AI_SOURCE, /appId:\s*SHIJING_RUNTIME_APP_ID/);
  assert.match(RUNTIME_APP_STORAGE_SOURCE, /appId:\s*SHIJING_RUNTIME_APP_ID/);
});

test('ShiJing does not own Runtime developer-registration gate or local auth token storage', () => {
  assert.doesNotMatch(BOOTSTRAP_SOURCE, /setDaemonConfig|restartDaemon|mergeNimiRuntimeBridgeDeveloperRegistrationConfig/);
  assert.doesNotMatch(SESSION_SOURCE, /LOCAL_FIRST_PARTY_APP|local-first-party|local-first-party-app/);
  assert.doesNotMatch(TAURI_MAIN_SOURCE, /auth_session_commands|auth_session_load|auth_session_save|auth_session_clear/);
  assert.doesNotMatch(BRIDGE_SOURCE, /startDaemon|stopDaemon|restartDaemon|getDaemonConfig|setDaemonConfig|RuntimeBridgeConfigSetResult/);
  assert.doesNotMatch(BRIDGE_SOURCE, /  getRuntimeDefaults,|parseRuntimeDefaults|  RuntimeDefaults,|  RealmDefaults,|  RuntimeExecutionDefaults,/);
  assert.doesNotMatch(BRIDGE_SOURCE, /createTauriOAuthBridge|oauthTokenExchange,/);
  assert.match(BRIDGE_SOURCE, /SHIJING_TOKEN_EXCHANGE_FORBIDDEN/);
  assert.doesNotMatch(TAURI_MAIN_SOURCE, /runtime_defaults::runtime_defaults|defaults::runtime_defaults/);
  assert.doesNotMatch(TAURI_MAIN_SOURCE, /oauth_commands::oauth_token_exchange/);
  assert.doesNotMatch(TAURI_MAIN_SOURCE, /runtime_bridge::runtime_bridge_start|runtime_bridge::runtime_bridge_stop|runtime_bridge::runtime_bridge_restart/);
  assert.doesNotMatch(TAURI_MAIN_SOURCE, /runtime_bridge::runtime_bridge_config_get|runtime_bridge::runtime_bridge_config_set/);
});
