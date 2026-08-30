// Canonical ShiJing app identity.
//
// The public Nimi app id is single-source across the submitted manifest and
// SDK request shapes. The Tauri identifier is the exact platform-derived OS
// bundle identity; installed admission identity, release truth, process
// binding, and account generation remain Runtime-owned.

// @nimi-authority: rule.nimi.platform.app-ecosystem.p-napp-012b

export const SHIJING_APP_ID = 'nimi.shijing';
export const SHIJING_PRODUCT_SLUG = 'shijing';
export const SHIJING_TAURI_IDENTIFIER = `ai.nimi.apps.${SHIJING_APP_ID}`;
export const SHIJING_RUNTIME_APP_ID = SHIJING_APP_ID;
