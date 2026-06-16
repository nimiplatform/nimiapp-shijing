// W-c03 Settings > Memory React editor.
//
// Default view is a record list (or an empty state), never an open form.
// Adding a memory opens a right-hand drawer holding the full form, so the main
// 发生过的事 page stays calm and scannable — mirrors the 档案 (PersonEditor) page.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, ConfirmDialog } from '@nimiplatform/kit/ui';
import type { EventMemory } from '../../domain/event-memory.ts';
import { EVENT_MEMORY_ADMISSIBLE_USES, EVENT_MEMORY_SOURCES } from '../../domain/event-memory.ts';
import { useProductCopy } from '../i18n/copy.ts';
import {
  formatIsoForDisplay,
  isoToLocalInput,
  localInputToIso,
} from '../datetime/friendly-time.ts';
import { newEventMemoryId } from '../ids/index.ts';
import { SjpSelect } from '../components/sjp-select.tsx';
import { useShijingStore } from '../state/shijing-store.tsx';
import { deleteEventMemory, upsertEventMemory } from './memory-editor-state.ts';
import { cascadeOnEntityRemoval } from '../reading/cascade-delete.ts';

interface MemoryDraft {
  readonly id: string;
  readonly occurred_at: string;
  readonly body: string;
  readonly concern_tag_refs: readonly string[];
  readonly source: EventMemory['source'];
  readonly admissible_use: EventMemory['admissible_use'];
}

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function emptyDraft(): MemoryDraft {
  return {
    id: newEventMemoryId(),
    occurred_at: nowIso(),
    body: '',
    concern_tag_refs: [],
    source: 'manual',
    admissible_use: 'eligible_for_retrieval',
  };
}

export function MemoryEditor() {
  const { state, dispatch } = useShijingStore();
  const copy = useProductCopy();
  const [draft, setDraft] = useState<MemoryDraft>(emptyDraft);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<EventMemory | null>(null);

  // Close drawer on Escape. Inlining the state setters here (rather than
  // calling closeDrawer) keeps the effect's dependency list honest.
  useEffect(() => {
    if (!drawerOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setDrawerOpen(false);
        setErrorCode(null);
      }
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [drawerOpen]);

  function openDrawer() {
    setDraft(emptyDraft());
    setErrorCode(null);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setErrorCode(null);
  }

  function add() {
    const ts = nowIso();
    const memory: EventMemory = {
      id: draft.id,
      occurred_at: draft.occurred_at,
      body: draft.body,
      person_refs: [],
      concern_tag_refs: [...draft.concern_tag_refs],
      source: draft.source,
      admissible_use: draft.admissible_use,
      created_at: ts,
      updated_at: ts,
    };
    const outcome = upsertEventMemory(state.snapshot, memory);
    if (!outcome.ok) {
      const detail =
        outcome.error.code === 'memory_invalid'
          ? `memory_invalid:${outcome.error.detail.code}`
          : outcome.error.code;
      setErrorCode(detail);
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: outcome.next_space });
    closeDrawer();
  }

  function deleteMemoryMessage(memory: EventMemory): string {
    const cascade = cascadeOnEntityRemoval(state.snapshot, { event_memory_id: memory.id });
    const parts: string[] = [];
    if (cascade.dropped_readings > 0) parts.push(copy.memory.cascadeReadings(cascade.dropped_readings));
    if (cascade.dropped_conversations > 0) {
      parts.push(copy.memory.cascadeConversations(cascade.dropped_conversations));
    }
    const extra = parts.length > 0 ? `${parts.join(', ')}. ` : '';
    return copy.memory.deleteMessage(memory.body, extra);
  }

  function confirmDelete() {
    const memory = confirmingDelete;
    if (!memory) return;
    const outcome = deleteEventMemory(state.snapshot, memory.id);
    if (!outcome.ok) {
      setErrorCode(outcome.error.code);
      setConfirmingDelete(null);
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: outcome.next_space });
    setErrorCode(null);
    setConfirmingDelete(null);
  }

  function toggleTag(tagId: string) {
    setDraft((prev) => {
      if (prev.concern_tag_refs.includes(tagId)) {
        return { ...prev, concern_tag_refs: prev.concern_tag_refs.filter((t) => t !== tagId) };
      }
      return { ...prev, concern_tag_refs: [...prev.concern_tag_refs, tagId] };
    });
  }

  const hasMemories = state.snapshot.event_memories.length > 0;
  const concernTags = state.snapshot.concern_tags;

  return (
    <section className="sjp-card" aria-label={copy.memory.title}>
      <div className="sjp-card-head">
        <span className="sjp-card-icon">
          <svg
            className="sjp-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </span>
        <div className="sjp-card-headtext">
          <h2 className="sjp-card-title">{copy.memory.title}</h2>
          <p className="sjp-card-desc">{copy.memory.description}</p>
        </div>
        <button type="button" className="sjp-btn sjp-card-action" onClick={openDrawer}>
          <svg
            className="sjp-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          {copy.common.add}
        </button>
      </div>

      {hasMemories ? (
        <ul className="sjp-records">
          {state.snapshot.event_memories.map((m) => (
            <li className="sjp-record" key={m.id}>
              <span className="sjp-record__main">
                <span className="sjp-record__time">{formatIsoForDisplay(m.occurred_at)}</span>
                <span className="sjp-record__body">{m.body}</span>
              </span>
              <button
                type="button"
                className="sjp-btn sjp-btn--ghost"
                onClick={() => setConfirmingDelete(m)}
                aria-label={copy.memory.deleteRecordAria}
              >
                {copy.common.delete}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sjp-empty">{copy.memory.empty}</p>
      )}

      {/* List-level error (e.g. delete blocked). The drawer shows its own. */}
      {!drawerOpen && errorCode ? (
        <p className="sjp-alert" role="alert">
          {copy.memory.saveFailed(errorCode)}
        </p>
      ) : null}

      {drawerOpen
        ? createPortal(
            <div className="sjp-drawer" role="dialog" aria-modal="true" aria-label={copy.memory.addDialog}>
              <div className="sjp-drawer__scrim" onClick={closeDrawer} />
              <div className="sjp-drawer__panel">
                <header className="sjp-drawer__head">
                  <h3 className="sjp-drawer__title">{copy.memory.addDialog}</h3>
                  <button
                    type="button"
                    className="sjp-drawer__close"
                    onClick={closeDrawer}
                    aria-label={copy.common.close}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </header>

                <form
                  className="sjp-drawer__body sjp-grid"
                  onSubmit={(e) => {
                    e.preventDefault();
                    add();
                  }}
                >
                  <div className="sjp-field">
                    <label className="sjp-label" htmlFor="memory-occurred">{copy.memory.occurredAt}</label>
                    <input
                      id="memory-occurred"
                      type="datetime-local"
                      className="sjp-input"
                      value={isoToLocalInput(draft.occurred_at)}
                      onChange={(e) =>
                        setDraft({ ...draft, occurred_at: localInputToIso(e.currentTarget.value) })
                      }
                    />
                  </div>

                  <div className="sjp-field">
                    <label className="sjp-label" htmlFor="memory-source">{copy.memory.source}</label>
                    <SjpSelect
                      id="memory-source"
                      value={draft.source}
                      onValueChange={(v) => setDraft({ ...draft, source: v as MemoryDraft['source'] })}
                      options={EVENT_MEMORY_SOURCES.map((s) => ({ value: s, label: copy.recordSourceLabels[s] }))}
                    />
                  </div>

                  <div className="sjp-field sjp-field--full">
                    <label className="sjp-label" htmlFor="memory-body">{copy.memory.body}</label>
                    <textarea
                      id="memory-body"
                      className="sjp-textarea"
                      placeholder={copy.memory.bodyPlaceholder}
                      value={draft.body}
                      onChange={(e) => setDraft({ ...draft, body: e.currentTarget.value })}
                    />
                  </div>

                  <div className="sjp-field sjp-field--full">
                    <label className="sjp-label">{copy.memory.concernRefs}</label>
                    {concernTags.length > 0 ? (
                      <div className="sjp-checks">
                        {concernTags.map((t) => (
                          <label className="sjp-check" key={t.id}>
                            <input
                              type="checkbox"
                              checked={draft.concern_tag_refs.includes(t.id)}
                              onChange={() => toggleTag(t.id)}
                            />
                            {t.label}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="sjp-note">{copy.memory.noConcernTags}</p>
                    )}
                  </div>

                  <div className="sjp-field sjp-field--full">
                    <label className="sjp-label" htmlFor="memory-use">{copy.memory.useForReading}</label>
                    <SjpSelect
                      id="memory-use"
                      value={draft.admissible_use}
                      onValueChange={(v) => setDraft({ ...draft, admissible_use: v as MemoryDraft['admissible_use'] })}
                      options={EVENT_MEMORY_ADMISSIBLE_USES.map((u) => ({ value: u, label: copy.memoryUseLabels[u] }))}
                    />
                  </div>

                  {errorCode ? (
                    <p className="sjp-alert" role="alert">
                      {copy.memory.saveFailed(errorCode)}
                    </p>
                  ) : null}

                  <div className="sjp-actions sjp-actions--drawer">
                    <Button
                      type="submit"
                      tone="primary"
                      disabled={draft.body.trim().length === 0}
                      leadingIcon={
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      }
                    >
                      {copy.memory.saveRecord}
                    </Button>
                    <Button type="button" tone="ghost" onClick={closeDrawer}>
                      {copy.common.cancel}
                    </Button>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}

      <ConfirmDialog
        open={confirmingDelete !== null}
        title={copy.memory.deleteTitle}
        message={confirmingDelete ? deleteMemoryMessage(confirmingDelete) : ''}
        confirmLabel={copy.common.delete}
        cancelLabel={copy.common.cancel}
        confirmTone="danger"
        onConfirm={confirmDelete}
        onClose={() => setConfirmingDelete(null)}
      />
    </section>
  );
}
