// Wave-8 — add / edit Person form. Reuses the wave-7 NatalInputs
// editor surface (via NatalInputsEditor) and the wave-0
// validateShiJingSpace gate before any snapshot/replace dispatch.

import { useEffect, useMemo, useReducer, useState, type FormEvent } from 'react';

import { useShijingStore } from '../state/shijing-store.tsx';
import { TextField, SelectField } from '../inputs/natal-inputs-fields.tsx';
import {
  createEmptyDraft,
  natalInputsDraftReducer,
  type NatalInputsDraft,
} from '../inputs/natal-inputs-state.ts';
import { validateDraft, userMessageForValidationError } from '../inputs/natal-inputs-validate.ts';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import type { Person } from '../../domain/person.ts';
import {
  CONSENT_STATE_OPTIONS,
  buildPersonFromDrafts,
  createEmptyPersonDraft,
  personDraftReducer,
  validatePersonDraft,
} from './person-form-state.ts';
import { NatalInputsEditor } from './natal-inputs-editor.tsx';
import { newPersonId } from './person-id.ts';

export interface PersonFormProps {
  readonly mode: 'create' | { kind: 'edit'; person: Person };
  readonly onClose: () => void;
}

export function PersonForm(props: PersonFormProps) {
  const { state, dispatch } = useShijingStore();
  const [personDraft, personDispatch] = useReducer(personDraftReducer, createEmptyPersonDraft());
  const [natalDraft, setNatalDraft] = useState<NatalInputsDraft>(createEmptyDraft);
  const [submission, setSubmission] = useState<
    | { kind: 'idle' }
    | { kind: 'invalid_person'; code: string }
    | { kind: 'invalid_natal'; code: string; message: string }
    | { kind: 'invalid_space'; code: string }
    | { kind: 'saved'; at: string }
  >({ kind: 'idle' });

  const initialNatal = useMemo(() => {
    return typeof props.mode === 'object' ? props.mode.person.natal_inputs : undefined;
  }, [props.mode]);

  useEffect(() => {
    personDispatch({ type: 'reset' });
    if (typeof props.mode === 'object') {
      personDispatch({ type: 'hydrate', person: props.mode.person });
    } else {
      personDispatch({ type: 'assign_id', id: newPersonId() });
    }
  }, [props.mode]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const personCheck = validatePersonDraft(personDraft);
    if (!personCheck.ok) {
      setSubmission({ kind: 'invalid_person', code: personCheck.error.code });
      return;
    }
    const natalOutcome = validateDraft(natalDraft);
    if (!natalOutcome.ok) {
      setSubmission({
        kind: 'invalid_natal',
        code: natalOutcome.error.code,
        message: userMessageForValidationError(natalOutcome.error),
      });
      return;
    }
    const person: Person = buildPersonFromDrafts(personDraft, natalOutcome.inputs);
    const persons = (() => {
      if (typeof props.mode === 'object') {
        return state.snapshot.persons.map((existing) => (existing.id === person.id ? person : existing));
      }
      return [...state.snapshot.persons, person];
    })();
    const nextSnapshot = { ...state.snapshot, persons };
    const spaceCheck = validateShiJingSpace(nextSnapshot);
    if (!spaceCheck.ok) {
      setSubmission({ kind: 'invalid_space', code: spaceCheck.error.code });
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: nextSnapshot });
    setSubmission({ kind: 'saved', at: new Date().toISOString() });
    props.onClose();
  }

  return (
    <form className="shijing-person-form" onSubmit={onSubmit} noValidate>
      <fieldset>
        <legend>{typeof props.mode === 'object' ? 'Edit Person' : 'Add Person'}</legend>
        <TextField
          id="person-display-name"
          label="display_name"
          value={personDraft.display_name}
          required
          onChange={(value) => personDispatch({ type: 'set_display_name', value })}
        />
        <TextField
          id="person-relation-hint"
          label="relation_hint"
          value={personDraft.relation_hint}
          onChange={(value) => personDispatch({ type: 'set_relation_hint', value })}
        />
        <SelectField
          id="person-consent-state"
          label="consent_state"
          value={personDraft.consent_state}
          options={CONSENT_STATE_OPTIONS}
          required
          emptyLabel="— (required, no implicit default)"
          onChange={(value) => personDispatch({ type: 'set_consent_state', value })}
        />
        <TextField
          id="person-subject-context"
          label="subject_context"
          value={personDraft.subject_context}
          onChange={(value) => personDispatch({ type: 'set_subject_context', value })}
        />
        <TextField
          id="person-notes"
          label="notes"
          value={personDraft.notes}
          onChange={(value) => personDispatch({ type: 'set_notes', value })}
        />
      </fieldset>
      <NatalInputsEditor
        initial={initialNatal}
        idPrefix="person-natal"
        onDraftChange={setNatalDraft}
      />
      <div className="shijing-form-actions">
        <button type="button" data-variant="ghost" onClick={props.onClose}>Cancel</button>
        <button type="submit">Save</button>
      </div>
      {submission.kind === 'invalid_person' ? (
        <p role="alert">Person field invalid: {submission.code}</p>
      ) : null}
      {submission.kind === 'invalid_natal' ? (
        <p role="alert">Natal inputs invalid: {submission.message} (code: {submission.code})</p>
      ) : null}
      {submission.kind === 'invalid_space' ? (
        <p role="alert">ShiJingSpace rejected the change: {submission.code}</p>
      ) : null}
      {submission.kind === 'saved' ? (
        <p role="status">Saved at {submission.at}.</p>
      ) : null}
    </form>
  );
}
