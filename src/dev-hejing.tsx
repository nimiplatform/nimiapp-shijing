// TEMP visual harness for the redesigned HeJing (Relationship Mirror) tab.
// Mounts the real HeJingTab through real CSS with no Tauri runtime and no
// backend bootstrap, so the redesign can be screenshotted end to end. Loaded
// from dev-hejing.html only.

import React from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { NimiThemeProvider, TooltipProvider } from '@nimiplatform/kit/ui';
import { HeJingTab } from './product/tabs/hejing-tab.tsx';
import { i18n } from './shell/i18n/index.js';
import './styles.css';

function DevHeJing() {
  React.useEffect(() => {
    void i18n.changeLanguage('zh');
  }, []);
  return (
    <div className="shijing-shell" data-active-tab="hejing">
      <div className="shijing-shell__main">
        <HeJingTab />
      </div>
    </div>
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
