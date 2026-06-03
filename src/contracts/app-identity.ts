// Canonical ShiJing app identity.
//
// Tauri `identifier`, Nimi Runtime caller id, and app-scoped AIConfig owner id
// must stay identical. Divergence splits runtime evidence from local app
// configuration and makes model bindings non-authoritative.

export const SHIJING_APP_ID = 'ai.nimi.apps.shijing';
export const SHIJING_APP_INSTANCE_ID = `${SHIJING_APP_ID}.local-first-party`;
export const SHIJING_DEVICE_ID = 'local-first-party-device';
