import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { NimiThemeProvider, NimiToaster, TooltipProvider } from '@nimiplatform/kit/ui';
import { NimiAppSessionProvider, type NimiAppSession } from '@nimiplatform/kit/auth/app';
import { App } from './App.js';
import { i18n } from './i18n/index.js';
import { installShijingGlobalErrorLogging } from './infra/renderer-log.js';
import '../styles.css';
export type ShijingPlatform = { kind: 'desktop'; openConfiguration(): Promise<void> } | { kind: 'web' };
export function mountShijing(session: NimiAppSession, platform: ShijingPlatform) {
  installShijingGlobalErrorLogging();
  const root = createRoot(document.getElementById('root')!);
  root.render(<I18nextProvider i18n={i18n}><NimiThemeProvider accentPack="nimi-accent" defaultScheme="light"><TooltipProvider>
    <NimiAppSessionProvider session={session}><App platform={platform} /></NimiAppSessionProvider><NimiToaster />
  </TooltipProvider></NimiThemeProvider></I18nextProvider>);
  void session.start();
  return () => { session.dispose(); root.unmount(); };
}
