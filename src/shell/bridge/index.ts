export {
  BridgeError,
  confirmDialog,
  createInstalledNimiAppStandardShellSurface,
  focusMainWindow,
  hasElectronRuntime,
  hasNimiShellRuntime,
  hasTauriRuntime,
  readInstalledNimiAppLaunchBinding,
  startWindowDrag,
} from '@nimiplatform/kit/shell/renderer/bridge';

export type {
  InstalledNimiAppLaunchBinding,
  InstalledNimiAppStandardShellSurface,
  InstalledNimiAppStorageRemoveJsonResult,
  JsonValue,
  JsonObject,
  JsonPrimitive,
} from '@nimiplatform/kit/shell/renderer/bridge';
