// Browser test only: real editor and store, with explicit write-failure injection.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { NimiThemeProvider, TooltipProvider } from '@nimiplatform/kit/ui';
import type { ShiJingSpace } from '../../src/domain/shijing-space.ts';
import type { SaveResult } from '../../src/product/persistence/persistence-client.ts';
import { buildEmptyShiJingSpace } from '../../src/product/dev/initial-space.ts';
import { InMemoryPersistenceAdapter } from '../../src/product/persistence/in-memory-adapter.ts';
import { ShijingStoreProvider } from '../../src/product/state/shijing-store.tsx';
import { ResponsePreferencesEditor } from '../../src/product/settings/response-preferences-editor.tsx';
import { i18n } from '../../src/shell/i18n/index.js';
import '../../src/styles.css';

class DelayedTestPersistence extends InMemoryPersistenceAdapter {
  attempts = 0;
  failNext = false;
  override async save(snapshot: ShiJingSpace): Promise<SaveResult> {
    this.attempts++;
    await new Promise((resolve) => setTimeout(resolve, 150));
    if (this.failNext) {
      this.failNext = false;
      return { ok: false, error: { kind: 'save_write_failed', adapter: 'in_memory', cause: 'injected test failure' } };
    }
    return super.save(snapshot);
  }
}
const initial = buildEmptyShiJingSpace('response-preferences-browser-test');
const persistence = new DelayedTestPersistence(initial);
Object.assign(window, { preferencesTest: persistence });

function Fixture() {
  const [visible, setVisible] = useState(true);
  return (
    <ShijingStoreProvider snapshot={initial} persistenceClient={persistence}>
      <button type="button" onClick={() => setVisible(!visible)}>Toggle editor</button>
      <div className="shijing-settings-page--styled">
        {visible ? <ResponsePreferencesEditor /> : null}
      </div>
    </ShijingStoreProvider>
  );
}

await i18n.changeLanguage('zh');
createRoot(document.getElementById('root')!).render(
  <I18nextProvider i18n={i18n}>
    <NimiThemeProvider accentPack="nimi-accent" defaultScheme="light">
      <TooltipProvider><Fixture /></TooltipProvider>
    </NimiThemeProvider>
  </I18nextProvider>,
);
