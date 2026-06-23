// RiJing — 今日参照 reference-event list.
//
// Renders the events the user has folded into today's reading as compact rows,
// each tagged 「已结合今日判断」. Rows keep the full management capability:
//
//   - Edit: the row turns into a textarea + 保存/取消. Save goes through
//     `upsertEventMemory` so the validator + concern-tag-ref + person-ref gates
//     still apply.
//   - Delete: opens a ConfirmDialog; on confirm we call `deleteEventMemory` so a
//     missing id surfaces a typed refusal instead of a silent no-op.
//
// It owns no data of its own — it reads the events it is handed and dispatches
// `snapshot/replace`.

import { useState } from 'react';

import { ConfirmDialog, Tooltip } from '@nimiplatform/kit/ui';

import { useShijingStore } from '../../state/shijing-store.tsx';
import { upsertEventMemory, deleteEventMemory } from '../../memories/memory-editor-state.ts';
import type { EventMemory } from '../../../domain/event-memory.ts';
import { PencilIcon, TrashIcon } from './rijing-icons.tsx';
import { useProductCopy } from '../../i18n/copy.ts';

export interface RiJingReferenceListProps {
  readonly references: readonly EventMemory[];
}

type RowState =
  | { mode: 'view' }
  | { mode: 'editing'; draft: string; error?: string }
  | { mode: 'delete_refused'; reason: string };

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function RiJingReferenceList(props: RiJingReferenceListProps) {
  const copy = useProductCopy();
  const { state, dispatch } = useShijingStore();
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const [confirmingDelete, setConfirmingDelete] = useState<EventMemory | null>(null);

  if (props.references.length === 0) return null;

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

  function requestDelete(memory: EventMemory) {
    setConfirmingDelete(memory);
  }

  function confirmDelete() {
    const memory = confirmingDelete;
    if (!memory) return;
    const outcome = deleteEventMemory(state.snapshot, memory.id);
    if (!outcome.ok) {
      setRow(memory.id, { mode: 'delete_refused', reason: copy.rijing.heroMemories.deleteFailed });
      setConfirmingDelete(null);
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: outcome.next_space });
    clearRow(memory.id);
    setConfirmingDelete(null);
  }

  return (
    <ul className="shijing-rijing__refs" aria-label={copy.rijing.eventInput.refsAria}>
      {props.references.map((memory) => {
        const rowState = rowStates[memory.id] ?? { mode: 'view' };
        if (rowState.mode === 'editing') {
          return (
            <li key={memory.id} className="shijing-rijing__ref shijing-rijing__ref--editing">
              <textarea
                className="shijing-rijing__ref-textarea"
                value={rowState.draft}
                rows={2}
                aria-label={copy.rijing.heroMemories.editBodyAria}
                onChange={(e) => updateDraft(memory.id, e.target.value)}
                autoFocus
              />
              <div className="shijing-rijing__ref-edit-actions">
                <button
                  type="button"
                  className="shijing-rijing__ref-edit-save"
                  onClick={() => saveEdit(memory)}
                >
                  {copy.common.save}
                </button>
                <button
                  type="button"
                  className="shijing-rijing__ref-edit-cancel"
                  onClick={() => clearRow(memory.id)}
                >
                  {copy.common.cancel}
                </button>
              </div>
              {rowState.error ? (
                <p className="shijing-rijing__ref-error" role="alert">
                  {rowState.error}
                </p>
              ) : null}
            </li>
          );
        }
        return (
          <li key={memory.id} className="shijing-rijing__ref">
            <span className="shijing-rijing__ref-dot" aria-hidden />
            <span className="shijing-rijing__ref-text">{memory.body}</span>
            <span className="shijing-rijing__ref-badge">{copy.rijing.eventInput.refsBadge}</span>
            <div className="shijing-rijing__ref-actions" aria-label={copy.rijing.heroMemories.actionsAria}>
              <Tooltip content={copy.rijing.heroMemories.editAction} placement="top">
                <button
                  type="button"
                  className="shijing-rijing__ref-action"
                  onClick={() => startEdit(memory)}
                  aria-label={copy.rijing.heroMemories.editAction}
                >
                  <PencilIcon />
                </button>
              </Tooltip>
              <Tooltip content={copy.rijing.heroMemories.deleteAction} placement="top">
                <button
                  type="button"
                  className="shijing-rijing__ref-action"
                  onClick={() => requestDelete(memory)}
                  aria-label={copy.rijing.heroMemories.deleteAction}
                >
                  <TrashIcon />
                </button>
              </Tooltip>
            </div>
            {rowState.mode === 'delete_refused' ? (
              <p className="shijing-rijing__ref-error" role="alert">
                {rowState.reason}
              </p>
            ) : null}
          </li>
        );
      })}
      <ConfirmDialog
        open={confirmingDelete !== null}
        title={copy.rijing.heroMemories.deleteTitle}
        message={confirmingDelete ? copy.rijing.heroMemories.deleteMessage(confirmingDelete.body) : ''}
        confirmLabel={copy.common.delete}
        cancelLabel={copy.common.cancel}
        confirmTone="danger"
        onConfirm={confirmDelete}
        onClose={() => setConfirmingDelete(null)}
      />
    </ul>
  );
}
