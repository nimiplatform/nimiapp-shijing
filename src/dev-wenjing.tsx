// Dev-only visual fixture for the 问镜 empty and chat layouts. The conversation
// below is sample content; this entry has no Runtime or persistence adapter
// and does not verify generation. Loaded only from dev-wenjing.html.

import React from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { NimiThemeProvider, TooltipProvider } from '@nimiplatform/kit/ui';
import type { ConcernTag } from './domain/concern-tag.ts';
import type { Conversation } from './domain/conversation.ts';
import { buildEmptyShiJingSpace } from './product/dev/initial-space.ts';
import { newConcernTagId, newConversationId, newConversationTurnId } from './product/ids/index.ts';
import { ShijingStoreProvider } from './product/state/shijing-store.tsx';
import { ShiJingTab } from './product/tabs/shijing-tab.tsx';
import { ShellLayout } from './shell/app-shell/shell-layout.js';
import { i18n } from './shell/i18n/index.js';
import './styles.css';

const DEMO_TAGS: readonly ConcernTag[] = [
  {
    id: newConcernTagId(),
    label: '#学业',
    status: 'active',
    sort_order: 0,
    parsed_topics: ['学业'],
    mention_refs: [],
    prompt_text: '',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  },
  {
    id: newConcernTagId(),
    label: '#姻缘',
    status: 'active',
    sort_order: 1,
    parsed_topics: ['姻缘'],
    mention_refs: [],
    prompt_text: '',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  },
];

const DEMO_CONVERSATION: Conversation = {
  id: newConversationId(),
  created_at: '2026-09-10T08:00:00Z',
  source_reading_ids: [],
  concern_tag_refs: [DEMO_TAGS[0].id],
  turns: [
    {
      id: newConversationTurnId(),
      role: 'user',
      body: '接下来30天，我最需要注意什么？',
      cited_reading_ids: [],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      created_at: '2026-09-10T08:00:00Z',
    },
    {
      id: newConversationTurnId(),
      role: 'ai',
      body: '未来30天的关键词是"收口"。已经在推进的事情，优先把它们完成到可交付的状态，而不是同时打开新的方向。\n\n需要注意的是中旬前后节奏容易被打断：临时插入的任务会变多，先确认优先级再答应。学业上适合做一次阶段性的复盘，把散落的知识点整理成体系。',
      cited_reading_ids: [],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      created_at: '2026-09-10T08:00:10Z',
    },
  ],
};

function DevWenJing() {
  const snapshot = React.useMemo(() => {
    const base = {
      ...buildEmptyShiJingSpace('dev-wenjing-user'),
      concern_tags: DEMO_TAGS,
    };
    return new URLSearchParams(window.location.search).has('chat')
      ? { ...base, conversations: [DEMO_CONVERSATION] }
      : base;
  }, []);

  React.useEffect(() => {
    void i18n.changeLanguage('zh');
  }, []);

  return (
    <ShellLayout>
      <ShijingStoreProvider snapshot={snapshot}>
        <div className="shijing-shell" data-active-tab="shijing">
          <div className="shijing-shell__main">
            <ShiJingTab />
          </div>
        </div>
      </ShijingStoreProvider>
    </ShellLayout>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <NimiThemeProvider accentPack="nimi-accent" defaultScheme="light">
        <TooltipProvider>
          <DevWenJing />
        </TooltipProvider>
      </NimiThemeProvider>
    </I18nextProvider>
  </React.StrictMode>,
);
