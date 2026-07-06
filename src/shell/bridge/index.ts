// ShiJing is a developer-registered local app, not a first-party caller. Keep
// renderer bridge exports scoped to read/status and code-only OAuth surfaces;
// Runtime account service owns token custody and Desktop owns daemon control.

export {
  hasTauriInvoke,
  invoke,
  invokeChecked,
  BridgeError,
  getDaemonStatus,
  oauthListenForCode,
  openExternalUrl,
  focusMainWindow,
  parseRuntimeBridgeDaemonStatus,
  hasTauriRuntime,
  invokeTauri,
} from '@nimiplatform/kit/shell/renderer/bridge';

export type {
  RuntimeBridgeDaemonStatus,
  JsonValue,
  JsonObject,
  JsonPrimitive,
} from '@nimiplatform/kit/shell/renderer/bridge';

import type { ShellOAuthBridge } from '@nimiplatform/kit/core/oauth';
import {
  focusMainWindow,
  hasTauriInvoke,
  oauthListenForCode,
  openExternalUrl,
} from '@nimiplatform/kit/shell/renderer/bridge';

export const SHIJING_TOKEN_EXCHANGE_FORBIDDEN =
  'ShiJing does not expose OAuth token exchange; Runtime account service owns token custody.';

export const shijingTauriOAuthBridge: ShellOAuthBridge = {
  hasShellHostInvoke: hasTauriInvoke,
  oauthListenForCode,
  openExternalUrl,
  focusMainWindow,
  oauthTokenExchange: async () => {
    throw new Error(SHIJING_TOKEN_EXCHANGE_FORBIDDEN);
  },
};

export type { ShijingRuntimeDefaults } from './shijing-types.ts';
export { getShijingRuntimeDefaults } from './shijing-runtime-defaults.ts';
