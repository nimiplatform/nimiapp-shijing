import React from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { NimiThemeProvider, TooltipProvider } from '@nimiplatform/kit/ui';
import { App } from './shell/App.js';
import { i18n } from './shell/i18n/index.js';
import { installShijingGlobalErrorLogging } from './shell/infra/renderer-log.js';
import { installShijingTauriRuntimeHook } from './shell/infra/tauri-runtime-hook.js';
import './styles.css';

installShijingGlobalErrorLogging();
installShijingTauriRuntimeHook();

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <NimiThemeProvider accentPack="nimi-accent" defaultScheme="light">
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </NimiThemeProvider>
    </I18nextProvider>
  </React.StrictMode>,
);
