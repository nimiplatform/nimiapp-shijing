// SJG-DATA-08 — Conversation left-rail list. Renders the conversation
// cards (id, anchor, last-turn time, message count) plus "新建会话" and
// "打开会话" affordances. New conversations are anchored to `self` and
// validateShiJingSpace gates every snapshot/replace.

import { useState } from 'react';

import { useShijingStore } from '../state/shijing-store.tsx';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import type { Conversation } from '../../domain/conversation.ts';
import { newConversationId } from './conversation-id.ts';

export interface ConversationListProps {
  readonly selectedConversationId: string | null;
  readonly onSelectConversation: (id: string) => void;
  readonly onOpenThread: (id: string) => void;
}

function lastTurnTime(conversation: Conversation): string {
  if (conversation.turns.length === 0) return conversation.created_at;
  return conversation.turns[conversation.turns.length - 1]!.created_at;
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
      subject_anchor: 'self',
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
    <section className="shijing-conversation-list" aria-label="ShiJing conversations">
      <header>
        <h3>会话 Conversations</h3>
        <button type="button" onClick={onCreate}>新建会话</button>
      </header>
      {state.snapshot.conversations.length === 0 ? (
        <p>No conversations yet.</p>
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
                  <span>conversation:{conversation.id}</span>
                  <small> ({conversation.turns.length} turns, last {lastTurnTime(conversation)})</small>
                </button>
                <button type="button" onClick={() => props.onOpenThread(conversation.id)}>
                  打开会话
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {createError.kind === 'refused_validator' ? (
        <p role="alert">Create refused by space validator: {createError.code}</p>
      ) : null}
    </section>
  );
}
