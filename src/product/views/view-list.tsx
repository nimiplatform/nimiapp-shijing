// Wave-9 — View list with add / edit / delete. Delete refuses when a
// dangling event.view_refs / reading.view_id / conversation.view_id
// would remain; validateShiJingSpace re-runs as defense in depth.

import { useState } from 'react';

import { useShijingStore } from '../state/shijing-store.tsx';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import type { View } from '../../domain/view.ts';
import { ViewForm } from './view-form.tsx';
import { findReferencesToView, type ViewReference } from './view-dangling-reference.ts';

type EditorMode = null | { kind: 'create' } | { kind: 'edit'; view: View };

export function ViewList() {
  const { state, dispatch } = useShijingStore();
  const [editor, setEditor] = useState<EditorMode>(null);
  const [deletionError, setDeletionError] = useState<
    | { kind: 'idle' }
    | { kind: 'refused_dangling'; refs: readonly ViewReference[] }
    | { kind: 'refused_validator'; code: string }
  >({ kind: 'idle' });

  function onDelete(view: View) {
    const refs = findReferencesToView(state.snapshot, view.id);
    if (refs.length > 0) {
      setDeletionError({ kind: 'refused_dangling', refs });
      return;
    }
    const nextSnapshot = {
      ...state.snapshot,
      views: state.snapshot.views.filter((existing) => existing.id !== view.id),
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
    <section className="shijing-view-list" aria-label="ShiJing views">
      <header>
        <h3>Views</h3>
        <button type="button" onClick={() => setEditor({ kind: 'create' })}>
          Add View
        </button>
      </header>
      {state.snapshot.views.length === 0 ? (
        <p>No views recorded yet.</p>
      ) : (
        <ul>
          {state.snapshot.views.map((view) => (
            <li key={view.id}>
              <span>{view.title}</span>
              <small>
                {' '}
                (time_scope: {view.time_scope}, display_state: {view.display_state})
              </small>
              <button type="button" onClick={() => setEditor({ kind: 'edit', view })}>Edit</button>
              <button type="button" onClick={() => onDelete(view)}>Delete</button>
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
          <ViewForm mode="create" onClose={() => setEditor(null)} />
        ) : (
          <ViewForm mode={{ kind: 'edit', view: editor.view }} onClose={() => setEditor(null)} />
        )
      ) : null}
    </section>
  );
}
