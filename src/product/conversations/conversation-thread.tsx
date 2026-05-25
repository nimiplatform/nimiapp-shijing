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
import { BUTTONS, EMPTY_STATES, HEADINGS, STATUS } from '../i18n/copy.ts';
import { enumLabel } from '../i18n/enum-label.ts';
import { subjectDisplayName } from '../i18n/subject-display-name.ts';
import { formatChatFailure, formatValidatorRefusal } from '../i18n/format-failure.ts';
import { TechnicalDetails } from '../components/technical-details.tsx';

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
    <section className="shijing-conversation-thread" aria-label="会话内容">
      {selected === null ? (
        <p>{EMPTY_STATES.conversation_select}</p>
      ) : (
        <>
          <header>
            <h4>会话 #{shortenConversationId(selected.id)}</h4>
            <small>围绕：{subjectDisplayName(selected.subject_anchor, state.snapshot)}</small>
          </header>
          <ol className="shijing-conversation-turns">
            {selected.turns.length === 0 ? (
              <li>{EMPTY_STATES.conversation_turns}</li>
            ) : (
              selected.turns.map((turn) => (
                <li key={turn.id} className={`shijing-conversation-turn shijing-conversation-turn--${turn.role}`}>
                  <span>{enumLabel('conversation_role', turn.role)}：</span>
                  <span>{turn.body}</span>
                  <small> {formatTimestamp(turn.created_at)}</small>
                </li>
              ))
            )}
          </ol>
          <form className="shijing-conversation-composer" onSubmit={onSend} noValidate>
            <textarea
              aria-label="消息内容"
              value={composer}
              onChange={(event) => setComposer(event.target.value)}
              disabled={status.kind === 'sending'}
            />
            <button type="submit" disabled={status.kind === 'sending' || composer.trim().length === 0}>
              {BUTTONS.send}
            </button>
          </form>
          {status.kind === 'sending' ? <p role="status">{STATUS.sending}</p> : null}
          {status.kind === 'refused_validator' ? (() => {
            const formatted = formatValidatorRefusal(status.code);
            return (
              <>
                <p role="alert">{formatted.headline}</p>
                <TechnicalDetails content={formatted.technical} />
              </>
            );
          })() : null}
          {status.kind === 'generator_failed' ? (() => {
            const formatted = formatChatFailure(status.code, status.detail);
            return (
              <>
                <p role="alert">{formatted.headline}</p>
                <TechnicalDetails content={formatted.technical} />
              </>
            );
          })() : null}
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
      title={HEADINGS.conversation_dialog}
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
