// Browser-only fixtures: real components, explicitly isolated test data and
// persistence. These do not claim protected Runtime or model acceptance.
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { NimiThemeProvider, TooltipProvider } from '@nimiplatform/kit/ui';
import { InMemoryPersistenceAdapter } from '../../src/product/persistence/in-memory-adapter.ts';
import { ShijingStoreProvider } from '../../src/product/state/shijing-store.tsx';
import { ShijingShell } from '../../src/product/shell/shijing-shell.tsx';
import { LunarBirthDatePicker, type LunarBirthDateChange } from '../../src/product/natal/lunar-birth-date-picker.tsx';
import { i18n } from '../../src/shell/i18n/index.js';
import { validConcernTag, validNatalInputs, validPerson, validShiJingSpace } from '../_fixtures.mjs';
import '../../src/styles.css';

const params = new URLSearchParams(location.search);
const base = validShiJingSpace({
  concern_tags: [validConcernTag('tag-career', { label: '#Career', parsed_topics: ['career'], prompt_text: 'Work' })],
  persons: [validPerson('person-partner', { display_name: 'Partner', relation: 'Spouse', natal_inputs: validNatalInputs({ calculation_sex: 'female' }) })],
  plan_items: ['2026-04-01T00:00:00Z', '2026-09-30T00:00:00Z', '2027-04-01T00:00:00Z'].map((planned_for, index) => ({
    id: `plan-${index}`, planned_for, body: ['Past intention', 'Current intention', 'Future intention'][index],
    person_refs: ['self'], concern_tag_refs: [], source: 'yuejing',
    created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z',
  })),
});
const initial = {
  ...base,
  self_subject: { natal_inputs: validNatalInputs({ calculation_sex: 'male' }) },
  settings: { ...base.settings, ui_language: 'zh' as const },
};
const persistence = new InMemoryPersistenceAdapter(initial);
Object.assign(window, { auditTest: persistence });

function KeyboardFixture() {
  const [open, setOpen] = useState(true);
  const [value, setValue] = useState<LunarBirthDateChange>({
    local_date_text: '1987-01-29', lunar_year: '1987', lunar_month: '1', lunar_day: '1', lunar_is_leap_month: 'normal',
  });
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, []);
  return open ? (
    <div role="dialog" aria-label="Birth details" style={{ padding: 32 }}>
      <LunarBirthDatePicker
        localDateText={value.local_date_text}
        lunarYear={value.lunar_year}
        lunarMonth={value.lunar_month}
        lunarDay={value.lunar_day}
        lunarIsLeapMonth={value.lunar_is_leap_month}
        onChange={setValue}
      />
      <output data-testid="lunar-selection">{JSON.stringify(value)}</output>
      <button type="button">Next field</button>
    </div>
  ) : <p>Parent closed</p>;
}

await i18n.changeLanguage('zh');
createRoot(document.getElementById('root')!).render(
  <I18nextProvider i18n={i18n}>
    <NimiThemeProvider accentPack="nimi-accent" defaultScheme="light">
      <TooltipProvider>
        {params.get('surface') === 'keyboard' ? <KeyboardFixture /> : (
          <ShijingStoreProvider snapshot={initial} persistenceClient={persistence} aiConfigReady={false}>
            <ShijingShell />
          </ShijingStoreProvider>
        )}
      </TooltipProvider>
    </NimiThemeProvider>
  </I18nextProvider>,
);
