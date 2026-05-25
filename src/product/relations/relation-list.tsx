// SJG-DATA-04 — Relation list with add / edit / delete. Delete
// refuses when removing the Relation would leave a dangling reference
// (view.context_items[].body match); validateShiJingSpace re-runs as
// defense in depth.

import { useState } from 'react';

import { useShijingStore } from '../state/shijing-store.tsx';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import type { Relation } from '../../domain/relation.ts';
import { RelationForm } from './relation-form.tsx';
import { findReferencesToRelation, type RelationReference } from './relation-dangling-reference.ts';

type EditorMode = null | { kind: 'create' } | { kind: 'edit'; relation: Relation };

function describeRef(ref: Relation['from_subject']): string {
  return ref === 'self' ? 'self' : `person:${ref.id}`;
}

export function RelationList() {
  const { state, dispatch } = useShijingStore();
  const [editor, setEditor] = useState<EditorMode>(null);
  const [deletionError, setDeletionError] = useState<
    | { kind: 'idle' }
    | { kind: 'refused_dangling'; refs: readonly RelationReference[] }
    | { kind: 'refused_validator'; code: string }
  >({ kind: 'idle' });

  function onDelete(relation: Relation) {
    const refs = findReferencesToRelation(state.snapshot, relation.id);
    if (refs.length > 0) {
      setDeletionError({ kind: 'refused_dangling', refs });
      return;
    }
    const nextSnapshot = {
      ...state.snapshot,
      relations: state.snapshot.relations.filter((existing) => existing.id !== relation.id),
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
    <section className="shijing-relation-list" aria-label="ShiJing relations">
      <header>
        <h3>关系 Relations</h3>
        <button type="button" onClick={() => setEditor({ kind: 'create' })}>
          Add Relation
        </button>
      </header>
      {state.snapshot.relations.length === 0 ? (
        <p>No relations recorded yet.</p>
      ) : (
        <ul>
          {state.snapshot.relations.map((relation) => (
            <li key={relation.id}>
              <span>
                {describeRef(relation.from_subject)} → {describeRef(relation.to_subject)} ({relation.relation_kind})
              </span>
              <button type="button" onClick={() => setEditor({ kind: 'edit', relation })}>Edit</button>
              <button type="button" onClick={() => onDelete(relation)}>Delete</button>
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
          <RelationForm mode="create" onClose={() => setEditor(null)} />
        ) : (
          <RelationForm mode={{ kind: 'edit', relation: editor.relation }} onClose={() => setEditor(null)} />
        )
      ) : null}
    </section>
  );
}
