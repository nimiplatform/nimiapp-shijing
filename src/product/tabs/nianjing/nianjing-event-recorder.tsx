import { useProductCopy } from '../../i18n/copy.ts';
// SJG-DATA-05 / SJG-IA-03 — NianJing {c.heading} recorder.
//
// Mounted inside the NianJing phase-band / inflection detail drawer so a past
// life event can be recorded right where the long-horizon phase that frames it
// is being read. Per `memory-use-policy.yaml`, NianJing EventMemory is
// "optional_cited_context_for_phase_explanation": events recorded here help the
// AI explain *why* a phase reads the way it does. They never feed the
// deterministic phase math (SJG-PROD-10) — recording an event does not alter
// any band or inflection.
//
// EventMemory is a *past* fact, so the recorder only appears once the framing
// phase has begun (`rangeStart <= today`); a purely-future band shows a short
// note instead. The list shows events whose `occurred_at` falls inside the
// framing range and is tagged with this concern. Save / edit / delete all go
// through `upsertEventMemory` / `deleteEventMemory` so the validator +
// concern-tag-ref gates apply. {c.ask} seeds the ShiJing consultation
// and jumps there, matching the YueJing day panel.

import { useMemo, useState } from 'react';

import { ConfirmDialog, Tooltip } from '@nimiplatform/kit/ui';

import type { ConcernTag } from '../../../domain/concern-tag.ts';
import type { EventMemory } from '../../../domain/event-memory.ts';
import { newEventMemoryId } from '../../ids/index.ts';
import {
  deleteEventMemory,
  upsertEventMemory,
} from '../../memories/memory-editor-state.ts';
import { useShijingStore } from '../../state/shijing-store.tsx';
import { persistenceWriteSucceeded } from '../../state/persistence-bridge.ts';
import { ArrowUpIcon } from '../shijing/shijing-icons.tsx';
import { dailyMirrorScopeForToday } from '../mirror-scope-helpers.ts';

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function todayIsoDate(): string {
  return dailyMirrorScopeForToday().date;
}

function dateLabel(occurredAt: string): string {
  return occurredAt.slice(0, 10);
}

// Default occurred-at date for a new entry: today if it sits inside the
// framing range, otherwise the range's most recent in-range day (its end,
// clamped to today). Keeps the picker's default meaningful at year scale.
function defaultDateWithin(rangeStart: string, rangeEnd: string, today: string): string {
  if (today < rangeStart) return rangeStart;
  if (today > rangeEnd) return rangeEnd;
  return today;
}

export interface NianJingEventRecorderProps {
  readonly concernTag: ConcernTag;
  readonly rangeStart: string; // ISO YYYY-MM-DD (inclusive)
  readonly rangeEnd: string; // ISO YYYY-MM-DD (inclusive)
  // When recording against an inflection marker the date is fixed to the
  // marker; the picker is hidden and the entry anchors to this day.
  readonly fixedDate?: string;
  // Heading override — {c.heading} for a band, "这个拐点前后发生过什么" for a
  // marker. Defaults to the band wording.
  readonly heading?: string;
  // Called after {c.ask} navigates away, so the host drawer can close.
  readonly onNavigatedAway: () => void;
  // Opens the full-life {c.heading} archive in Settings — the timeline only
  // ever shows events inside this phase's window, so {c.all} routes to the
  // complete record list for backfill / review.
  readonly onOpenArchive: () => void;
}

export function NianJingEventRecorder(props: NianJingEventRecorderProps) {
  const c = useProductCopy().nianjingSurface.eventRecorder;
  const { state, dispatch, replace_snapshot } = useShijingStore();
  const today = todayIsoDate();
  const tagId = props.concernTag.id;

  const [draft, setDraft] = useState('');
  const [draftDate, setDraftDate] = useState(
    props.fixedDate ?? defaultDateWithin(props.rangeStart, props.rangeEnd, today),
  );
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState<EventMemory | null>(null);

  // The framing phase hasn't started yet — there is nothing past to record.
  const isFuture = props.rangeStart > today;

  const records = useMemo(() => {
    return state.snapshot.event_memories
      .filter((m) => {
        if (!m.concern_tag_refs.includes(tagId)) return false;
        const d = m.occurred_at.slice(0, 10);
        if (props.fixedDate) return d === props.fixedDate;
        return d >= props.rangeStart && d <= props.rangeEnd;
      })
      .slice()
      .sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at));
  }, [state.snapshot.event_memories, tagId, props.rangeStart, props.rangeEnd, props.fixedDate]);

  async function commit(memory: EventMemory, onOk: () => void) {
    const outcome = upsertEventMemory(state.snapshot, memory);
    if (!outcome.ok) {
      const detail =
        outcome.error.code === 'memory_invalid'
          ? `memory_invalid:${outcome.error.detail.code}`
          : outcome.error.code;
      setError(detail);
      return;
    }
    const persistence = await replace_snapshot(outcome.next_space);
    if (!persistenceWriteSucceeded(persistence)) {
      setError(persistence.kind === 'error' ? persistence.error.kind : persistence.kind);
      return;
    }
    setError(null);
    onOk();
  }

  async function saveNew() {
    const body = draft.trim();
    if (body.length === 0) return;
    const ts = nowIso();
    const memory: EventMemory = {
      id: newEventMemoryId(),
      occurred_at: `${draftDate}T00:00:00Z`,
      body,
      person_refs: [],
      concern_tag_refs: [tagId],
      source: 'nianjing',
      admissible_use: 'eligible_for_retrieval',
      created_at: ts,
      updated_at: ts,
    };
    await commit(memory, () => setDraft(''));
  }

  function startEdit(memory: EventMemory) {
    setEditingId(memory.id);
    setEditDraft(memory.body);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft('');
  }

  async function saveEdit(memory: EventMemory) {
    const body = editDraft.trim();
    if (body.length === 0) return;
    await commit({ ...memory, body, updated_at: nowIso() }, cancelEdit);
  }

  async function confirmDelete() {
    const memory = confirmingDelete;
    if (!memory) return;
    const outcome = deleteEventMemory(state.snapshot, memory.id);
    if (!outcome.ok) {
      setError(outcome.error.code);
      setConfirmingDelete(null);
      return;
    }
    const persistence = await replace_snapshot(outcome.next_space);
    if (!persistenceWriteSucceeded(persistence)) {
      setError(persistence.kind === 'error' ? persistence.error.kind : persistence.kind);
      return;
    }
    setError(null);
    if (editingId === memory.id) cancelEdit();
    setConfirmingDelete(null);
  }

  function askInShiJing(id: string) {
    dispatch({ type: 'shijing/seed-memory', memory_id: id });
    dispatch({ type: 'tab/activate', tab: 'shijing' });
    props.onNavigatedAway();
  }

  const heading = props.heading ?? c.heading;

  return (
    <section className="shijing-nianjing__rec" aria-label={heading}>
      <h4 className="shijing-nianjing__rec-title">{heading}</h4>

      {isFuture ? (
        <p className="shijing-nianjing__rec-note">
          {c.future}
        </p>
      ) : (
        <>
          <p className="shijing-nianjing__rec-intro">
            {c.intro(props.concernTag.label.replace(/^#/, ''))}
          </p>
          <div className="shijing-nianjing__rec-compose">
            <textarea
              className="shijing-nianjing__rec-textarea"
              value={draft}
              rows={2}
              placeholder={c.placeholder}
              aria-label={c.recordAria}
              onChange={(e) => {
                setDraft(e.currentTarget.value);
                if (error) setError(null);
              }}
            />
            <div className="shijing-nianjing__rec-compose-control">
              {props.fixedDate ? (
                <span className="shijing-nianjing__rec-date-fixed">
                  {dateLabel(`${props.fixedDate}T00:00:00Z`)}
                </span>
              ) : (
                <input
                  type="date"
                  className="shijing-nianjing__rec-date"
                  value={draftDate}
                  min={props.rangeStart}
                  max={props.rangeEnd}
                  aria-label={c.date}
                  onChange={(e) => setDraftDate(e.currentTarget.value)}
                />
              )}
              <Tooltip content={c.save} placement="top">
                <button
                  type="button"
                  className="shijing-nianjing__rec-save"
                  onClick={saveNew}
                  disabled={draft.trim().length === 0}
                  aria-label={c.save}
                >
                  <ArrowUpIcon className="shijing-nianjing__rec-save-icon" />
                </button>
              </Tooltip>
            </div>
          </div>
        </>
      )}

      {error ? (
        <p className="shijing-nianjing__rec-error" role="alert">
          {c.failed}<code>（{error}）</code>
        </p>
      ) : null}

      <div className="shijing-nianjing__rec-list-head">
        <span>{c.count(records.length)}</span>
        <button
          type="button"
          className="shijing-nianjing__rec-archive-link"
          onClick={() => {
            props.onOpenArchive();
            props.onNavigatedAway();
          }}
        >
          {c.all}
        </button>
      </div>
      {records.length === 0 ? (
        <p className="shijing-nianjing__rec-empty" role="status">
          {c.empty}
        </p>
      ) : (
        <ul className="shijing-nianjing__rec-list" aria-label={c.listAria}>
          {records.map((m) => {
            const isEditing = editingId === m.id;
            return (
              <li key={m.id} data-editing={isEditing || undefined}>
                {isEditing ? (
                  <>
                    <textarea
                      className="shijing-nianjing__rec-edit"
                      value={editDraft}
                      rows={2}
                      autoFocus
                      aria-label={c.editContent}
                      onChange={(e) => setEditDraft(e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          cancelEdit();
                        }
                      }}
                    />
                    <div className="shijing-nianjing__rec-edit-actions">
                      <button type="button" onClick={cancelEdit}>
                        {c.cancel}
                      </button>
                      <button
                        type="button"
                        data-primary
                        disabled={
                          editDraft.trim().length === 0 || editDraft.trim() === m.body
                        }
                        onClick={() => saveEdit(m)}
                      >
                        {c.saveEdit}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="shijing-nianjing__rec-date-label">
                      {dateLabel(m.occurred_at)}
                    </span>
                    <span className="shijing-nianjing__rec-body">{m.body}</span>
                    <div className="shijing-nianjing__rec-actions">
                      <Tooltip content={c.ask} placement="top">
                        <button
                          type="button"
                          aria-label={c.ask}
                          onClick={() => askInShiJing(m.id)}
                        >
                          {c.askShort}
                        </button>
                      </Tooltip>
                      <Tooltip content={c.edit} placement="top">
                        <button
                          type="button"
                          aria-label={c.editAria}
                          onClick={() => startEdit(m)}
                        >
                          ✎
                        </button>
                      </Tooltip>
                      <Tooltip content={c.delete} placement="top">
                        <button
                          type="button"
                          aria-label={c.deleteAria}
                          onClick={() => setConfirmingDelete(m)}
                        >
                          ✕
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

      <ConfirmDialog
        open={confirmingDelete !== null}
        title={c.deleteTitle}
        message={
          confirmingDelete
            ? c.deleteMessage(confirmingDelete.body)
            : ''
        }
        confirmLabel={c.delete}
        cancelLabel={c.cancel}
        confirmTone="danger"
        onConfirm={confirmDelete}
        onClose={() => setConfirmingDelete(null)}
      />
    </section>
  );
}
