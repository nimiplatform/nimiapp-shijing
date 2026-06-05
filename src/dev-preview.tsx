// Renderer dev preview — mounts the product UI directly with stub auth.
// Loaded from `dev-preview.html` only. Production entry remains
// `index.html` → `src/main.tsx`.

import React from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { NimiThemeProvider, TooltipProvider } from '@nimiplatform/kit/ui';
import { ShellLayout } from './shell/app-shell/shell-layout.js';
import { useAppStore } from './shell/app-shell/app-store.js';
import { ShijingStoreProvider } from './product/state/shijing-store.tsx';
import { ShijingShell } from './product/shell/shijing-shell.tsx';
import { InMemoryPersistenceAdapter } from './product/persistence/in-memory-adapter.ts';
import { buildEmptyShiJingSpace } from './product/dev/initial-space.ts';
import { i18n } from './shell/i18n/index.js';
import './styles.css';

function DevPreviewProductArea() {
  const snapshot = React.useMemo(() => buildEmptyShiJingSpace('dev-preview-user'), []);
  const persistence = React.useMemo(() => new InMemoryPersistenceAdapter(), []);
  return (
    <ShijingStoreProvider snapshot={snapshot} persistenceClient={persistence}>
      <ShijingShell account={{ name: '演示用户' }} />
    </ShijingStoreProvider>
  );
}

function DevApp() {
  React.useEffect(() => {
    useAppStore.getState().setAuthSession({ id: 'dev-preview-user', displayName: '演示用户' });
    useAppStore.getState().setBootstrapReady(true);
  }, []);
  return (
    <ShellLayout>
      <DevPreviewProductArea />
    </ShellLayout>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <NimiThemeProvider accentPack="nimi-accent" defaultScheme="light">
        <TooltipProvider>
          <DevApp />
        </TooltipProvider>
      </NimiThemeProvider>
    </I18nextProvider>
  </React.StrictMode>,
);
