// Wave-9 — View list with add / edit / delete. Delete refuses when a
// dangling event.view_refs / reading.view_id / conversation.view_id
// would remain; validateShiJingSpace re-runs as defense in depth.

import { useState } from 'react';

import { useShijingStore } from '../state/shijing-store.tsx';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import type { View } from '../../domain/view.ts';
import { ViewForm } from './view-form.tsx';
import { findReferencesToView, type ViewReference } from './view-dangling-reference.ts';
import { BUTTONS, EMPTY_STATES, HEADINGS } from '../i18n/copy.ts';
import { enumLabel } from '../i18n/enum-label.ts';
import { formatDanglingRefusal, formatDeleteValidatorRefusal } from '../i18n/format-failure.ts';
import { TechnicalDetails } from '../components/technical-details.tsx';

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
    <section className="shijing-view-list" aria-label="观察视角列表">
      <header>
        <h3>{HEADINGS.views}</h3>
        <button type="button" onClick={() => setEditor({ kind: 'create' })}>
          {BUTTONS.add_view}
        </button>
      </header>
      {state.snapshot.views.length === 0 ? (
        <p>{EMPTY_STATES.views}</p>
      ) : (
        <ul>
          {state.snapshot.views.map((view) => (
            <li key={view.id}>
              <span>{view.title}</span>
              <small>
                （{enumLabel('time_scope', view.time_scope)} · {enumLabel('display_state', view.display_state)}）
              </small>
              <button type="button" onClick={() => setEditor({ kind: 'edit', view })}>{BUTTONS.edit}</button>
              <button type="button" onClick={() => onDelete(view)}>{BUTTONS.delete}</button>
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
          <ViewForm mode="create" onClose={() => setEditor(null)} />
        ) : (
          <ViewForm mode={{ kind: 'edit', view: editor.view }} onClose={() => setEditor(null)} />
        )
      ) : null}
    </section>
  );
}
