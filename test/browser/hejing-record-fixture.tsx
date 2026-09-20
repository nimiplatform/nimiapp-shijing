// Browser-only fixture: actual HeJing page and store with explicit test persistence.
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { NimiThemeProvider, TooltipProvider } from '@nimiplatform/kit/ui';
import type { ShiJingSpace } from '../../src/domain/shijing-space.ts';
import type { SaveResult } from '../../src/product/persistence/persistence-client.ts';
import { buildHeJingPendingPreviewSpace } from '../../src/product/dev/hejing-sample-space.ts';
import { InMemoryPersistenceAdapter } from '../../src/product/persistence/in-memory-adapter.ts';
import { ShijingStoreProvider } from '../../src/product/state/shijing-store.tsx';
import { HeJingTab } from '../../src/product/tabs/hejing-tab.tsx';
import { i18n } from '../../src/shell/i18n/index.js';
import '../../src/styles.css';

class TestPersistence extends InMemoryPersistenceAdapter {
  failNext = false;
  override async save(snapshot: ShiJingSpace): Promise<SaveResult> {
    if (this.failNext) {
      this.failNext = false;
      return { ok: false, error: { kind: 'save_write_failed', adapter: 'in_memory', cause: 'injected test failure' } };
    }
    return super.save(snapshot);
  }
}

const base = buildHeJingPendingPreviewSpace('hejing-browser-test');
const firstPerson = base.persons[0]!;
const secondPerson = { ...firstPerson, id: 'hejing-second-person', display_name: '另一位人物' };
const initial: ShiJingSpace = {
  ...base,
  persons: [firstPerson, secondPerson],
  event_memories: [{
    id: 'hejing-shared-memory',
    occurred_at: '2026-05-01T13:45:00Z',
    body: '三人共同经历',
    person_refs: ['self', { kind: 'person', id: firstPerson.id }, { kind: 'person', id: secondPerson.id }],
    concern_tag_refs: [],
    source: 'nianjing',
    admissible_use: 'record_only',
    created_at: '2026-05-02T01:00:00Z',
    updated_at: '2026-05-02T01:00:00Z',
  }],
};
const persistence = new TestPersistence(initial);
Object.assign(window, { hejingTest: persistence });
await i18n.changeLanguage('zh');
createRoot(document.getElementById('root')!).render(
  <I18nextProvider i18n={i18n}>
    <NimiThemeProvider accentPack="nimi-accent" defaultScheme="light">
      <TooltipProvider>
        <ShijingStoreProvider snapshot={initial} persistenceClient={persistence}>
          <div className="shijing-shell"><div className="shijing-shell__main"><HeJingTab /></div></div>
        </ShijingStoreProvider>
      </TooltipProvider>
    </NimiThemeProvider>
  </I18nextProvider>,
);
