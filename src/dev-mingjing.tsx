// TEMP visual harness for the redesigned 命镜 (Destiny Mirror) tab.
// Mounts the REAL MingJingTab over a seeded real natal chart (1990-04-12 08:30
// male, Asia/Shanghai → 丁未日) through the real CSS, with in-memory persistence
// and no Tauri runtime, so the redesign can be screenshotted end to end.
// Loaded from dev-mingjing.html only. Delete after review.

import React from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { ShijingStoreProvider } from './product/state/shijing-store.tsx';
import { MingJingTab } from './product/tabs/mingjing-tab.tsx';
import { InMemoryPersistenceAdapter } from './product/persistence/in-memory-adapter.ts';
import { localWallClockToUtcInstant } from './product/astrology/local-wall-clock.ts';
import type { ShiJingSpace } from './domain/shijing-space.ts';
import { i18n } from './shell/i18n/index.js';
import './styles.css';

const TZ = 'Asia/Shanghai';

function seededSpace(): ShiJingSpace {
  const birthUtc = localWallClockToUtcInstant('1990-04-12T08:30:00', TZ);
  if (!birthUtc) throw new Error('dev-mingjing: invalid seed birth datetime');
  return {
    user_id: 'dev-mingjing',
    self_subject: {
      natal_inputs: {
        raw_birth_input: {
          calendar_system: 'gregorian',
          local_date_text: '1990-04-12',
          local_time_text: '08:30',
          place_text: 'Shanghai',
        },
        birth_datetime_utc: birthUtc.toISOString(),
        birth_precision: 'exact',
        calendar_system: 'gregorian',
        calculation_sex: 'male',
        birth_location: { latitude: 31.23, longitude: 121.47, iana_time_zone: TZ, place_name: 'Shanghai' },
      },
    },
    persons: [],
    concern_tags: [],
    event_memories: [],
    plan_items: [],
    readings: [],
    conversations: [],
    settings: {
      ui_language: 'zh',
      response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
    },
  };
}

function DevMingJing() {
  const snapshot = React.useMemo(seededSpace, []);
  const persistence = React.useMemo(() => new InMemoryPersistenceAdapter(), []);
  React.useEffect(() => {
    void i18n.changeLanguage('zh');
  }, []);
  return (
    <ShijingStoreProvider snapshot={snapshot} persistenceClient={persistence}>
      <div className="shijing-shell" data-active-tab="mingjing">
        <div className="shijing-shell__main">
          <MingJingTab startupGuideDismissed onRequestOpenSettings={() => {}} />
        </div>
      </div>
    </ShijingStoreProvider>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <DevMingJing />
    </I18nextProvider>
  </React.StrictMode>,
);
