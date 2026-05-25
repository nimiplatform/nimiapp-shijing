// Re-export kit's Tauri bridge primitives so the rest of the renderer
// consumes them through one local module. nimi-shell-tauri owns auth /
// runtime / OAuth glue; this file is the seam.

export {
  hasTauriInvoke,
  invoke,
  invokeChecked,
  BridgeError,
  getRuntimeDefaults,
  getDaemonStatus,
  startDaemon,
  stopDaemon,
  restartDaemon,
  createTauriOAuthBridge,
  oauthTokenExchange,
  oauthListenForCode,
  openExternalUrl,
  focusMainWindow,
  parseRuntimeDefaults,
  parseRuntimeBridgeDaemonStatus,
  hasTauriRuntime,
  invokeTauri,
} from '@nimiplatform/kit/shell/renderer/bridge';

export type {
  RuntimeDefaults,
  RealmDefaults,
  RuntimeExecutionDefaults,
  RuntimeBridgeDaemonStatus,
  JsonValue,
  JsonObject,
  JsonPrimitive,
} from '@nimiplatform/kit/shell/renderer/bridge';

import { createTauriOAuthBridge } from '@nimiplatform/kit/shell/renderer/bridge';
export const shijingTauriOAuthBridge = createTauriOAuthBridge();

export type { ShijingRuntimeDefaults } from './shijing-types.js';
export { getShijingRuntimeDefaults } from './shijing-runtime-defaults.js';
