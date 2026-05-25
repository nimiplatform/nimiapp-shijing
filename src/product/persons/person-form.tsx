// Wave-8 — add / edit Person form. Reuses the wave-7 NatalInputs
// editor surface (via NatalInputsEditor) and the wave-0
// validateShiJingSpace gate before any snapshot/replace dispatch.

import { useEffect, useMemo, useReducer, useState, type FormEvent } from 'react';

import { useShijingStore } from '../state/shijing-store.tsx';
import { TextField, SelectField } from '../inputs/natal-inputs-fields.tsx';
import {
  createEmptyDraft,
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
import { BUTTONS, FAILURE_HEADLINES, FIELD_LABELS, HEADINGS, SELECT_REQUIRED_PLACEHOLDER } from '../i18n/copy.ts';
import { enumLabel } from '../i18n/enum-label.ts';
import { formatSaveRefusal } from '../i18n/format-failure.ts';
import { TechnicalDetails } from '../components/technical-details.tsx';

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
        <legend>{typeof props.mode === 'object' ? HEADINGS.edit_person : HEADINGS.add_person}</legend>
        <TextField
          id="person-display-name"
          label={FIELD_LABELS.display_name}
          value={personDraft.display_name}
          required
          onChange={(value) => personDispatch({ type: 'set_display_name', value })}
        />
        <TextField
          id="person-relation-hint"
          label={FIELD_LABELS.relation_hint}
          value={personDraft.relation_hint}
          onChange={(value) => personDispatch({ type: 'set_relation_hint', value })}
        />
        <SelectField
          id="person-consent-state"
          label={FIELD_LABELS.consent_state}
          value={personDraft.consent_state}
          options={CONSENT_STATE_OPTIONS}
          optionLabel={(v) => enumLabel('consent_state', v)}
          required
          emptyLabel={SELECT_REQUIRED_PLACEHOLDER}
          onChange={(value) => personDispatch({ type: 'set_consent_state', value })}
        />
        <TextField
          id="person-subject-context"
          label={FIELD_LABELS.subject_context}
          value={personDraft.subject_context}
          onChange={(value) => personDispatch({ type: 'set_subject_context', value })}
        />
        <TextField
          id="person-notes"
          label={FIELD_LABELS.notes}
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
        <button type="button" data-variant="ghost" onClick={props.onClose}>{BUTTONS.cancel}</button>
        <button type="submit">{BUTTONS.save}</button>
      </div>
      {submission.kind === 'invalid_person' ? (
        <>
          <p role="alert">{FAILURE_HEADLINES.person_invalid}</p>
          <TechnicalDetails content={submission.code} />
        </>
      ) : null}
      {submission.kind === 'invalid_natal' ? (
        <>
          <p role="alert">{FAILURE_HEADLINES.natal_invalid} {submission.message}</p>
          <TechnicalDetails content={submission.code} />
        </>
      ) : null}
      {submission.kind === 'invalid_space' ? (() => {
        const formatted = formatSaveRefusal(submission.code);
        return (
          <>
            <p role="alert">{formatted.headline}</p>
            <TechnicalDetails content={formatted.technical} />
          </>
        );
      })() : null}
      {submission.kind === 'saved' ? (
        <p role="status">已保存。</p>
      ) : null}
    </form>
  );
}
