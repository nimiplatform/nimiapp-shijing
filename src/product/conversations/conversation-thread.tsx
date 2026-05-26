// SJG-DATA-08 — Conversation thread surface. Left rail lists
// conversations; right pane shows the selected conversation's turns
// plus a composer. AI turns are allowed only for conversations bound
// to a saved source Reading; unbound conversations persist user
// context but do not call Runtime AI.

import { useMemo, useState, type FormEvent } from 'react';
import { OverlayShell } from '@nimiplatform/kit/ui';

import { useShijingStore } from '../state/shijing-store.tsx';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import type { Conversation, ConversationTurn } from '../../domain/conversation.ts';
import type { Reading } from '../../domain/reading.ts';
import { newConversationTurnId } from './conversation-id.ts';
import { ConversationList } from './conversation-list.tsx';
import { BUTTONS, EMPTY_STATES, HEADINGS, STATUS } from '../i18n/copy.ts';
import { enumLabel } from '../i18n/enum-label.ts';
import { subjectDisplayName } from '../i18n/subject-display-name.ts';
import { formatChatFailure, formatValidatorRefusal } from '../i18n/format-failure.ts';
import { TechnicalDetails } from '../components/technical-details.tsx';
import type { ConversationSourceReadingContext } from './conversation-chat-bridge.ts';

const SHIJING_CONVERSATION_MODEL_ID = 'auto';

export interface ConversationThreadProps {
  readonly selectedConversationId: string | null;
  readonly onSelectConversation: (id: string) => void;
}

type SendStatus =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'source_required' }
  | { kind: 'refused_validator'; code: string }
  | { kind: 'generator_failed'; code: string; detail: string };

function shortenConversationId(id: string): string {
  if (id.length <= 8) return id;
  return id.slice(-8);
}

export function buildConversationSourceReadingContext(reading: Reading): ConversationSourceReadingContext {
  return {
    id: reading.id,
    kind: reading.kind,
    scope: reading.scope,
    anchor_subject: reading.anchor_subject,
    time_window: reading.time_window,
    output: {
      summary: reading.output.summary,
      highlights: reading.output.highlights,
      recommendations: reading.output.recommendations,
    },
    inputs_summary: {
      input_hash: reading.inputs_summary.input_hash,
      feature_snapshot_hash: reading.inputs_summary.feature_snapshot_hash,
      method_profile: reading.inputs_summary.method_profile,
      stage_label: reading.inputs_summary.feature_snapshot.stage_label,
      uncertainty_inputs: reading.inputs_summary.feature_snapshot.uncertainty_inputs,
    },
    uncertainty: reading.uncertainty,
  };
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
  const sourceReading = useMemo<Reading | null>(() => {
    if (!selected?.source_reading_id) return null;
    return state.snapshot.readings.find((reading) => reading.id === selected.source_reading_id) ?? null;
  }, [selected?.source_reading_id, state.snapshot.readings]);

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

    if (!sourceReading) {
      setStatus({ kind: 'source_required' });
      return;
    }
    const result = await conversation_chat_bridge.send({
      user_message: trimmed,
      model_id: SHIJING_CONVERSATION_MODEL_ID,
      source_reading: buildConversationSourceReadingContext(sourceReading),
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
          <section className="shijing-conversation-source" aria-label="来源解读">
            {sourceReading ? (
              <>
                <strong>来源解读：{sourceReading.id}</strong>
                <span>
                  {enumLabel('reading_kind', sourceReading.kind)} · {formatTimestamp(sourceReading.created_at)} · 锚点：
                  {subjectDisplayName(sourceReading.anchor_subject, state.snapshot)}
                </span>
                <p>{sourceReading.output.summary}</p>
              </>
            ) : (
              <>
                <strong>补充语境记录</strong>
                <p>需要先生成一份解读，再围绕它追问。此会话会保存你的补充语境，但不会调用 AI 产生回复。</p>
              </>
            )}
          </section>
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
          {status.kind === 'source_required' ? (
            <p role="status">需要先生成一份解读，再围绕它追问。已保存你的补充语境。</p>
          ) : null}
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
