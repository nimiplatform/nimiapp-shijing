// Renderer dev preview — mounts the product UI directly with stub auth +
// NoOp Runtime AI client so I can iterate on visuals without a Tauri
// shell + runtime bridge. This module is loaded from `dev-preview.html`
// only; it is NOT part of the production app entry. The production entry
// remains `index.html` → `src/main.tsx`.

import React from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { NimiThemeProvider, TooltipProvider } from '@nimiplatform/kit/ui';
import { ShellLayout } from './shell/app-shell/shell-layout.js';
import { useAppStore } from './shell/app-shell/app-store.js';
import { ShijingStoreProvider } from './product/state/shijing-store.tsx';
import { ShijingShell } from './product/shell/shijing-shell.tsx';
import { InMemoryPersistenceAdapter } from './product/persistence/in-memory-adapter.ts';
import { NoOpRuntimeAiClient } from './product/astrology/runtime-ai-client.ts';
import type { ShiJingSpace } from './domain/shijing-space.ts';
import type { NatalInputs, RawBirthInput } from './domain/person.ts';
import { i18n } from './shell/i18n/index.js';
import './styles.css';

function buildRawBirth(): RawBirthInput {
  return { calendar_system: 'gregorian', local_date_text: '1995-05-12' };
}

function buildNatal(): NatalInputs {
  return {
    raw_birth_input: buildRawBirth(),
    birth_datetime_utc: '1995-05-12T01:30:00Z',
    birth_precision: 'exact',
    calendar_system: 'gregorian',
    birth_location: {
      latitude: 39.9042,
      longitude: 116.4074,
      iana_time_zone: 'Asia/Shanghai',
      place_name: '北京',
    },
    calculation_sex: 'unspecified',
  };
}

function buildSnapshot(userId: string): ShiJingSpace {
  return {
    user_id: userId,
    self_subject: { natal_inputs: buildNatal() },
    persons: [],
    relations: [],
    events: [],
    views: [],
    readings: [],
    conversations: [],
    settings: {
      response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
      notification_preferences: { daily_today_card_enabled: false, daily_today_card_local_time: '08:00' },
    },
  };
}

function DevPreviewProductArea() {
  const snapshot = React.useMemo(() => buildSnapshot('dev-preview-user'), []);
  const persistence = React.useMemo(() => new InMemoryPersistenceAdapter(), []);
  const aiClient = React.useMemo(() => new NoOpRuntimeAiClient(), []);
  return (
    <ShijingStoreProvider snapshot={snapshot} persistenceClient={persistence} runtimeAiClient={aiClient}>
      <ShijingShell />
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
