// SJG-DATA-08 — Conversation thread surface. Left rail lists
// conversations; right pane shows the selected conversation's turns
// plus a composer. Sending a user turn also fires a direct chat call
// (NOT the astrology pipeline) via the conversation_chat_bridge and
// appends the assistant turn as role 'ai' (per SJG-DATA-08
// ConversationRole). All snapshots gated by validateShiJingSpace.

import { useMemo, useState, type FormEvent } from 'react';
import { OverlayShell } from '@nimiplatform/kit/ui';

import { useShijingStore } from '../state/shijing-store.tsx';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import type { Conversation, ConversationTurn } from '../../domain/conversation.ts';
import { newConversationTurnId } from './conversation-id.ts';
import { ConversationList } from './conversation-list.tsx';

const SHIJING_CONVERSATION_MODEL_ID = 'auto';

export interface ConversationThreadProps {
  readonly selectedConversationId: string | null;
  readonly onSelectConversation: (id: string) => void;
}

type SendStatus =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'refused_validator'; code: string }
  | { kind: 'generator_failed'; code: string; detail: string };

export function ConversationThread(props: ConversationThreadProps) {
  const { state, dispatch, conversation_chat_bridge } = useShijingStore();
  const [composer, setComposer] = useState('');
  const [status, setStatus] = useState<SendStatus>({ kind: 'idle' });

  const selected = useMemo<Conversation | null>(() => {
    if (!props.selectedConversationId) return null;
    return state.snapshot.conversations.find(
      (conversation) => conversation.id === props.selectedConversationId,
    ) ?? null;
  }, [props.selectedConversationId, state.snapshot.conversations]);

  async function onSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const trimmed = composer.trim();
    if (trimmed.length === 0) return;
    setStatus({ kind: 'sending' });
    const userTurn: ConversationTurn = {
      id: newConversationTurnId(),
      role: 'user',
      body: trimmed,
      created_at: new Date().toISOString(),
    };
    const conversationWithUser: Conversation = {
      ...selected,
      turns: [...selected.turns, userTurn],
    };
    const snapshotWithUser = {
      ...state.snapshot,
      conversations: state.snapshot.conversations.map((existing) =>
        existing.id === selected.id ? conversationWithUser : existing,
      ),
    };
    const userCheck = validateShiJingSpace(snapshotWithUser);
    if (!userCheck.ok) {
      setStatus({ kind: 'refused_validator', code: userCheck.error.code });
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: snapshotWithUser });
    setComposer('');

    const result = await conversation_chat_bridge.send({
      user_message: trimmed,
      model_id: SHIJING_CONVERSATION_MODEL_ID,
    });
    if (!result.ok) {
      setStatus({ kind: 'generator_failed', code: result.error.kind, detail: result.error.detail });
      return;
    }
    const assistantTurn: ConversationTurn = {
      id: newConversationTurnId(),
      role: 'ai',
      body: result.text,
      created_at: new Date().toISOString(),
    };
    const conversationWithAi: Conversation = {
      ...conversationWithUser,
      turns: [...conversationWithUser.turns, assistantTurn],
    };
    const snapshotWithAi = {
      ...snapshotWithUser,
      conversations: snapshotWithUser.conversations.map((existing) =>
        existing.id === selected.id ? conversationWithAi : existing,
      ),
    };
    const aiCheck = validateShiJingSpace(snapshotWithAi);
    if (!aiCheck.ok) {
      setStatus({ kind: 'refused_validator', code: aiCheck.error.code });
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: snapshotWithAi });
    setStatus({ kind: 'idle' });
  }

  return (
    <section className="shijing-conversation-thread" aria-label="ShiJing conversation thread">
      {selected === null ? (
        <p>选择一个会话以开始对话。</p>
      ) : (
        <>
          <header>
            <h4>conversation:{selected.id}</h4>
            <small>anchor: {selected.subject_anchor === 'self' ? 'self' : `person:${selected.subject_anchor.id}`}</small>
          </header>
          <ol className="shijing-conversation-turns">
            {selected.turns.length === 0 ? (
              <li>No turns yet.</li>
            ) : (
              selected.turns.map((turn) => (
                <li key={turn.id} className={`shijing-conversation-turn shijing-conversation-turn--${turn.role}`}>
                  <span>{turn.role}:</span>
                  <span>{turn.body}</span>
                  <small> {turn.created_at}</small>
                </li>
              ))
            )}
          </ol>
          <form className="shijing-conversation-composer" onSubmit={onSend} noValidate>
            <textarea
              aria-label="user message"
              value={composer}
              onChange={(event) => setComposer(event.target.value)}
              disabled={status.kind === 'sending'}
            />
            <button type="submit" disabled={status.kind === 'sending' || composer.trim().length === 0}>
              发送
            </button>
          </form>
          {status.kind === 'sending' ? <p role="status">发送中…</p> : null}
          {status.kind === 'refused_validator' ? (
            <p role="alert">Snapshot rejected by space validator: {status.code}</p>
          ) : null}
          {status.kind === 'generator_failed' ? (
            <p role="alert">
              Runtime chat generator failed: {status.code} — {status.detail}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

export interface ConversationThreadOverlayProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly conversationId: string | null;
  readonly onSelectConversation: (id: string) => void;
}

export function ConversationThreadOverlay(props: ConversationThreadOverlayProps) {
  return (
    <OverlayShell
      open={props.open}
      kind="dialog"
      size="L"
      onClose={props.onClose}
      title="会话 Conversation"
      sidebar={
        <ConversationList
          selectedConversationId={props.conversationId}
          onSelectConversation={props.onSelectConversation}
          onOpenThread={props.onSelectConversation}
        />
      }
    >
      <ConversationThread
        selectedConversationId={props.conversationId}
        onSelectConversation={props.onSelectConversation}
      />
    </OverlayShell>
  );
}
