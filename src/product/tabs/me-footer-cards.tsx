// Combined "设置与记录" list card. Replaces the previous pair of
// stand-alone "回应偏好" + "最近对话" cards — they were two narrow
// cards in a 50/50 grid that fragmented the page chrome without
// carrying enough density to justify the split. They now live as
// two list rows in one card, which reads as a single "settings &
// records" surface in the style of mature AI app profile pages.
//
// Each row is purely declarative: label on the left, value in the
// middle, right-aligned action link. No icons per row; the card-
// level icon at the top header is enough to anchor the section.

import { useMemo } from 'react';
import { Surface } from '@nimiplatform/kit/ui';

import { useShijingStore } from '../state/shijing-store.tsx';
import type { Conversation } from '../../domain/conversation.ts';
import { enumLabel } from '../i18n/enum-label.ts';
import { MeIcon } from './me-icons.tsx';

export interface MeSettingsHistoryCardProps {
  readonly onOpenSettingsEditor: () => void;
  readonly onContinueConversation: (id: string) => void;
  readonly onCreateConversation: () => void;
}

function lastUpdatedAt(conversation: Conversation): string {
  if (conversation.turns.length === 0) return conversation.created_at;
  return conversation.turns[conversation.turns.length - 1]!.created_at;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function conversationKindLabel(conversation: Conversation): string {
  if (conversation.source_reading_id) return '解读追问';
  if (conversation.view_id) return '关注追问';
  return '补充语境记录';
}

export function MeSettingsHistoryCard(props: MeSettingsHistoryCardProps) {
  const { state } = useShijingStore();
  const prefs = state.snapshot.settings.response_preferences;
  const prefsSummary = [
    enumLabel('response_tone', prefs.tone),
    enumLabel('response_length', prefs.length),
    prefs.language,
  ].join(' · ');

  const latest = useMemo<Conversation | null>(() => {
    if (state.snapshot.conversations.length === 0) return null;
    return [...state.snapshot.conversations].sort((a, b) => {
      return lastUpdatedAt(b).localeCompare(lastUpdatedAt(a));
    })[0]!;
  }, [state.snapshot.conversations]);

  return (
    <Surface
      as="section"
      tone="card"
      material="solid"
      padding="none"
      elevation="base"
      className="shijing-me-card shijing-me-card--list"
      aria-label="设置与记录"
    >
      <header className="shijing-me-card__head">
        <span className="shijing-me-card__icon" aria-hidden="true">
          <MeIcon name="sliders" size={20} />
        </span>
        <h3 className="shijing-me-card__title">设置与记录</h3>
      </header>

      <ul className="shijing-me-list">
        <li className="shijing-me-list__row">
          <span className="shijing-me-list__label">回应偏好</span>
          <span className="shijing-me-list__value">{prefsSummary}</span>
          <button
            type="button"
            className="shijing-me-list__action"
            onClick={props.onOpenSettingsEditor}
          >
            <span>调整</span>
            <MeIcon name="chevron-right" size={14} />
          </button>
        </li>
        <li className="shijing-me-list__row">
          <span className="shijing-me-list__label">最近对话</span>
          <span className="shijing-me-list__value">
            {latest
              ? `${conversationKindLabel(latest)} · ${formatTimestamp(lastUpdatedAt(latest))}`
              : '还没有会话'}
          </span>
          {latest ? (
            <button
              type="button"
              className="shijing-me-list__action"
              onClick={() => props.onContinueConversation(latest.id)}
            >
              <span>继续</span>
              <MeIcon name="chevron-right" size={14} />
            </button>
          ) : (
            <button
              type="button"
              className="shijing-me-list__action"
              onClick={props.onCreateConversation}
            >
              <span>新建</span>
              <MeIcon name="chevron-right" size={14} />
            </button>
          )}
        </li>
      </ul>
    </Surface>
  );
}
