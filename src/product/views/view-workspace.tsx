import { useEffect, useMemo, useState } from 'react';

import type { Conversation } from '../../domain/conversation.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import type { ContextItem, View } from '../../domain/view.ts';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import { validateView } from '../../contracts/view-validator.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import { generateReadingForStorage } from '../reading/generate-and-store.ts';
import { ReadingEvidenceCard } from '../reading/reading-evidence-card.tsx';
import { TechnicalDetails } from '../components/technical-details.tsx';
import { BODY, BUTTONS, EMPTY_STATES, FIELD_LABELS, HEADINGS, STATUS } from '../i18n/copy.ts';
import { enumLabel } from '../i18n/enum-label.ts';
import { formatCreateRefusal, formatGenerateReadingFailure, formatSaveRefusal } from '../i18n/format-failure.ts';
import { subjectDisplayName } from '../i18n/subject-display-name.ts';
import { natalReadinessHeadline } from '../subjects/natal-readiness.ts';
import { ConversationThreadOverlay } from '../conversations/conversation-thread.tsx';
import { newConversationId } from '../conversations/conversation-id.ts';
import {
  eventsForView,
  readingsForView,
  resolveViewTimeWindow,
  viewGenerationReadiness,
  type ViewGenerationKind,
  type ViewGenerationReadiness,
} from './view-workspace-model.ts';
import { newContextItemId } from './context-item-id.ts';

export interface ViewWorkspaceProps {
  readonly view: View | null;
  readonly onCreateView?: () => void;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(iso: string, timeZone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('zh-CN', {
    timeZone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTimeScope(view: View, space: ShiJingSpace): string {
  const resolved = resolveViewTimeWindow(view, space, new Date(), 'period_outlook');
  if (view.time_scope === 'bounded') {
    const zone = resolved.ok ? resolved.time_window.basis_time_zone : 'UTC';
    const start = view.bounded_range?.start ? formatDate(view.bounded_range.start, zone) : '未设置';
    const end = view.bounded_range?.end ? formatDate(view.bounded_range.end, zone) : '未设置';
    return `${enumLabel('time_scope', view.time_scope)} · ${start} - ${end}`;
  }
  if (view.time_scope === 'rolling') {
    const days = view.rolling_window_days ?? '未设置';
    if (!resolved.ok) return `${enumLabel('time_scope', view.time_scope)} · ${days} 个本地日`;
    return `${enumLabel('time_scope', view.time_scope)} · 未来 ${days} 个本地日（${formatDate(resolved.time_window.start_utc!, resolved.time_window.basis_time_zone)} 起）`;
  }
  if (!resolved.ok) return `${enumLabel('time_scope', view.time_scope)} · 默认未来 180 个本地日`;
  return `${enumLabel('time_scope', view.time_scope)} · 默认未来 180 个本地日（${formatDate(resolved.time_window.start_utc!, resolved.time_window.basis_time_zone)} 起）`;
}

function formatGenerationUnavailable(
  readiness: Exclude<ViewGenerationReadiness, { ok: true }>,
  space: ShiJingSpace,
): { headline: string; technical: string } {
  if (readiness.reason === 'subject_readiness_failed') {
    return {
      headline: `${subjectDisplayName(readiness.subject, space)}：${natalReadinessHeadline(readiness.readiness)}`,
      technical: readiness.detail,
    };
  }
  const error = readiness.error;
  if (error.reason === 'anchor_subject_not_ready') {
    return {
      headline: `${subjectDisplayName(error.subject, space)}：${natalReadinessHeadline(error.readiness)}`,
      technical: error.detail,
    };
  }
  if (error.reason === 'bounded_time_scope_invalid') {
    return {
      headline: BODY.view_bounded_generation_unavailable,
      technical: error.detail,
    };
  }
  return {
    headline: BODY.view_rolling_generation_unavailable,
    technical: error.detail,
  };
}

function contextItemTitle(item: ContextItem): string {
  if (item.kind === 'event_ref') return '事件引用';
  if (item.kind === 'document') return '文档';
  return '记录';
}

export function ViewWorkspace(props: ViewWorkspaceProps) {
  const { state, dispatch, runtime_ai_client } = useShijingStore();
  const view = props.view;
  const [contextNote, setContextNote] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversationOverlayOpen, setConversationOverlayOpen] = useState(false);
  const [submission, setSubmission] = useState<
    | { kind: 'idle' }
    | { kind: 'running'; reading_kind: ViewGenerationKind }
    | { kind: 'failed'; headline: string; technical: string }
    | { kind: 'context_failed'; headline: string; technical: string }
    | { kind: 'conversation_failed'; headline: string; technical: string }
    | { kind: 'saved'; reading_id: string }
    | { kind: 'context_saved' }
  >({ kind: 'idle' });

  useEffect(() => {
    setSubmission({ kind: 'idle' });
    setContextNote('');
  }, [view?.id]);

  const scopedEvents = useMemo(
    () => (view ? eventsForView(state.snapshot.events, view.id) : []),
    [state.snapshot.events, view],
  );
  const scopedReadings = useMemo(
    () => (view ? readingsForView(state.snapshot.readings, view.id) : []),
    [state.snapshot.readings, view],
  );
  const generationPreview = view
    ? viewGenerationReadiness(view, state.snapshot, 'period_outlook')
    : null;

  async function onGenerate(kind: ViewGenerationKind) {
    if (!view) return;
    const generatedAt = new Date();
    const readiness = viewGenerationReadiness(view, state.snapshot, kind, generatedAt);
    if (!readiness.ok) {
      const formatted = formatGenerationUnavailable(readiness, state.snapshot);
      setSubmission({ kind: 'failed', headline: formatted.headline, technical: formatted.technical });
      return;
    }
    setSubmission({ kind: 'running', reading_kind: kind });
    const outcome = await generateReadingForStorage({
      id: `reading_${Date.now()}`,
      created_at: generatedAt.toISOString(),
      kind,
      scope: 'view',
      anchor_subject: view.anchor_subject,
      subjects: view.subjects,
      time_window: readiness.time_window,
      space: state.snapshot,
      view,
      runtime_ai_client,
    });
    if (!outcome.ok) {
      const formatted = formatGenerateReadingFailure(outcome.error);
      setSubmission({ kind: 'failed', headline: formatted.headline, technical: formatted.technical });
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: outcome.next_space });
    setSubmission({ kind: 'saved', reading_id: outcome.reading.id });
  }

  function onSaveContextNote() {
    if (!view) return;
    const body = contextNote.trim();
    if (body.length === 0) {
      setSubmission({
        kind: 'context_failed',
        headline: BODY.view_context_note_empty,
        technical: 'view_context_note_empty',
      });
      return;
    }
    const item: ContextItem = { id: newContextItemId(), kind: 'note', body };
    const nextView: View = { ...view, context_items: [...view.context_items, item] };
    const viewCheck = validateView(nextView);
    if (!viewCheck.ok) {
      setSubmission({ kind: 'context_failed', headline: BODY.view_bounded_generation_unavailable, technical: viewCheck.error.code });
      return;
    }
    const nextSnapshot = {
      ...state.snapshot,
      views: state.snapshot.views.map((existing) => (existing.id === view.id ? nextView : existing)),
    };
    const spaceCheck = validateShiJingSpace(nextSnapshot);
    if (!spaceCheck.ok) {
      const formatted = formatSaveRefusal(spaceCheck.error.code);
      setSubmission({ kind: 'context_failed', headline: formatted.headline, technical: formatted.technical });
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: nextSnapshot });
    setContextNote('');
    setSubmission({ kind: 'context_saved' });
  }

  function onStartFollowupConversation() {
    if (!view || scopedReadings.length === 0) return;
    const reading = scopedReadings[0]!;
    const conversation: Conversation = {
      id: newConversationId(),
      created_at: new Date().toISOString(),
      subject_anchor: reading.anchor_subject,
      source_reading_id: reading.id,
      view_id: view.id,
      turns: [],
    };
    const nextSnapshot = {
      ...state.snapshot,
      conversations: [...state.snapshot.conversations, conversation],
    };
    const check = validateShiJingSpace(nextSnapshot);
    if (!check.ok) {
      const formatted = formatCreateRefusal(check.error.code);
      setSubmission({ kind: 'conversation_failed', headline: formatted.headline, technical: formatted.technical });
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: nextSnapshot });
    setSelectedConversationId(conversation.id);
    setConversationOverlayOpen(true);
  }

  if (!view) {
    return (
      <section className="shijing-view-workspace" aria-label={HEADINGS.view_workspace}>
        <div className="shijing-view-workspace__empty-state">
          <div>
            <h3>{HEADINGS.view_workspace}</h3>
            <p>{EMPTY_STATES.view_workspace_select}</p>
          </div>
          <button type="button" onClick={props.onCreateView}>{BUTTONS.add_view}</button>
        </div>
      </section>
    );
  }

  const generationBlocked = generationPreview !== null && !generationPreview.ok;
  const generationBlockedMessage = generationBlocked
    ? formatGenerationUnavailable(generationPreview, state.snapshot)
    : null;

  return (
    <section className="shijing-view-workspace" aria-label={HEADINGS.view_workspace}>
      <header className="shijing-view-workspace__header">
        <div>
          <p className="shijing-tab__eyebrow">{HEADINGS.view_workspace}</p>
          <h3>{view.title}</h3>
          <div className="shijing-reading-card__chips" aria-label="视角状态">
            <span className="shijing-chip">{enumLabel('time_scope', view.time_scope)}</span>
            <span className="shijing-chip">{enumLabel('display_state', view.display_state)}</span>
            <span className="shijing-chip">锚点：{subjectDisplayName(view.anchor_subject, state.snapshot)}</span>
          </div>
        </div>
      </header>

      <dl className="shijing-view-workspace__meta" aria-label="视角定义">
        <div>
          <dt>{HEADINGS.view_subjects}</dt>
          <dd>{view.subjects.map((subject) => subjectDisplayName(subject, state.snapshot)).join('、')}</dd>
        </div>
        <div>
          <dt>{HEADINGS.view_time_scope}</dt>
          <dd>{formatTimeScope(view, state.snapshot)}</dd>
        </div>
        <div>
          <dt>{HEADINGS.view_instructions}</dt>
          <dd>{view.instructions.trim().length > 0 ? view.instructions : EMPTY_STATES.view_instructions}</dd>
        </div>
        <div>
          <dt>{HEADINGS.view_memory}</dt>
          <dd>
            {view.view_memory.summary.trim().length > 0 ? view.view_memory.summary : EMPTY_STATES.view_memory}
            {' · '}
            {view.view_memory.locked ? '已锁定' : '可更新'}
          </dd>
        </div>
      </dl>

      <section className="shijing-view-workspace__section" aria-label={HEADINGS.view_primary_actions}>
        <div>
          <h4>{HEADINGS.view_primary_actions}</h4>
          <p>{BODY.view_generation_intro}</p>
        </div>
        <div className="shijing-card__action">
          <button
            type="button"
            onClick={() => void onGenerate('period_outlook')}
            disabled={submission.kind === 'running' || generationBlocked}
          >
            {submission.kind === 'running' && submission.reading_kind === 'period_outlook'
              ? BUTTONS.generating
              : BUTTONS.generate_view_period}
          </button>
          <button
            type="button"
            data-variant="secondary"
            onClick={() => void onGenerate('key_window')}
            disabled={submission.kind === 'running' || generationBlocked}
          >
            {submission.kind === 'running' && submission.reading_kind === 'key_window'
              ? BUTTONS.generating
              : BUTTONS.generate_view_key_window}
          </button>
          <button
            type="button"
            data-variant="secondary"
            onClick={onStartFollowupConversation}
            disabled={submission.kind === 'running' || scopedReadings.length === 0}
          >
            {BUTTONS.start_followup_conversation}
          </button>
        </div>
        {generationBlockedMessage ? (
          <>
            <p className="shijing-status shijing-status--alert" role="status">{generationBlockedMessage.headline}</p>
            <TechnicalDetails content={generationBlockedMessage.technical} />
          </>
        ) : null}
        {submission.kind === 'running' ? (
          <p className="shijing-status" role="status">{STATUS.generating}</p>
        ) : null}
        {submission.kind === 'failed' ? (
          <>
            <p className="shijing-status shijing-status--alert" role="alert">{submission.headline}</p>
            <TechnicalDetails content={submission.technical} />
          </>
        ) : null}
        {submission.kind === 'conversation_failed' ? (
          <>
            <p className="shijing-status shijing-status--alert" role="alert">{submission.headline}</p>
            <TechnicalDetails content={submission.technical} />
          </>
        ) : null}
        {submission.kind === 'saved' ? (
          <p className="shijing-status shijing-status--success" role="status">{STATUS.saved_view_reading}</p>
        ) : null}
      </section>

      <section className="shijing-view-workspace__section" aria-label={HEADINGS.view_context_items}>
        <h4>{HEADINGS.view_context_items}</h4>
        <div className="shijing-view-workspace__note">
          <label htmlFor="view-context-note">{FIELD_LABELS.context_note}</label>
          <textarea
            id="view-context-note"
            value={contextNote}
            rows={3}
            onChange={(event) => setContextNote(event.target.value)}
          />
          <button type="button" onClick={onSaveContextNote}>{BUTTONS.save_context_note}</button>
        </div>
        {submission.kind === 'context_failed' ? (
          <>
            <p className="shijing-status shijing-status--alert" role="alert">{submission.headline}</p>
            <TechnicalDetails content={submission.technical} />
          </>
        ) : null}
        {submission.kind === 'context_saved' ? (
          <p className="shijing-status shijing-status--success" role="status">{STATUS.saved_generic}</p>
        ) : null}
        {view.context_items.length === 0 ? (
          <p className="shijing-view-workspace__empty">{EMPTY_STATES.view_context_items}</p>
        ) : (
          <ul className="shijing-view-workspace__list">
            {view.context_items.map((item) => {
              const referencedEvent = item.kind === 'event_ref'
                ? state.snapshot.events.find((event) => event.id === item.body)
                : undefined;
              return (
                <li key={item.id}>
                  <strong>{contextItemTitle(item)}</strong>
                  <span>{referencedEvent ? referencedEvent.title : item.body}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="shijing-view-workspace__section" aria-label={HEADINGS.view_scoped_events}>
        <h4>{HEADINGS.view_scoped_events}</h4>
        {scopedEvents.length === 0 ? (
          <p className="shijing-view-workspace__empty">{EMPTY_STATES.view_events}</p>
        ) : (
          <ul className="shijing-view-workspace__list">
            {scopedEvents.map((event) => (
              <li key={event.id}>
                <strong>{event.title}</strong>
                <span>
                  {formatTimestamp(event.occurred_at)}
                  {' · '}
                  {subjectDisplayName(event.primary_subject, state.snapshot)}
                  {event.recap ? ` · ${event.recap}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="shijing-view-workspace__section" aria-label={HEADINGS.view_scoped_readings}>
        <h4>{HEADINGS.view_scoped_readings}</h4>
        {scopedReadings.length === 0 ? (
          <p className="shijing-view-workspace__empty">{EMPTY_STATES.view_readings}</p>
        ) : (
          <div className="shijing-view-workspace__readings">
            {scopedReadings.map((reading) => (
              <ReadingEvidenceCard
                key={reading.id}
                reading={reading}
                space={state.snapshot}
                heading={`${HEADINGS.view_scoped_reading}: ${enumLabel('reading_kind', reading.kind)}`}
              />
            ))}
          </div>
        )}
      </section>
      <ConversationThreadOverlay
        open={conversationOverlayOpen}
        onClose={() => setConversationOverlayOpen(false)}
        conversationId={selectedConversationId}
        onSelectConversation={setSelectedConversationId}
      />
    </section>
  );
}
