// Today tab — "今日参考的事件" footer that lives inside the Hero card.
//
// Surfaces the most recent events on the snapshot so the conclusion is
// read together with the inputs that informed it. Each row also lets
// the user edit or delete the event in place:
//
//   - Edit: row turns into a single textarea + 保存/取消; on save we
//     rebuild a full Event (preserving id, primary_subject, participants,
//     occurred_at, view_refs), validate, and dispatch a snapshot replace.
//   - Delete: opens a kit ConfirmDialog. On confirm we still apply the
//     dangling-reference + validator gates (mirrors EventList
//     semantics); a refusal closes the modal and leaves an inline note
//     on the row. The modal protects against accidental clicks; it is
//     not a substitute for the contract gates beneath it.
//
// We keep this component thin: only the latest 3 events show here. The
// full event-management surface stays in its dedicated module.

import { useMemo, useState } from 'react';

import { ConfirmDialog } from '@nimiplatform/kit/ui';

import { useShijingStore } from '../state/shijing-store.tsx';
import { validateEvent } from '../../contracts/event-validator.ts';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import { findReferencesToEvent } from '../events/event-dangling-reference.ts';
import type { Event } from '../../domain/event.ts';

const PREVIEW_COUNT = 3;

type RowState =
  | { mode: 'view' }
  | { mode: 'editing'; draft: string; error?: string }
  | { mode: 'delete_refused'; reason: string };

function splitTitleAndRecap(input: string): { title: string; recap: string } {
  const trimmed = input.trim();
  if (trimmed.length === 0) return { title: '', recap: '' };
  const firstBreak = trimmed.search(/[\n。！？!?]/);
  if (firstBreak === -1) {
    return { title: trimmed.slice(0, 64), recap: trimmed };
  }
  const title = (trimmed.slice(0, firstBreak).trim() || trimmed).slice(0, 64);
  return { title, recap: trimmed };
}

function dateLabel(occurredAt: string): string {
  return occurredAt.slice(0, 10);
}

export function TodayHeroEvents() {
  const { state, dispatch } = useShijingStore();
  const preview = useMemo(
    () =>
      state.snapshot.events
        .slice()
        .sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at))
        .slice(0, PREVIEW_COUNT),
    [state.snapshot.events],
  );
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  // Event currently awaiting delete confirmation. Held in a single slot
  // because only one ConfirmDialog can be open at a time.
  const [confirmingDelete, setConfirmingDelete] = useState<Event | null>(null);

  if (preview.length === 0) return null;

  function setRow(id: string, next: RowState) {
    setRowStates((current) => ({ ...current, [id]: next }));
  }

  function clearRow(id: string) {
    setRowStates((current) => {
      const { [id]: _omit, ...rest } = current;
      void _omit;
      return rest;
    });
  }

  function startEdit(event: Event) {
    const initial = event.recap && event.recap.length > 0 ? event.recap : event.title;
    setRow(event.id, { mode: 'editing', draft: initial });
  }

  function updateDraft(id: string, value: string) {
    setRowStates((current) => {
      const existing = current[id];
      if (!existing || existing.mode !== 'editing') return current;
      return { ...current, [id]: { mode: 'editing', draft: value } };
    });
  }

  function saveEdit(event: Event) {
    const rowState = rowStates[event.id];
    if (!rowState || rowState.mode !== 'editing') return;
    const text = rowState.draft;
    const { title, recap } = splitTitleAndRecap(text);
    if (title.length === 0) {
      setRow(event.id, { mode: 'editing', draft: text, error: '描述不能为空。' });
      return;
    }
    const nextEvent: Event = {
      ...event,
      title,
      ...(recap.length > 0 ? { recap } : {}),
    };
    // Strip out an existing recap if the user cleared everything below
    // the first sentence. Building a fresh object respects readonly.
    if (recap.length === 0 && 'recap' in nextEvent) {
      // Rebuild without the recap field.
      const { recap: _r, ...withoutRecap } = nextEvent;
      void _r;
      Object.assign(nextEvent, withoutRecap);
    }
    const eventCheck = validateEvent(nextEvent);
    if (!eventCheck.ok) {
      setRow(event.id, { mode: 'editing', draft: text, error: eventCheck.error.code });
      return;
    }
    const nextSnapshot = {
      ...state.snapshot,
      events: state.snapshot.events.map((existing) => (existing.id === event.id ? nextEvent : existing)),
    };
    const spaceCheck = validateShiJingSpace(nextSnapshot);
    if (!spaceCheck.ok) {
      setRow(event.id, { mode: 'editing', draft: text, error: spaceCheck.error.code });
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: nextSnapshot });
    clearRow(event.id);
  }

  function cancelEdit(event: Event) {
    clearRow(event.id);
  }

  function requestDelete(event: Event) {
    setConfirmingDelete(event);
  }

  function cancelDelete() {
    setConfirmingDelete(null);
  }

  function confirmDelete() {
    const event = confirmingDelete;
    if (!event) return;
    const refs = findReferencesToEvent(state.snapshot, event.id);
    if (refs.length > 0) {
      setRow(event.id, {
        mode: 'delete_refused',
        reason: '这条事件被某个「关注」或会话引用，无法删除。',
      });
      setConfirmingDelete(null);
      return;
    }
    const nextSnapshot = {
      ...state.snapshot,
      events: state.snapshot.events.filter((existing) => existing.id !== event.id),
    };
    const check = validateShiJingSpace(nextSnapshot);
    if (!check.ok) {
      setRow(event.id, {
        mode: 'delete_refused',
        reason: '删除被数据校验拒绝，请稍后再试。',
      });
      setConfirmingDelete(null);
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: nextSnapshot });
    clearRow(event.id);
    setConfirmingDelete(null);
  }

  return (
    <section className="shijing-today-hero__events" aria-label="今日参考的事件">
      <header className="shijing-today-hero__events-head">
        <h4 className="shijing-today-hero__events-title">今日参考的事件</h4>
        <p className="shijing-today-hero__events-intro">
          结论已结合下面这些事件来看。
        </p>
      </header>
      <ul className="shijing-today-hero__events-list">
        {preview.map((event) => {
          const rowState = rowStates[event.id] ?? { mode: 'view' };
          if (rowState.mode === 'editing') {
            return (
              <li
                key={event.id}
                className="shijing-today-hero__events-item shijing-today-hero__events-item--editing"
              >
                <span className="shijing-today-hero__events-date">{dateLabel(event.occurred_at)}</span>
                <div className="shijing-today-hero__events-edit">
                  <textarea
                    className="shijing-today-hero__events-textarea"
                    value={rowState.draft}
                    rows={2}
                    aria-label="编辑事件描述"
                    onChange={(e) => updateDraft(event.id, e.target.value)}
                    autoFocus
                  />
                  <div className="shijing-today-hero__events-edit-actions">
                    <button
                      type="button"
                      className="shijing-today-hero__events-edit-save"
                      onClick={() => saveEdit(event)}
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      className="shijing-today-hero__events-edit-cancel"
                      onClick={() => cancelEdit(event)}
                    >
                      取消
                    </button>
                  </div>
                  {rowState.error ? (
                    <p className="shijing-today-hero__events-error" role="alert">
                      {rowState.error}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          }
          return (
            <li
              key={event.id}
              className="shijing-today-hero__events-item"
            >
              <span className="shijing-today-hero__events-date">{dateLabel(event.occurred_at)}</span>
              <span className="shijing-today-hero__events-text">{event.title}</span>
              <div className="shijing-today-hero__events-actions" aria-label="操作">
                <button
                  type="button"
                  className="shijing-today-hero__events-action"
                  onClick={() => startEdit(event)}
                  aria-label="编辑"
                  title="编辑"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="shijing-today-hero__events-action"
                  onClick={() => requestDelete(event)}
                  aria-label="删除"
                  title="删除"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M3 6h18" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </svg>
                </button>
              </div>
              {rowState.mode === 'delete_refused' ? (
                <p className="shijing-today-hero__events-error" role="alert">
                  {rowState.reason}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        open={confirmingDelete !== null}
        title="删除这条事件？"
        message={
          confirmingDelete
            ? `「${confirmingDelete.title}」将不再作为今日推演的参考。此操作不可撤销。`
            : ''
        }
        confirmLabel="删除"
        cancelLabel="取消"
        confirmTone="danger"
        onConfirm={confirmDelete}
        onClose={cancelDelete}
      />
    </section>
  );
}
