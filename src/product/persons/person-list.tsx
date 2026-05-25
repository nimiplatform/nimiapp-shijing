// Wave-8 — Person list with add / edit / delete affordances. Delete
// refuses when removing the Person would leave a dangling subject_ref
// elsewhere in the ShiJingSpace.

import { useState } from 'react';

import { useShijingStore } from '../state/shijing-store.tsx';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import type { Person } from '../../domain/person.ts';
import { PersonForm } from './person-form.tsx';
import { findReferencesToPerson, type DanglingReference } from './dangling-reference.ts';

type EditorMode = null | { kind: 'create' } | { kind: 'edit'; person: Person };

export function PersonList() {
  const { state, dispatch } = useShijingStore();
  const [editor, setEditor] = useState<EditorMode>(null);
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
    <section className="shijing-person-list" aria-label="ShiJing persons">
      <header>
        <h3>Persons</h3>
        <button type="button" onClick={() => setEditor({ kind: 'create' })}>
          Add Person
        </button>
      </header>
      {state.snapshot.persons.length === 0 ? (
        <p>No persons recorded yet.</p>
      ) : (
        <ul>
          {state.snapshot.persons.map((person) => (
            <li key={person.id}>
              <span>{person.display_name}</span>
              <small> (consent: {person.consent_state})</small>
              <button type="button" onClick={() => setEditor({ kind: 'edit', person })}>Edit</button>
              <button type="button" onClick={() => onDelete(person)}>Delete</button>
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
          <PersonForm mode="create" onClose={() => setEditor(null)} />
        ) : (
          <PersonForm mode={{ kind: 'edit', person: editor.person }} onClose={() => setEditor(null)} />
        )
      ) : null}
    </section>
  );
}
