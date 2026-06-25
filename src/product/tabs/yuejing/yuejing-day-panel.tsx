import { useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmDialog, Tooltip } from '@nimiplatform/kit/ui';
import type { YueJingCell } from '../../../domain/mirror-output.ts';
import type { ConcernTag } from '../../../domain/concern-tag.ts';
import type { EventMemory } from '../../../domain/event-memory.ts';
import type { PlanItem } from '../../../domain/plan-item.ts';
import { TENDENCY_CLASS_LABELS } from '../../i18n/copy.ts';
import { newEventMemoryId, newPlanItemId } from '../../ids/index.ts';
import { useShijingStore } from '../../state/shijing-store.tsx';
import { trimmedConcernLabel as yuejingTagLabel } from '../../concern-tags/concern-presets.ts';
import { AskIcon, ClipboardIcon, CloseIcon, PencilIcon, TrashIcon } from './yuejing-icons.tsx';
import { classifyDay, deriveYueJingCalendarDetails, nowIso, shortMonthDay, WEEKDAY_SHORT, weekdayIndexMondayFirst, yuejingCellDetail } from './yuejing-model.ts';
import { concernIconStyle, ConcernIcon } from './yuejing-calendar.tsx';
import { YUEJING_COPY } from './yuejing-copy.ts';

export function YueJingDayPanel(props: {
  readonly date: string;
  readonly today: string;
  readonly entries: readonly YueJingCell[];
  readonly activeTags: readonly ConcernTag[];
  readonly filterTagId: string | null;
  readonly onClose: () => void;
}) {
  const { state, dispatch } = useShijingStore();
  const [draft, setDraft] = useState('');
  // In-place editing state for the 已记录 list. `editingId` is the id
  // of the EventMemory / PlanItem currently being edited; `editDraft`
  // holds the textarea value. Both reset when the user navigates to a
  // different date.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState<{
    readonly id: string;
    readonly body: string;
  } | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const kind = classifyDay(props.date, props.today);
  const isPlan = kind === 'future';
  const weekday = WEEKDAY_SHORT[weekdayIndexMondayFirst(props.date)];
  const calendarDetails = deriveYueJingCalendarDetails(props.date);

  // Reset the draft + edit state whenever the user navigates to a
  // different date so leftover edits from the previous day don't
  // bleed into the new one.
  useEffect(() => {
    setDraft('');
    setEditingId(null);
    setEditDraft('');
  }, [props.date]);

  // Esc closes the panel.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') props.onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [props]);

  // Lookup map id → tag so per-concern rows can show the user's label
  // (e.g. `感情`) instead of the raw `concern_tag_ref` id.
  const tagById = useMemo(() => {
    const m = new Map<string, ConcernTag>();
    for (const t of props.activeTags) m.set(t.id, t);
    return m;
  }, [props.activeTags]);

  const memoriesForDate = useMemo(
    () => state.snapshot.event_memories.filter(
      (m) => m.occurred_at.slice(0, 10) === props.date,
    ),
    [state.snapshot.event_memories, props.date],
  );
  const plansForDate = useMemo(
    () => state.snapshot.plan_items.filter(
      (p) => p.planned_for.slice(0, 10) === props.date,
    ),
    [state.snapshot.plan_items, props.date],
  );

  function saveEntry() {
    const body = draft.trim();
    if (body.length === 0) return;
    const ts = nowIso();
    const concernRefs = props.entries.length > 0
      ? props.entries.map((c) => c.concern_tag_ref)
      : props.filterTagId ? [props.filterTagId] : [];
    if (isPlan) {
      const plan: PlanItem = {
        id: newPlanItemId(),
        planned_for: `${props.date}T00:00:00Z`,
        body,
        person_refs: [],
        concern_tag_refs: concernRefs,
        source: 'yuejing',
        created_at: ts,
        updated_at: ts,
      };
      dispatch({
        type: 'snapshot/replace',
        snapshot: {
          ...state.snapshot,
          plan_items: [...state.snapshot.plan_items, plan],
        },
      });
    } else {
      const memory: EventMemory = {
        id: newEventMemoryId(),
        occurred_at: `${props.date}T00:00:00Z`,
        body,
        person_refs: [],
        concern_tag_refs: concernRefs,
        source: 'yuejing',
        admissible_use: 'eligible_for_retrieval',
        created_at: ts,
        updated_at: ts,
      };
      dispatch({
        type: 'snapshot/replace',
        snapshot: {
          ...state.snapshot,
          event_memories: [...state.snapshot.event_memories, memory],
        },
      });
    }
    setDraft('');
  }

  function startEdit(id: string, body: string) {
    setEditingId(id);
    setEditDraft(body);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft('');
  }

  function commitEdit() {
    if (!editingId) return;
    const body = editDraft.trim();
    if (body.length === 0) return;
    const ts = nowIso();
    if (isPlan) {
      dispatch({
        type: 'snapshot/replace',
        snapshot: {
          ...state.snapshot,
          plan_items: state.snapshot.plan_items.map((p) =>
            p.id === editingId ? { ...p, body, updated_at: ts } : p,
          ),
        },
      });
    } else {
      dispatch({
        type: 'snapshot/replace',
        snapshot: {
          ...state.snapshot,
          event_memories: state.snapshot.event_memories.map((m) =>
            m.id === editingId ? { ...m, body, updated_at: ts } : m,
          ),
        },
      });
    }
    cancelEdit();
  }

  // These records feed back into RiJing / NianJing / ShiJing consultation
  // retrieval (`admissible_use: 'eligible_for_retrieval'`), so a destructive
  // delete needs a deliberate confirmation step (ConfirmDialog below).
  function confirmDelete() {
    const record = confirmingDelete;
    if (!record) return;
    const id = record.id;
    if (isPlan) {
      dispatch({
        type: 'snapshot/replace',
        snapshot: {
          ...state.snapshot,
          plan_items: state.snapshot.plan_items.filter((p) => p.id !== id),
        },
      });
    } else {
      dispatch({
        type: 'snapshot/replace',
        snapshot: {
          ...state.snapshot,
          event_memories: state.snapshot.event_memories.filter((m) => m.id !== id),
        },
      });
    }
    if (editingId === id) cancelEdit();
    setConfirmingDelete(null);
  }

  // Seed this record into the ShiJing consultation and jump there. The
  // ShiJing tab reads the matching seed bus to ground the next question
  // on this specific record — past events seed `cited_event_memory_refs`,
  // future plans seed `cited_plan_item_refs`.
  function askInShiJing(recordId: string) {
    if (isPlan) {
      dispatch({ type: 'shijing/seed-plan', plan_id: recordId });
    } else {
      dispatch({ type: 'shijing/seed-memory', memory_id: recordId });
    }
    dispatch({ type: 'tab/activate', tab: 'shijing' });
    props.onClose();
  }

  const entryHeader = kind === 'past'
    ? YUEJING_COPY.dayPanel.entryHeadings.past
    : kind === 'today'
      ? YUEJING_COPY.dayPanel.entryHeadings.today
      : YUEJING_COPY.dayPanel.entryHeadings.future;
  const entryPlaceholder = isPlan
    ? YUEJING_COPY.dayPanel.entryPlaceholders.plan
    : YUEJING_COPY.dayPanel.entryPlaceholders.memory;
  const saveLabel = isPlan
    ? YUEJING_COPY.dayPanel.saveLabels.plan
    : YUEJING_COPY.dayPanel.saveLabels.memory;
  const records = isPlan ? plansForDate : memoriesForDate;
  const visibleRecords = props.filterTagId
    ? records.filter((record) => record.concern_tag_refs.includes(props.filterTagId as string))
    : records;
  const recordKind = isPlan
    ? YUEJING_COPY.dayPanel.recordKinds.plan
    : YUEJING_COPY.dayPanel.recordKinds.memory;

  return (
    <>
      <div
        className="shijing-yuejing__panel-backdrop"
        onClick={props.onClose}
        role="presentation"
        aria-hidden
      />
      <aside
        ref={panelRef}
        className="shijing-yuejing__panel"
        role="dialog"
        aria-modal="true"
        aria-label={YUEJING_COPY.dayPanel.detailAriaLabel(shortMonthDay(props.date), weekday)}
        data-day-kind={kind}
      >
        <button
          type="button"
          className="shijing-yuejing__panel-close"
          onClick={props.onClose}
          aria-label={YUEJING_COPY.dayPanel.close}
        >
          <CloseIcon />
        </button>

        <header className="shijing-yuejing__panel-head">
          <strong>{shortMonthDay(props.date)}</strong>
          <small>
            {weekday} · {YUEJING_COPY.dayPanel.dayKindLabels[kind]}
          </small>
        </header>

        {calendarDetails ? (
          <section
            className="shijing-yuejing__panel-section shijing-yuejing__panel-calendar"
            aria-label={YUEJING_COPY.dayPanel.calendarDetails.ariaLabel}
          >
            <h3>{YUEJING_COPY.dayPanel.calendarDetails.title}</h3>
            <dl className="shijing-yuejing__panel-calendar-grid">
              <div>
                <dt>{YUEJING_COPY.dayPanel.calendarDetails.lunar}</dt>
                <dd>{calendarDetails.lunar_label}</dd>
              </div>
              <div>
                <dt>{YUEJING_COPY.dayPanel.calendarDetails.ganzhi}</dt>
                <dd>{calendarDetails.ganzhi_label}</dd>
              </div>
              {calendarDetails.solar_term_label ? (
                <div>
                  <dt>{YUEJING_COPY.dayPanel.calendarDetails.solarTerm}</dt>
                  <dd>{calendarDetails.solar_term_label}</dd>
                </div>
              ) : null}
              {calendarDetails.festival_labels.length > 0 ? (
                <div>
                  <dt>{YUEJING_COPY.dayPanel.calendarDetails.festivals}</dt>
                  <dd>{calendarDetails.festival_labels.join('、')}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null}

        <section className="shijing-yuejing__panel-section">
          <h3>{YUEJING_COPY.dayPanel.currentTendency}</h3>
          {props.entries.length > 0 ? (
            <ul className="shijing-yuejing__panel-tendencies">
              {props.entries.map((entry, i) => {
                const tag = tagById.get(entry.concern_tag_ref);
                const tagName = tag ? yuejingTagLabel(tag) : entry.concern_tag_ref;
                const detail = yuejingCellDetail(entry);
                const iconStyle = concernIconStyle(tag?.label ?? tagName);
                return (
                  <li
                    key={`${entry.concern_tag_ref}-${i}`}
                    data-tendency={entry.tendency_class}
                  >
                    <ConcernIcon style={iconStyle} />
                    <div className="shijing-yuejing__panel-tend-text">
                      <strong>{tagName}</strong>
                      {detail ? <p>{detail}</p> : null}
                    </div>
                    <span
                      className="shijing-yuejing__panel-tend-chip"
                      data-tendency={entry.tendency_class}
                    >
                      <span className="shijing-yuejing__panel-tend-dot" aria-hidden />
                      {TENDENCY_CLASS_LABELS[entry.tendency_class]}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="shijing-yuejing__panel-empty">
              {YUEJING_COPY.dayPanel.emptyTendency}
            </p>
          )}
        </section>

        <section className="shijing-yuejing__panel-section">
          <h3>{entryHeader}</h3>
          <textarea
            className="shijing-yuejing__panel-entry"
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            placeholder={entryPlaceholder}
          />
          <div className="shijing-yuejing__panel-entry-foot">
            <button
              type="button"
              className="shijing-yuejing__panel-save"
              onClick={saveEntry}
              disabled={draft.trim().length === 0}
            >
              <PencilIcon />
              <span>{saveLabel}</span>
            </button>
          </div>
        </section>

        <section className="shijing-yuejing__panel-section">
          <h3>{YUEJING_COPY.dayPanel.recordsTitle(visibleRecords.length)}</h3>
          {visibleRecords.length === 0 ? (
            <div className="shijing-yuejing__panel-records-empty" role="status">
              <span className="shijing-yuejing__panel-records-empty-icon" aria-hidden>
                <ClipboardIcon />
              </span>
              <p>{YUEJING_COPY.dayPanel.recordsEmpty}</p>
            </div>
          ) : (
            <ul className="shijing-yuejing__panel-records" aria-label={YUEJING_COPY.dayPanel.recordsAriaLabel(recordKind)}>
              {visibleRecords.map((r) => {
                const isEditing = editingId === r.id;
                return (
                  <li key={r.id} data-editing={isEditing || undefined}>
                    {isEditing ? (
                      <>
                        <textarea
                          className="shijing-yuejing__panel-record-edit"
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.currentTarget.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              cancelEdit();
                            }
                          }}
                          autoFocus
                          aria-label={YUEJING_COPY.dayPanel.editRecordContent}
                        />
                        <div className="shijing-yuejing__panel-record-edit-actions">
                          <button
                            type="button"
                            className="shijing-yuejing__panel-record-cancel"
                            onClick={cancelEdit}
                          >
                            {YUEJING_COPY.dayPanel.cancel}
                          </button>
                          <button
                            type="button"
                            className="shijing-yuejing__panel-record-confirm"
                            disabled={
                              editDraft.trim().length === 0 || editDraft.trim() === r.body
                            }
                            onClick={commitEdit}
                          >
                            {YUEJING_COPY.dayPanel.save}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="shijing-yuejing__panel-record-body">{r.body}</span>
                        <div className="shijing-yuejing__panel-record-actions">
                          <Tooltip content={YUEJING_COPY.dayPanel.askThisRecord} placement="top">
                            <button
                              type="button"
                              data-action="ask"
                              aria-label={YUEJING_COPY.dayPanel.askThisRecord}
                              onClick={() => askInShiJing(r.id)}
                            >
                              <AskIcon />
                            </button>
                          </Tooltip>
                          <Tooltip content={YUEJING_COPY.dayPanel.edit} placement="top">
                            <button
                              type="button"
                              data-action="edit"
                              aria-label={YUEJING_COPY.dayPanel.editRecordAriaLabel(recordKind)}
                              onClick={() => startEdit(r.id, r.body)}
                            >
                              <PencilIcon />
                            </button>
                          </Tooltip>
                          <Tooltip content={YUEJING_COPY.dayPanel.delete} placement="top">
                            <button
                              type="button"
                              data-action="delete"
                              aria-label={YUEJING_COPY.dayPanel.deleteRecordAriaLabel(recordKind)}
                              onClick={() => setConfirmingDelete({ id: r.id, body: r.body })}
                            >
                              <TrashIcon />
                            </button>
                          </Tooltip>
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </aside>
      <ConfirmDialog
        open={confirmingDelete !== null}
        title={YUEJING_COPY.dayPanel.deleteTitle(recordKind)}
        message={
          confirmingDelete
            ? YUEJING_COPY.dayPanel.deleteMessage(confirmingDelete.body)
            : ''
        }
        confirmLabel={YUEJING_COPY.dayPanel.delete}
        cancelLabel={YUEJING_COPY.dayPanel.cancel}
        confirmTone="danger"
        onConfirm={confirmDelete}
        onClose={() => setConfirmingDelete(null)}
      />
    </>
  );
}

// Concern tags on YueJing are managed inline through the filter row's
// 「✎ 编辑关注」popover (`YueJingConcernEditorPopover` above) — quick
// archive / unarchive, preset templates, and inline custom-tag input.
// Full management (mention resolution, prompt_text editing) still
// lives in Settings → 关注.
