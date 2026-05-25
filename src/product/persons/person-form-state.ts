// Wave-8 — pure-TS Person draft state machine. Captures Person fields
// beyond NatalInputs (display_name, relation_hint, consent_state,
// subject_context, notes). NatalInputs sub-state is held by the
// wave-7 NatalInputsDraft reducer.

import { CONSENT_STATES, type ConsentState, type Person } from '../../domain/person.ts';

export const CONSENT_STATE_OPTIONS = CONSENT_STATES;

export interface PersonDraft {
  readonly id: string | null;
  readonly display_name: string;
  readonly relation_hint: string;
  readonly consent_state: ConsentState | '';
  readonly subject_context: string;
  readonly notes: string;
}

export type PersonDraftAction =
  | { type: 'reset' }
  | { type: 'hydrate'; person: Person }
  | { type: 'assign_id'; id: string }
  | { type: 'set_display_name'; value: string }
  | { type: 'set_relation_hint'; value: string }
  | { type: 'set_consent_state'; value: ConsentState | '' }
  | { type: 'set_subject_context'; value: string }
  | { type: 'set_notes'; value: string };

export function createEmptyPersonDraft(): PersonDraft {
  return {
    id: null,
    display_name: '',
    relation_hint: '',
    consent_state: '',
    subject_context: '',
    notes: '',
  };
}

export function personDraftReducer(state: PersonDraft, action: PersonDraftAction): PersonDraft {
  switch (action.type) {
    case 'reset':
      return createEmptyPersonDraft();
    case 'hydrate':
      return {
        id: action.person.id,
        display_name: action.person.display_name,
        relation_hint: action.person.relation_hint ?? '',
        consent_state: action.person.consent_state,
        subject_context: action.person.subject_context ?? '',
        notes: action.person.notes ?? '',
      };
    case 'assign_id':
      return { ...state, id: action.id };
    case 'set_display_name':
      return { ...state, display_name: action.value };
    case 'set_relation_hint':
      return { ...state, relation_hint: action.value };
    case 'set_consent_state':
      return { ...state, consent_state: action.value };
    case 'set_subject_context':
      return { ...state, subject_context: action.value };
    case 'set_notes':
      return { ...state, notes: action.value };
    default: {
      const exhaustive: never = action;
      void exhaustive;
      return state;
    }
  }
}

export type PersonDraftValidationError =
  | { code: 'person_id_missing' }
  | { code: 'person_display_name_empty' }
  | { code: 'person_consent_state_unspecified' };

export type PersonDraftValidationOutcome =
  | { ok: true }
  | { ok: false; error: PersonDraftValidationError };

export function validatePersonDraft(draft: PersonDraft): PersonDraftValidationOutcome {
  if (!draft.id || draft.id.length === 0) {
    return { ok: false, error: { code: 'person_id_missing' } };
  }
  if (draft.display_name.trim().length === 0) {
    return { ok: false, error: { code: 'person_display_name_empty' } };
  }
  if (draft.consent_state === '') {
    return { ok: false, error: { code: 'person_consent_state_unspecified' } };
  }
  return { ok: true };
}

export function buildPersonFromDrafts(
  draft: PersonDraft,
  natalInputs: Person['natal_inputs'],
): Person {
  if (!draft.id) {
    throw new Error('Person.id must be assigned before building a Person');
  }
  if (draft.consent_state === '') {
    throw new Error('Person.consent_state must be chosen before building a Person');
  }
  return {
    id: draft.id,
    display_name: draft.display_name,
    kind: 'person',
    natal_inputs: natalInputs,
    consent_state: draft.consent_state,
    ...(draft.relation_hint.length > 0 ? { relation_hint: draft.relation_hint } : {}),
    ...(draft.subject_context.length > 0 ? { subject_context: draft.subject_context } : {}),
    ...(draft.notes.length > 0 ? { notes: draft.notes } : {}),
  };
}
