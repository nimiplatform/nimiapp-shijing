// SJG-DATA-08 — Conversation left-rail list. Renders the conversation
// cards (id, anchor, last-turn time, message count) plus "新建会话" and
// "打开会话" affordances. New conversations are anchored to the current
// observation target and validateShiJingSpace gates every snapshot/replace.

import { useState } from 'react';

import { useShijingStore } from '../state/shijing-store.tsx';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import type { Conversation } from '../../domain/conversation.ts';
import { newConversationId } from './conversation-id.ts';
import { BUTTONS, EMPTY_STATES, HEADINGS } from '../i18n/copy.ts';
import { formatCreateRefusal } from '../i18n/format-failure.ts';
import { TechnicalDetails } from '../components/technical-details.tsx';

export interface ConversationListProps {
  readonly selectedConversationId: string | null;
  readonly onSelectConversation: (id: string) => void;
  readonly onOpenThread: (id: string) => void;
}

function lastTurnTime(conversation: Conversation): string {
  if (conversation.turns.length === 0) return conversation.created_at;
  return conversation.turns[conversation.turns.length - 1]!.created_at;
}

function shortenConversationId(id: string): string {
  if (id.length <= 8) return id;
  return id.slice(-8);
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

export function ConversationList(props: ConversationListProps) {
  const { state, dispatch } = useShijingStore();
  const [createError, setCreateError] = useState<
    | { kind: 'idle' }
    | { kind: 'refused_validator'; code: string }
  >({ kind: 'idle' });

  function onCreate() {
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
      setCreateError({ kind: 'refused_validator', code: check.error.code });
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: nextSnapshot });
    setCreateError({ kind: 'idle' });
    props.onSelectConversation(conversation.id);
  }

  return (
    <section className="shijing-conversation-list" aria-label="会话列表">
      <header>
        <h3>{HEADINGS.conversations}</h3>
        <button type="button" onClick={onCreate}>{BUTTONS.new_conversation}</button>
      </header>
      <p>普通新建会话用于记录补充语境；需要先生成一份解读，才能围绕它追问。</p>
      {state.snapshot.conversations.length === 0 ? (
        <p>{EMPTY_STATES.conversations}</p>
      ) : (
        <ul>
          {state.snapshot.conversations.map((conversation) => {
            const isSelected = conversation.id === props.selectedConversationId;
            return (
              <li key={conversation.id} className={isSelected ? 'shijing-conversation-card--selected' : undefined}>
                <button
                  type="button"
                  onClick={() => props.onSelectConversation(conversation.id)}
                >
                  <span>会话 #{shortenConversationId(conversation.id)}</span>
                  <small>{conversation.source_reading_id ? ` 来源解读 ${conversation.source_reading_id}` : ' 补充语境记录'}</small>
                  <small> （{conversation.turns.length} 条消息 · 最后更新于 {formatTimestamp(lastTurnTime(conversation))}）</small>
                </button>
                <button type="button" onClick={() => props.onOpenThread(conversation.id)}>
                  {BUTTONS.open_conversation}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {createError.kind === 'refused_validator' ? (() => {
        const formatted = formatCreateRefusal(createError.code);
        return (
          <>
            <p role="alert">{formatted.headline}</p>
            <TechnicalDetails content={formatted.technical} />
          </>
        );
      })() : null}
    </section>
  );
}
