import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const appReact = fileURLToPath(new URL('./node_modules/react/index.js', import.meta.url));
const appReactDom = fileURLToPath(new URL('./node_modules/react-dom/index.js', import.meta.url));
const appReactJsxRuntime = fileURLToPath(
  new URL('./node_modules/react/jsx-runtime.js', import.meta.url),
);
const appTauriApiCore = fileURLToPath(new URL('./node_modules/@tauri-apps/api/core.js', import.meta.url));
const appTauriApiEvent = fileURLToPath(new URL('./node_modules/@tauri-apps/api/event.js', import.meta.url));
function normalizeId(id: string): string {
  return id.replaceAll('\\', '/');
}

function isNimiSdkModule(normalizedId: string): boolean {
  return (
    normalizedId.includes('/node_modules/@nimiplatform/sdk/')
    || normalizedId.includes('/node_modules/.pnpm/@nimiplatform+sdk@')
  );
}

function isNimiKitModule(normalizedId: string): boolean {
  return (
    normalizedId.includes('/node_modules/@nimiplatform/kit/')
    || normalizedId.includes('/node_modules/.pnpm/@nimiplatform+kit@')
  );
}

function chunkForModule(id: string): string | undefined {
  if (id.includes('/node_modules/react-dom/') || id.includes('/node_modules/react/')) {
    return 'vendor-react';
  }
  if (id.includes('/node_modules/i18next/') || id.includes('/node_modules/react-i18next/')) {
    return 'nimi-kit';
  }
  if (id.includes('/node_modules/lunar-typescript/')) return 'astrology-lunar';
  if (id.includes('/node_modules/tyme4ts/')) return 'astrology-tyme';
  if (id.includes('/node_modules/iztro/') || id.includes('/node_modules/dayjs/')) {
    return 'astrology-ziwei';
  }
  if (id.includes('/node_modules/three/') || id.includes('/node_modules/simplex-noise/')) {
    return 'vendor-three';
  }

  const normalized = normalizeId(id);
  if (isNimiSdkModule(normalized) && normalized.includes('/core-generated/')) {
    return 'nimi-sdk-generated';
  }
  if (isNimiSdkModule(normalized)) {
    return 'nimi-sdk';
  }
  if (isNimiKitModule(normalized)) {
    return 'nimi-kit';
  }
  return undefined;
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^react$/, replacement: appReact },
      { find: /^react-dom$/, replacement: appReactDom },
      { find: /^react\/jsx-runtime$/, replacement: appReactJsxRuntime },
      { find: /^@tauri-apps\/api\/core$/, replacement: appTauriApiCore },
      { find: /^@tauri-apps\/api\/event$/, replacement: appTauriApiEvent },
    ],
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  build: {
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks: chunkForModule,
      },
    },
  },
});
