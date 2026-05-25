// Wave-8 — Person list with add / edit / delete affordances. Delete
// refuses when removing the Person would leave a dangling subject_ref
// elsewhere in the ShiJingSpace.

import { useState } from 'react';

import { useShijingStore } from '../state/shijing-store.tsx';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import type { Person } from '../../domain/person.ts';
import { PersonForm } from './person-form.tsx';
import { findReferencesToPerson, type DanglingReference } from './dangling-reference.ts';
import { BUTTONS, EMPTY_STATES, HEADINGS } from '../i18n/copy.ts';
import { enumLabel } from '../i18n/enum-label.ts';
import { formatDanglingRefusal, formatDeleteValidatorRefusal } from '../i18n/format-failure.ts';
import { TechnicalDetails } from '../components/technical-details.tsx';

export function PersonList() {
  const { state, dispatch } = useShijingStore();
  const [editor, setEditor] = useState<null | { kind: 'create' } | { kind: 'edit'; person: Person }>(null);
  const [deletionError, setDeletionError] = useState<
    | { kind: 'idle' }
    | { kind: 'refused_dangling'; refs: readonly DanglingReference[] }
    | { kind: 'refused_validator'; code: string }
  >({ kind: 'idle' });

  function onDelete(person: Person) {
    const refs = findReferencesToPerson(state.snapshot, person.id);
    if (refs.length > 0) {
      setDeletionError({ kind: 'refused_dangling', refs });
      return;
    }
    const nextSnapshot = {
      ...state.snapshot,
      persons: state.snapshot.persons.filter((existing) => existing.id !== person.id),
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
    <section className="shijing-person-list" aria-label="人物列表">
      <header>
        <h3>{HEADINGS.persons}</h3>
        <button type="button" onClick={() => setEditor({ kind: 'create' })}>
          {BUTTONS.add_person}
        </button>
      </header>
      {state.snapshot.persons.length === 0 ? (
        <p>{EMPTY_STATES.persons}</p>
      ) : (
        <ul>
          {state.snapshot.persons.map((person) => (
            <li key={person.id}>
              <span>{person.display_name}</span>
              <small>（同意状态：{enumLabel('consent_state', person.consent_state)}）</small>
              <button type="button" onClick={() => setEditor({ kind: 'edit', person })}>{BUTTONS.edit}</button>
              <button type="button" onClick={() => onDelete(person)}>{BUTTONS.delete}</button>
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
          <PersonForm mode="create" onClose={() => setEditor(null)} />
        ) : (
          <PersonForm mode={{ kind: 'edit', person: editor.person }} onClose={() => setEditor(null)} />
        )
      ) : null}
    </section>
  );
}
