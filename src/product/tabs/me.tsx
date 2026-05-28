// Me tab: lightweight personal-profile center.
//
// Information hierarchy (top → bottom):
//   1. Page header — title + a small status badge derived from the
//      readiness summary (e.g. "可使用 · 时间待确认"). No large
//      status panel competes for the first screen.
//   2. Natal summary ("本人资料") — the page's primary content
//      card: 4 core rows + amber precision callout when needed +
//      collapsed "排盘技术详情" disclosure.
//   3. Persons summary ("关心的人") — compressed list.
//   4. Combined "设置与记录" — response preferences + latest
//      conversation as two list rows in one card (consolidated
//      from the previous two-up).
//   5. Privacy footer.
//
// All editing is routed through the overlays defined in
// me-edit-overlays.tsx + conversation-thread.tsx so the surface
// stays read-first.

import { useMemo, useState } from 'react';

import { describeTab } from '../navigation/tab-descriptor.ts';
import { ConversationThreadOverlay } from '../conversations/conversation-thread.tsx';
import { newConversationId } from '../conversations/conversation-id.ts';
import type { Conversation } from '../../domain/conversation.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import { MeNatalSummary } from './me-natal-summary.tsx';
import { MePersonsSummary } from './me-persons-summary.tsx';
import { MeSettingsHistoryCard } from './me-footer-cards.tsx';
import {
  MeNatalEditorOverlay,
  MePersonsManagerOverlay,
  MeSettingsEditorOverlay,
} from './me-edit-overlays.tsx';
import {
  meStatusBadge,
  summarizeNatalCompleteness,
} from './me-readiness-summary.ts';

const TAB = describeTab('me');

export function MeTab() {
  const { state, dispatch } = useShijingStore();
  const [natalEditorOpen, setNatalEditorOpen] = useState(false);
  const [settingsEditorOpen, setSettingsEditorOpen] = useState(false);
  const [personsManagerOpen, setPersonsManagerOpen] = useState(false);
  const [conversationOverlay, setConversationOverlay] = useState<{
    open: boolean;
    conversationId: string | null;
  }>({ open: false, conversationId: null });

  const inputs = state.snapshot.self_subject.natal_inputs;
  const summary = useMemo(() => summarizeNatalCompleteness(inputs), [inputs]);
  const badge = useMemo(() => meStatusBadge(summary), [summary]);

  function openConversation(id: string) {
    setConversationOverlay({ open: true, conversationId: id });
  }

  function createConversationAndOpen() {
    const conversation: Conversation = {
      id: newConversationId(),
      created_at: new Date().toISOString(),
      subject_anchor: state.observation_target,
      turns: [],
    };
    const nextSnapshot = {
      ...state.snapshot,
      conversations: [...state.snapshot.conversations, conversation],
    };
    const check = validateShiJingSpace(nextSnapshot);
    if (!check.ok) {
      setConversationOverlay({ open: true, conversationId: null });
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: nextSnapshot });
    setConversationOverlay({ open: true, conversationId: conversation.id });
  }

  return (
    <section
      className="shijing-tab shijing-tab--me"
      aria-labelledby="shijing-me-heading"
      aria-label={TAB.chinese_label}
    >
      <header className="shijing-me-tab-header">
        <h2 id="shijing-me-heading">我的时镜</h2>
        <span
          className={`shijing-me-status-badge shijing-me-status-badge--${badge.tone}`}
          aria-label={`资料状态：${badge.label}`}
        >
          <span className="shijing-me-status-badge__dot" aria-hidden="true" />
          {badge.label}
        </span>
      </header>

      <MeNatalSummary onOpenNatalEditor={() => setNatalEditorOpen(true)} />

      <MePersonsSummary onOpenPersonsManager={() => setPersonsManagerOpen(true)} />

      <MeSettingsHistoryCard
        onOpenSettingsEditor={() => setSettingsEditorOpen(true)}
        onContinueConversation={openConversation}
        onCreateConversation={createConversationAndOpen}
      />

      <p className="shijing-me-privacy-note">
        你的资料仅用于生成个人解读，涉及他人信息时，时镜会优先保护隐私边界。
      </p>

      <MeNatalEditorOverlay
        open={natalEditorOpen}
        onClose={() => setNatalEditorOpen(false)}
      />
      <MeSettingsEditorOverlay
        open={settingsEditorOpen}
        onClose={() => setSettingsEditorOpen(false)}
      />
      <MePersonsManagerOverlay
        open={personsManagerOpen}
        onClose={() => setPersonsManagerOpen(false)}
      />
      <ConversationThreadOverlay
        open={conversationOverlay.open}
        onClose={() => setConversationOverlay({ open: false, conversationId: null })}
        conversationId={conversationOverlay.conversationId}
        onSelectConversation={(id) =>
          setConversationOverlay({ open: true, conversationId: id })
        }
      />
    </section>
  );
}
