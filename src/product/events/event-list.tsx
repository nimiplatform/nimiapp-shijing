// SJG-DATA-05 — Event list with add / edit / delete. Delete refuses
// when removing the Event would leave a dangling reference
// (view.context_items[].body or conversation.turns[].body match);
// validateShiJingSpace re-runs as defense in depth.

import { useState } from 'react';

import { useShijingStore } from '../state/shijing-store.tsx';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import type { Event } from '../../domain/event.ts';
import { EventForm } from './event-form.tsx';
import { findReferencesToEvent, type EventReference } from './event-dangling-reference.ts';
import { BUTTONS, EMPTY_STATES, HEADINGS } from '../i18n/copy.ts';
import { formatDanglingRefusal, formatDeleteValidatorRefusal } from '../i18n/format-failure.ts';
import { TechnicalDetails } from '../components/technical-details.tsx';

type EditorMode = null | { kind: 'create' } | { kind: 'edit'; event: Event };

function formatOccurredAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function EventList() {
  const { state, dispatch } = useShijingStore();
  const [editor, setEditor] = useState<EditorMode>(null);
  const [deletionError, setDeletionError] = useState<
    | { kind: 'idle' }
    | { kind: 'refused_dangling'; refs: readonly EventReference[] }
    | { kind: 'refused_validator'; code: string }
  >({ kind: 'idle' });

  function onDelete(event: Event) {
    const refs = findReferencesToEvent(state.snapshot, event.id);
    if (refs.length > 0) {
      setDeletionError({ kind: 'refused_dangling', refs });
      return;
    }
    const nextSnapshot = {
      ...state.snapshot,
      events: state.snapshot.events.filter((existing) => existing.id !== event.id),
    };
    const check = validateShiJingSpace(nextSnapshot);
    if (!check.ok) {
      setDeletionError({ kind: 'refused_validator', code: check.error.code });
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: nextSnapshot });
    setDeletionError({ kind: 'idle' });
  }

  return (
    <section className="shijing-event-list" aria-label="事件列表">
      <header>
        <h3>{HEADINGS.events}</h3>
        <button type="button" onClick={() => setEditor({ kind: 'create' })}>
          {BUTTONS.add_event}
        </button>
      </header>
      {state.snapshot.events.length === 0 ? (
        <p>{EMPTY_STATES.events}</p>
      ) : (
        <ul>
          {state.snapshot.events.map((event) => (
            <li key={event.id}>
              <span>{event.title}</span>
              <small>（发生于 {formatOccurredAt(event.occurred_at)} · 关联 {event.view_refs.length} 个关注）</small>
              <button type="button" onClick={() => setEditor({ kind: 'edit', event })}>{BUTTONS.edit}</button>
              <button type="button" onClick={() => onDelete(event)}>{BUTTONS.delete}</button>
            </li>
          ))}
        </ul>
      )}
      {deletionError.kind === 'refused_dangling' ? (() => {
        const first = deletionError.refs[0]!;
        const formatted = formatDanglingRefusal(deletionError.refs.length, first.via);
        return (
          <>
            <p role="alert">{formatted.headline}</p>
            <TechnicalDetails content={formatted.technical} />
          </>
        );
      })() : null}
      {deletionError.kind === 'refused_validator' ? (() => {
        const formatted = formatDeleteValidatorRefusal(deletionError.code);
        return (
          <>
            <p role="alert">{formatted.headline}</p>
            <TechnicalDetails content={formatted.technical} />
          </>
        );
      })() : null}
      {editor !== null ? (
        editor.kind === 'create' ? (
          <EventForm mode="create" onClose={() => setEditor(null)} />
        ) : (
          <EventForm mode={{ kind: 'edit', event: editor.event }} onClose={() => setEditor(null)} />
        )
      ) : null}
    </section>
  );
}
