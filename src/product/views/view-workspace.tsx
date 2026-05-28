import { useEffect, useMemo, useRef, useState } from 'react';

import type { Conversation } from '../../domain/conversation.ts';
import type { Event } from '../../domain/event.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import type { ContextItem, View } from '../../domain/view.ts';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import { validateView } from '../../contracts/view-validator.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import { generateReadingForStorage } from '../reading/generate-and-store.ts';
import { ReadingEvidenceCard } from '../reading/reading-evidence-card.tsx';
import { TechnicalDetails } from '../components/technical-details.tsx';
import { BODY, BUTTONS, EMPTY_STATES, HEADINGS, STATUS } from '../i18n/copy.ts';
import { enumLabel } from '../i18n/enum-label.ts';
import { formatCreateRefusal, formatDanglingRefusal, formatDeleteValidatorRefusal, formatGenerateReadingFailure, formatSaveRefusal } from '../i18n/format-failure.ts';
import { subjectDisplayName } from '../i18n/subject-display-name.ts';
import { natalReadinessHeadline } from '../subjects/natal-readiness.ts';
import { ConversationThreadOverlay } from '../conversations/conversation-thread.tsx';
import { newConversationId } from '../conversations/conversation-id.ts';
import { EventFormOverlay } from '../events/event-form.tsx';
import { findReferencesToEvent, type EventReference } from '../events/event-dangling-reference.ts';
import { findReferencesToView, type ViewReference } from './view-dangling-reference.ts';
import {
  eventsForView,
  readingsForView,
  viewGenerationReadiness,
  viewGenerationSeverity,
  type ViewGenerationKind,
  type ViewGenerationReadiness,
} from './view-workspace-model.ts';
import { newContextItemId } from './context-item-id.ts';
import { ViewEditorPane, type ViewEditorMode } from './view-editor-pane.tsx';

export interface ViewWorkspaceProps {
  readonly view: View | null;
  readonly editor?: ViewEditorMode | null;
  readonly onCreateView?: () => void;
  readonly onEditView?: (view: View) => void;
  readonly onDeletedView?: (viewId: string) => void;
  readonly onCancelEditor?: () => void;
  readonly onSavedEditor?: (view: View) => void;
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

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${month}/${day}`;
}

function formatHeroTimeScope(view: View): string {
  if (view.time_scope === 'bounded') {
    if (view.bounded_range?.start && view.bounded_range?.end) {
      return `${view.bounded_range.start.slice(0, 10)} – ${view.bounded_range.end.slice(0, 10)}`;
    }
    return enumLabel('time_scope', view.time_scope);
  }
  if (view.time_scope === 'rolling') {
    const days = view.rolling_window_days ?? 7;
    return `最近 ${days} 天`;
  }
  return '长期观察';
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

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
      <circle cx="12" cy="8" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 20c.6-3.4 3.4-5.6 7-5.6s6.4 2.2 7 5.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"
        fill="currentColor"
      />
      <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14z" fill="currentColor" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path
        d="M4 20l1-4 11-11 3 3-11 11-4 1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M14 6l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="9" cy="7" r="2" fill="currentColor" />
      <circle cx="15" cy="12" r="2" fill="currentColor" />
      <circle cx="8" cy="17" r="2" fill="currentColor" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path
        d="M4 5h16v11H8l-4 4V5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="6" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="18" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}

type EventEditorMode = null | { kind: 'create' } | { kind: 'edit'; event: Event };

export function ViewWorkspace(props: ViewWorkspaceProps) {
  const { state, dispatch, runtime_ai_client } = useShijingStore();
  const view = props.view;
  const [contextNote, setContextNote] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversationOverlayOpen, setConversationOverlayOpen] = useState(false);
  const [eventEditor, setEventEditor] = useState<EventEditorMode>(null);
  const [eventDeletionError, setEventDeletionError] = useState<
    | { kind: 'idle' }
    | { kind: 'refused_dangling'; refs: readonly EventReference[] }
    | { kind: 'refused_validator'; code: string }
  >({ kind: 'idle' });
  const [viewDeletionError, setViewDeletionError] = useState<
    | { kind: 'idle' }
    | { kind: 'refused_dangling'; refs: readonly ViewReference[] }
    | { kind: 'refused_validator'; code: string }
  >({ kind: 'idle' });
  const [submission, setSubmission] = useState<
    | { kind: 'idle' }
    | { kind: 'running'; reading_kind: ViewGenerationKind }
    | { kind: 'failed'; headline: string; technical: string }
    | { kind: 'context_failed'; headline: string; technical: string }
    | { kind: 'conversation_failed'; headline: string; technical: string }
    | { kind: 'saved'; reading_id: string; advisory: boolean }
  >({ kind: 'idle' });
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSubmission({ kind: 'idle' });
    setContextNote('');
    setEventEditor(null);
    setEventDeletionError({ kind: 'idle' });
    setViewDeletionError({ kind: 'idle' });
    setMoreMenuOpen(false);
  }, [view?.id]);

  useEffect(() => {
    if (!moreMenuOpen) return;
    function onClickOutside(ev: MouseEvent) {
      if (!menuRef.current) return;
      if (ev.target instanceof Node && menuRef.current.contains(ev.target)) return;
      setMoreMenuOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [moreMenuOpen]);

  function onDeleteEvent(target: Event) {
    const refs = findReferencesToEvent(state.snapshot, target.id);
    if (refs.length > 0) {
      setEventDeletionError({ kind: 'refused_dangling', refs });
      return;
    }
    const nextSnapshot = {
      ...state.snapshot,
      events: state.snapshot.events.filter((existing) => existing.id !== target.id),
    };
    const check = validateShiJingSpace(nextSnapshot);
    if (!check.ok) {
      setEventDeletionError({ kind: 'refused_validator', code: check.error.code });
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: nextSnapshot });
    setEventDeletionError({ kind: 'idle' });
  }

  function onDeleteView() {
    if (!view) return;
    setMoreMenuOpen(false);
    const refs = findReferencesToView(state.snapshot, view.id);
    if (refs.length > 0) {
      setViewDeletionError({ kind: 'refused_dangling', refs });
      return;
    }
    const nextSnapshot = {
      ...state.snapshot,
      views: state.snapshot.views.filter((existing) => existing.id !== view.id),
    };
    const check = validateShiJingSpace(nextSnapshot);
    if (!check.ok) {
      setViewDeletionError({ kind: 'refused_validator', code: check.error.code });
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: nextSnapshot });
    props.onDeletedView?.(view.id);
    setViewDeletionError({ kind: 'idle' });
  }

  const scopedEvents = useMemo(
    () => (view ? eventsForView(state.snapshot.events, view.id) : []),
    [state.snapshot.events, view],
  );
  const scopedReadings = useMemo(
    () => (view ? readingsForView(state.snapshot.readings, view.id) : []),
    [state.snapshot.readings, view],
  );
  const latestReading = scopedReadings[0];
  const generationPreview = view
    ? viewGenerationReadiness(view, state.snapshot, 'period_outlook')
    : null;

  async function onGenerate(kind: ViewGenerationKind) {
    if (!view) return;
    const generatedAt = new Date();
    const strict = viewGenerationReadiness(view, state.snapshot, kind, generatedAt);
    const severity = viewGenerationSeverity(strict);
    if (severity === 'blocker') {
      const formatted = formatGenerationUnavailable(
        strict as Exclude<ViewGenerationReadiness, { ok: true }>,
        state.snapshot,
      );
      setSubmission({ kind: 'failed', headline: formatted.headline, technical: formatted.technical });
      return;
    }
    const readiness = severity === 'warning'
      ? viewGenerationReadiness(view, state.snapshot, kind, generatedAt, { allow_warnings: true })
      : strict;
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
      allow_warnings: severity === 'warning',
    });
    if (!outcome.ok) {
      const formatted = formatGenerateReadingFailure(outcome.error);
      setSubmission({ kind: 'failed', headline: formatted.headline, technical: formatted.technical });
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: outcome.next_space });
    setSubmission({ kind: 'saved', reading_id: outcome.reading.id, advisory: severity === 'warning' });
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
    const item: ContextItem = {
      id: newContextItemId(),
      kind: 'note',
      body,
      created_at: new Date().toISOString(),
    };
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
    // No explicit success banner — the new note appears in "最近记录"
    // immediately, which is the confirmation users actually look for.
    setSubmission({ kind: 'idle' });
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

  if (props.editor) {
    return (
      <section className="shijing-view-workspace shijing-view-workspace--editing" aria-label={HEADINGS.view_workspace}>
        <ViewEditorPane
          mode={props.editor}
          onCancel={() => props.onCancelEditor?.()}
          onSaved={(savedView) => props.onSavedEditor?.(savedView)}
        />
      </section>
    );
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

  // Only hard blockers (invalid time scope, missing/scaffold anchor) gate
  // the button. Warning-level gaps (precision unknown, rough month/year,
  // unspecified sex, default location) are now handled inline by
  // onGenerate via allow_warnings + a post-save advisory — they no longer
  // disable the button or surface a pre-check banner.
  const generationButtonBlocked = generationPreview !== null
    && viewGenerationSeverity(generationPreview) === 'blocker';

  const anchorName = subjectDisplayName(view.anchor_subject, state.snapshot);
  const recordCount = view.context_items.length;
  const heroIntro = view.instructions.trim().length > 0 ? view.instructions : BODY.view_hero_intro_default;
  // Sort context_items reverse-chronologically by their persisted capture time.
  const recentRecords = [...view.context_items]
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aTime = Date.parse(a.item.created_at);
      const bTime = Date.parse(b.item.created_at);
      if (aTime !== bTime) return bTime - aTime;
      return b.index - a.index;
    })
    .map(({ item }) => item)
    .slice(0, 6);
  const isRunning = submission.kind === 'running';
  const summaryParagraphs = latestReading
    ? latestReading.output.summary
        .split(/\n+/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    : [];

  return (
    <section className="shijing-view-workspace" aria-label={HEADINGS.view_workspace}>
      <header className="shijing-view-workspace__hero">
        <div className="shijing-view-workspace__hero-head">
          <p className="shijing-tab__eyebrow">当前关注</p>
          <div className="shijing-view-workspace__more" ref={menuRef}>
            <button
              type="button"
              className="shijing-view-workspace__more-trigger"
              aria-haspopup="menu"
              aria-expanded={moreMenuOpen}
              aria-label={BUTTONS.view_more_actions}
              onClick={() => setMoreMenuOpen((prev) => !prev)}
            >
              <MoreIcon />
            </button>
            {moreMenuOpen ? (
              <div role="menu" className="shijing-view-workspace__menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    props.onEditView?.(view);
                  }}
                >
                  {BUTTONS.edit}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  data-variant="danger"
                  onClick={onDeleteView}
                >
                  {BUTTONS.delete}
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <h2 className="shijing-view-workspace__title">{view.title}</h2>
        <p className="shijing-view-workspace__anchor">
          <PersonIcon />
          <span>{anchorName}</span>
          <span aria-hidden="true">·</span>
          <span>{formatHeroTimeScope(view)}</span>
        </p>
        <p className="shijing-view-workspace__intro">{heroIntro}</p>
        {viewDeletionError.kind === 'refused_dangling' ? (() => {
          const first = viewDeletionError.refs[0]!;
          const formatted = formatDanglingRefusal(viewDeletionError.refs.length, first.via);
          return (
            <>
              <p role="alert">{formatted.headline}</p>
              <TechnicalDetails content={formatted.technical} />
            </>
          );
        })() : null}
        {viewDeletionError.kind === 'refused_validator' ? (() => {
          const formatted = formatDeleteValidatorRefusal(viewDeletionError.code);
          return (
            <>
              <p role="alert">{formatted.headline}</p>
              <TechnicalDetails content={formatted.technical} />
            </>
          );
        })() : null}
      </header>

      <section className="shijing-view-record" aria-label="记录今天">
        <label htmlFor="view-context-note" className="shijing-view-record__prompt">
          {BODY.view_record_prompt}
        </label>
        <textarea
          id="view-context-note"
          className="shijing-view-record__textarea"
          value={contextNote}
          rows={4}
          placeholder={BODY.view_record_placeholder}
          onChange={(event) => setContextNote(event.target.value)}
        />
        <div className="shijing-view-record__actions">
          <button
            type="button"
            className="shijing-view-record__primary"
            onClick={onSaveContextNote}
            disabled={contextNote.trim().length === 0 || isRunning}
          >
            <PencilIcon />
            <span>{BUTTONS.save_record}</span>
          </button>
          {recordCount > 0 ? (
            <button
              type="button"
              className="shijing-view-record__secondary"
              data-variant="secondary"
              onClick={() => void onGenerate('period_outlook')}
              disabled={isRunning || generationButtonBlocked}
            >
              <SlidersIcon />
              <span>
                {isRunning && submission.reading_kind === 'period_outlook'
                  ? BUTTONS.generating
                  : BUTTONS.ask_shijing_summarize}
              </span>
            </button>
          ) : (
            <p className="shijing-view-record__hint" role="note">
              先写下第一条记录，时镜就能帮你总结这条线。
            </p>
          )}
        </div>
        {submission.kind === 'running' ? (
          <p className="shijing-status" role="status">{STATUS.generating}</p>
        ) : null}
        {submission.kind === 'context_failed' ? (
          <>
            <p className="shijing-status shijing-status--alert" role="alert">{submission.headline}</p>
            <TechnicalDetails content={submission.technical} />
          </>
        ) : null}
        {submission.kind === 'failed' ? (
          <>
            <p className="shijing-status shijing-status--alert" role="alert">{submission.headline}</p>
            <TechnicalDetails content={submission.technical} />
          </>
        ) : null}
        {submission.kind === 'saved' ? (
          <>
            <p className="shijing-status shijing-status--success" role="status">{STATUS.saved_view_reading}</p>
            {submission.advisory ? (
              <p className="shijing-status shijing-status--advisory" role="status">
                {BODY.view_natal_warning_after_generate}
              </p>
            ) : null}
          </>
        ) : null}
      </section>

      <section className="shijing-view-summary" aria-label="时镜总结">
        <header className="shijing-view-summary__head">
          <span className="shijing-view-summary__icon" aria-hidden="true"><SparkleIcon /></span>
          <h3>时镜总结</h3>
        </header>
        {latestReading ? (
          <>
            <div className="shijing-view-summary__body">
              {summaryParagraphs.length > 0 ? (
                summaryParagraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)
              ) : (
                <p>{BODY.view_summary_empty}</p>
              )}
            </div>
            {latestReading.output.recommendations.length > 0 ? (
              <div className="shijing-view-summary__steps">
                <h4>{BODY.view_summary_next_steps}</h4>
                <ol>
                  {latestReading.output.recommendations.slice(0, 3).map((rec, index) => (
                    <li key={index}>
                      <span className="shijing-view-summary__step-index" aria-hidden="true">{index + 1}</span>
                      <span>{rec.body}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
            <div className="shijing-view-summary__footer">
              <button
                type="button"
                className="shijing-view-summary__cta"
                onClick={onStartFollowupConversation}
                disabled={isRunning}
              >
                <ChatIcon />
                <span>{BUTTONS.continue_consultation}</span>
              </button>
            </div>
            {submission.kind === 'conversation_failed' ? (
              <>
                <p className="shijing-status shijing-status--alert" role="alert">{submission.headline}</p>
                <TechnicalDetails content={submission.technical} />
              </>
            ) : null}
          </>
        ) : (
          <p className="shijing-view-summary__empty">{BODY.view_summary_empty}</p>
        )}
      </section>

      <section className="shijing-view-records" aria-label={BODY.view_recent_records}>
        <header className="shijing-view-records__head">
          <h3>{BODY.view_recent_records}</h3>
          <small>{recordCount} 条</small>
        </header>
        {recentRecords.length === 0 ? (
          <p className="shijing-view-records__empty">{EMPTY_STATES.view_context_items}</p>
        ) : (
          <ul className="shijing-view-records__list">
            {recentRecords.map((item) => {
              const referencedEvent = item.kind === 'event_ref'
                ? state.snapshot.events.find((event) => event.id === item.body)
                : undefined;
              const dateLabel = formatShortDate(item.created_at);
              return (
                <li key={item.id}>
                  <span className="shijing-view-records__kind">
                    {dateLabel}
                  </span>
                  <span className="shijing-view-records__body">
                    {referencedEvent ? referencedEvent.title : item.body}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 2026-05 cleanup — 「关注详情」 folded panel removed. Metadata
          (subjects / time scope / instructions / memory) already lives
          in the hero or 「编辑 → 更多选项」; 「生成关键窗口」 (key_window)
          was a secondary reading kind users had no mental model for.
          The handler stays in onGenerate, but the UI no longer exposes
          it. */}

      <details className="shijing-view-advanced">
        <summary>
          {BUTTONS.view_open_event_panel}
          <span className="shijing-view-advanced__count">· {scopedEvents.length}</span>
        </summary>
        <div className="shijing-view-advanced__panel">
          <div className="shijing-view-workspace__section-head">
            <h4>{HEADINGS.view_scoped_events}</h4>
            <button type="button" onClick={() => setEventEditor({ kind: 'create' })}>
              {BUTTONS.add_event}
            </button>
          </div>
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
                  <div className="shijing-view-workspace__item-actions">
                    <button type="button" data-variant="secondary" onClick={() => setEventEditor({ kind: 'edit', event })}>{BUTTONS.edit}</button>
                    <button type="button" data-variant="secondary" onClick={() => onDeleteEvent(event)}>{BUTTONS.delete}</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {eventDeletionError.kind === 'refused_dangling' ? (() => {
            const first = eventDeletionError.refs[0]!;
            const formatted = formatDanglingRefusal(eventDeletionError.refs.length, first.via);
            return (
              <>
                <p role="alert">{formatted.headline}</p>
                <TechnicalDetails content={formatted.technical} />
              </>
            );
          })() : null}
          {eventDeletionError.kind === 'refused_validator' ? (() => {
            const formatted = formatDeleteValidatorRefusal(eventDeletionError.code);
            return (
              <>
                <p role="alert">{formatted.headline}</p>
                <TechnicalDetails content={formatted.technical} />
              </>
            );
          })() : null}
        </div>
      </details>

      <details className="shijing-view-advanced">
        <summary>
          {BUTTONS.view_open_history_panel}
          <span className="shijing-view-advanced__count">· {scopedReadings.length}</span>
        </summary>
        <div className="shijing-view-advanced__panel">
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
        </div>
      </details>

      <ConversationThreadOverlay
        open={conversationOverlayOpen}
        onClose={() => setConversationOverlayOpen(false)}
        conversationId={selectedConversationId}
        onSelectConversation={setSelectedConversationId}
      />
      {eventEditor !== null ? (
        <EventFormOverlay
          open
          mode={eventEditor.kind === 'create' ? 'create' : { kind: 'edit', event: eventEditor.event }}
          {...(eventEditor.kind === 'create' ? { initial_view_id: view.id } : {})}
          onClose={() => setEventEditor(null)}
        />
      ) : null}
    </section>
  );
}
