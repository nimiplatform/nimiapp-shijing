// Canonical ShiJing app identity.
//
// The Nimi app id is single-source across manifest, Runtime/SDK, storage,
// AIConfig, and Tauri bundle identity. The product-local mirror kind/slug
// remains `shijing`, but it is not an app identity.

export const SHIJING_APP_ID = 'nimi.shijing';
export const SHIJING_PRODUCT_SLUG = 'shijing';
export const SHIJING_TAURI_IDENTIFIER = SHIJING_APP_ID;
export const SHIJING_RUNTIME_APP_ID = SHIJING_APP_ID;
export const SHIJING_RUNTIME_APP_INSTANCE_ID = `${SHIJING_RUNTIME_APP_ID}.local-developer`;
export const SHIJING_RUNTIME_DEVICE_ID = 'shijing-local-developer-device';
