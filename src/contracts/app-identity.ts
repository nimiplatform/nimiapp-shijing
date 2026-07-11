// Canonical ShiJing app identity.
//
// The public Nimi app id is single-source across the submitted manifest,
// SDK request shapes, and Tauri bundle identity. Installed admission identity,
// release truth, process binding, and account generation remain Runtime-owned.

export const SHIJING_APP_ID = 'nimi.shijing';
export const SHIJING_PRODUCT_SLUG = 'shijing';
export const SHIJING_TAURI_IDENTIFIER = SHIJING_APP_ID;
export const SHIJING_RUNTIME_APP_ID = SHIJING_APP_ID;
