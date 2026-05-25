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

type EditorMode = null | { kind: 'create' } | { kind: 'edit'; event: Event };

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
    <section className="shijing-event-list" aria-label="ShiJing events">
      <header>
        <h3>事件 Events</h3>
        <button type="button" onClick={() => setEditor({ kind: 'create' })}>
          Add Event
        </button>
      </header>
      {state.snapshot.events.length === 0 ? (
        <p>No events recorded yet.</p>
      ) : (
        <ul>
          {state.snapshot.events.map((event) => (
            <li key={event.id}>
              <span>{event.title}</span>
              <small> (occurred_at: {event.occurred_at}, view_refs: {event.view_refs.length})</small>
              <button type="button" onClick={() => setEditor({ kind: 'edit', event })}>Edit</button>
              <button type="button" onClick={() => onDelete(event)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
      {deletionError.kind === 'refused_dangling' ? (
        <p role="alert">
          Delete refused: {deletionError.refs.length} dangling reference(s) — first via {deletionError.refs[0]!.via}.
          Re-point or remove the referencing entries first.
        </p>
      ) : null}
      {deletionError.kind === 'refused_validator' ? (
        <p role="alert">Delete refused by space validator: {deletionError.code}</p>
      ) : null}
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
