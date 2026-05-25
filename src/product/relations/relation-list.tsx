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
import { BUTTONS, EMPTY_STATES, HEADINGS } from '../i18n/copy.ts';
import { subjectDisplayName } from '../i18n/subject-display-name.ts';
import { formatDanglingRefusal, formatDeleteValidatorRefusal } from '../i18n/format-failure.ts';
import { TechnicalDetails } from '../components/technical-details.tsx';

type EditorMode = null | { kind: 'create' } | { kind: 'edit'; relation: Relation };

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
    <section className="shijing-relation-list" aria-label="人物关系列表">
      <header>
        <h3>{HEADINGS.relations}</h3>
        <button type="button" onClick={() => setEditor({ kind: 'create' })}>
          {BUTTONS.add_relation}
        </button>
      </header>
      {state.snapshot.relations.length === 0 ? (
        <p>{EMPTY_STATES.relations}</p>
      ) : (
        <ul>
          {state.snapshot.relations.map((relation) => (
            <li key={relation.id}>
              <span>
                {subjectDisplayName(relation.from_subject, state.snapshot)}
                {' → '}
                {subjectDisplayName(relation.to_subject, state.snapshot)}
                {'（'}{relation.relation_kind}{'）'}
              </span>
              <button type="button" onClick={() => setEditor({ kind: 'edit', relation })}>{BUTTONS.edit}</button>
              <button type="button" onClick={() => onDelete(relation)}>{BUTTONS.delete}</button>
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
          <RelationForm mode="create" onClose={() => setEditor(null)} />
        ) : (
          <RelationForm mode={{ kind: 'edit', relation: editor.relation }} onClose={() => setEditor(null)} />
        )
      ) : null}
    </section>
  );
}
