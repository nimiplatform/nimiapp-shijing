// Browser test only: real page, generation provider and store; explicit test
// persistence and AI responses exercise recovery without a protected session.
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { NimiThemeProvider, TooltipProvider } from '@nimiplatform/kit/ui';
import type { ShiJingSpace } from '../../src/domain/shijing-space.ts';
import type { SaveResult } from '../../src/product/persistence/persistence-client.ts';
import { InMemoryPersistenceAdapter } from '../../src/product/persistence/in-memory-adapter.ts';
import { ShijingStoreProvider } from '../../src/product/state/shijing-store.tsx';
import {
  RiJingGenerationProvider,
  useRiJingGeneration,
} from '../../src/product/daily-rijing/rijing-generation-provider.tsx';
import type { RiJingActivityPort } from '../../src/product/daily-rijing/rijing-activity.ts';
import { RiJingTab } from '../../src/product/tabs/rijing-tab.tsx';
import { i18n } from '../../src/shell/i18n/index.js';
import { validConcernTag, validRijingOutput, validShiJingSpace } from '../_fixtures.mjs';
import { MockRuntimeAiClient } from '../_mock-runtime-ai-client.mjs';
import '../../src/styles.css';

class TestPersistence extends InMemoryPersistenceAdapter {
  attempts = 0;
  override async save(snapshot: ShiJingSpace): Promise<SaveResult> {
    this.attempts += 1;
    if (this.attempts === 1) {
      return { ok: false, error: { kind: 'save_write_failed', adapter: 'in_memory', cause: 'injected write failure' } };
    }
    return super.save(snapshot);
  }
}

const base = validShiJingSpace({ concern_tags: [validConcernTag()] });
const initial = {
  ...base,
  settings: { ...base.settings, daily_rijing: { enabled: true, time: '08:00' } },
};
const persistence = new TestPersistence(initial);
const observed = { aiCalls: 0, publishedAfterSave: [] as number[] };
const runtimeAi = new MockRuntimeAiClient({
  canned_output_by_kind: { rijing: validRijingOutput() },
  capture: () => { observed.aiCalls += 1; },
});
const activity: RiJingActivityPort = {
  async put() {
    observed.publishedAfterSave.push(persistence.peek()?.readings.length ?? 0);
  },
};
Object.assign(window, { rijingTest: { persistence, observed } });

function GenerationStatus() {
  const generation = useRiJingGeneration();
  return <output data-testid="rijing-generation-status">{generation.status.kind}</output>;
}

await i18n.changeLanguage('zh');
createRoot(document.getElementById('root')!).render(
  <I18nextProvider i18n={i18n}>
    <NimiThemeProvider accentPack="nimi-accent" defaultScheme="light">
      <TooltipProvider>
        <ShijingStoreProvider snapshot={initial} persistenceClient={persistence} runtimeAiClient={runtimeAi}>
          <RiJingGenerationProvider activity={activity} onOpenRiJing={() => undefined}>
            <GenerationStatus />
            <div className="shijing-shell"><div className="shijing-shell__main"><RiJingTab /></div></div>
          </RiJingGenerationProvider>
        </ShijingStoreProvider>
      </TooltipProvider>
    </NimiThemeProvider>
  </I18nextProvider>,
);
