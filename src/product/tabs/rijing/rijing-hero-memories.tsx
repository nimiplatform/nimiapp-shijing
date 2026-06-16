// RiJing — "今日参考的事件" footer that lives inside the Hero card.
//
// Surfaces the user's most recent EventMemory entries so the daily
// conclusion is read alongside the inputs that informed it. Each row
// supports inline edit + delete (with kit ConfirmDialog).
//
//   - Edit: row turns into a textarea + 保存/取消. Save goes through
//     `upsertEventMemory` so the validator + concern-tag-ref +
//     person-ref gates still apply.
//   - Delete: opens a ConfirmDialog. On confirm we still call
//     `deleteEventMemory` so a missing id surfaces a typed refusal
//     instead of silently swallowing the click.
//
// This component owns no data of its own. It reads from the snapshot
// and dispatches `snapshot/replace`.

import { useMemo, useState } from 'react';

import { ConfirmDialog } from '@nimiplatform/kit/ui';

import { useShijingStore } from '../../state/shijing-store.tsx';
import { upsertEventMemory, deleteEventMemory } from '../../memories/memory-editor-state.ts';
import type { EventMemory } from '../../../domain/event-memory.ts';
import { PencilIcon, TrashIcon } from './rijing-icons.tsx';
import { useProductCopy } from '../../i18n/copy.ts';

const PREVIEW_COUNT = 3;

type RowState =
  | { mode: 'view' }
  | { mode: 'editing'; draft: string; error?: string }
  | { mode: 'delete_refused'; reason: string };

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function dateLabel(occurredAt: string): string {
  return occurredAt.slice(0, 10);
}

export function RiJingHeroMemories() {
  const copy = useProductCopy();
  const { state, dispatch } = useShijingStore();
  const preview = useMemo(
    () =>
      state.snapshot.event_memories
        .slice()
        .sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at))
        .slice(0, PREVIEW_COUNT),
    [state.snapshot.event_memories],
  );
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const [confirmingDelete, setConfirmingDelete] = useState<EventMemory | null>(null);

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

  function startEdit(memory: EventMemory) {
    setRow(memory.id, { mode: 'editing', draft: memory.body });
  }

  function updateDraft(id: string, value: string) {
    setRowStates((current) => {
      const existing = current[id];
      if (!existing || existing.mode !== 'editing') return current;
      return { ...current, [id]: { mode: 'editing', draft: value } };
    });
  }

  function saveEdit(memory: EventMemory) {
    const rowState = rowStates[memory.id];
    if (!rowState || rowState.mode !== 'editing') return;
    const body = rowState.draft.trim();
    if (body.length === 0) {
      setRow(memory.id, { mode: 'editing', draft: rowState.draft, error: copy.rijing.heroMemories.emptyBody });
      return;
    }
    const next: EventMemory = { ...memory, body, updated_at: nowIso() };
    const outcome = upsertEventMemory(state.snapshot, next);
    if (!outcome.ok) {
      const detail =
        outcome.error.code === 'memory_invalid'
          ? `memory_invalid:${outcome.error.detail.code}`
          : outcome.error.code;
      setRow(memory.id, { mode: 'editing', draft: rowState.draft, error: detail });
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: outcome.next_space });
    clearRow(memory.id);
  }

  function cancelEdit(memory: EventMemory) {
    clearRow(memory.id);
  }

  function requestDelete(memory: EventMemory) {
    setConfirmingDelete(memory);
  }

  function cancelDelete() {
    setConfirmingDelete(null);
  }

  function confirmDelete() {
    const memory = confirmingDelete;
    if (!memory) return;
    const outcome = deleteEventMemory(state.snapshot, memory.id);
    if (!outcome.ok) {
      setRow(memory.id, {
        mode: 'delete_refused',
        reason: copy.rijing.heroMemories.deleteFailed,
      });
      setConfirmingDelete(null);
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: outcome.next_space });
    clearRow(memory.id);
    setConfirmingDelete(null);
  }

  return (
    <section className="shijing-rijing__hero-memories" aria-label={copy.rijing.heroMemories.ariaLabel}>
      <header className="shijing-rijing__hero-memories-head">
        <h4 className="shijing-rijing__hero-memories-title">{copy.rijing.heroMemories.title}</h4>
        <p className="shijing-rijing__hero-memories-intro">
          {copy.rijing.heroMemories.intro}
        </p>
      </header>
      <ul className="shijing-rijing__hero-memories-list">
        {preview.map((memory) => {
          const rowState = rowStates[memory.id] ?? { mode: 'view' };
          if (rowState.mode === 'editing') {
            return (
              <li
                key={memory.id}
                className="shijing-rijing__hero-memories-item shijing-rijing__hero-memories-item--editing"
              >
                <span className="shijing-rijing__hero-memories-date">{dateLabel(memory.occurred_at)}</span>
                <div className="shijing-rijing__hero-memories-edit">
                  <textarea
                    className="shijing-rijing__hero-memories-textarea"
                    value={rowState.draft}
                    rows={2}
                    aria-label={copy.rijing.heroMemories.editBodyAria}
                    onChange={(e) => updateDraft(memory.id, e.target.value)}
                    autoFocus
                  />
                  <div className="shijing-rijing__hero-memories-edit-actions">
                    <button
                      type="button"
                      className="shijing-rijing__hero-memories-edit-save"
                      onClick={() => saveEdit(memory)}
                    >
                      {copy.common.save}
                    </button>
                    <button
                      type="button"
                      className="shijing-rijing__hero-memories-edit-cancel"
                      onClick={() => cancelEdit(memory)}
                    >
                      {copy.common.cancel}
                    </button>
                  </div>
                  {rowState.error ? (
                    <p className="shijing-rijing__hero-memories-error" role="alert">
                      {rowState.error}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          }
          return (
            <li key={memory.id} className="shijing-rijing__hero-memories-item">
              <span className="shijing-rijing__hero-memories-date">{dateLabel(memory.occurred_at)}</span>
              <span className="shijing-rijing__hero-memories-text">{memory.body}</span>
              <div className="shijing-rijing__hero-memories-actions" aria-label={copy.rijing.heroMemories.actionsAria}>
                <button
                  type="button"
                  className="shijing-rijing__hero-memories-action"
                  onClick={() => startEdit(memory)}
                  aria-label={copy.rijing.heroMemories.editAction}
                  title={copy.rijing.heroMemories.editAction}
                >
                  <PencilIcon />
                </button>
                <button
                  type="button"
                  className="shijing-rijing__hero-memories-action"
                  onClick={() => requestDelete(memory)}
                  aria-label={copy.rijing.heroMemories.deleteAction}
                  title={copy.rijing.heroMemories.deleteAction}
                >
                  <TrashIcon />
                </button>
              </div>
              {rowState.mode === 'delete_refused' ? (
                <p className="shijing-rijing__hero-memories-error" role="alert">
                  {rowState.reason}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        open={confirmingDelete !== null}
        title={copy.rijing.heroMemories.deleteTitle}
        message={
          confirmingDelete
            ? copy.rijing.heroMemories.deleteMessage(confirmingDelete.body)
            : ''
        }
        confirmLabel={copy.common.delete}
        cancelLabel={copy.common.cancel}
        confirmTone="danger"
        onConfirm={confirmDelete}
        onClose={cancelDelete}
      />
    </section>
  );
}
