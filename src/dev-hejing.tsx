// TEMP visual harness for the redesigned HeJing (Relationship Mirror) tab.
// Mounts the real HeJingTab through real CSS with no Tauri runtime and no
// backend bootstrap, so the redesign can be screenshotted end to end. Loaded
// from dev-hejing.html only.

import React from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { NimiThemeProvider, TooltipProvider } from '@nimiplatform/kit/ui';
import { buildHeJingPendingPreviewSpace, buildHeJingPreviewSpace } from './product/dev/hejing-sample-space.ts';
import { buildEmptyShiJingSpace } from './product/dev/initial-space.ts';
import { ShijingStoreProvider } from './product/state/shijing-store.tsx';
import { HeJingTab } from './product/tabs/hejing-tab.tsx';
import { i18n } from './shell/i18n/index.js';
import './styles.css';

function DevHeJing() {
  // `dev-hejing.html?first-run` seeds an intake-complete-but-personless space
  // so the first-run immersive empty state can be reviewed end to end.
  // `dev-hejing.html?pending` seeds a person without any relationship reading
  // so the ready-to-generate pending state can be reviewed end to end.
  const params = new URLSearchParams(window.location.search);
  const firstRun = params.has('first-run');
  const pending = params.has('pending');
  const snapshot = React.useMemo(
    () =>
      firstRun
        ? buildEmptyShiJingSpace('dev-hejing-user')
        : pending
          ? buildHeJingPendingPreviewSpace('dev-hejing-user')
          : buildHeJingPreviewSpace('dev-hejing-user'),
    [firstRun, pending],
  );

  React.useEffect(() => {
    void i18n.changeLanguage('zh');
  }, []);

  return (
    <ShijingStoreProvider snapshot={snapshot}>
      <div className="shijing-shell" data-active-tab="hejing">
        <div className="shijing-shell__main">
          <HeJingTab />
        </div>
      </div>
    </ShijingStoreProvider>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <NimiThemeProvider accentPack="nimi-accent" defaultScheme="light">
        <TooltipProvider>
          <DevHeJing />
        </TooltipProvider>
      </NimiThemeProvider>
    </I18nextProvider>
  </React.StrictMode>,
);
