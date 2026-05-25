// SJG-DATA-05 — pure-TS Event draft state machine. Captures every
// Event field: primary_subject, participants[], occurred_at, title,
// view_refs[], optional recap + notes. The reducer keeps the
// participants set unique and excludes the primary_subject; the
// validate step rejects every required-missing case before the form
// hands the value to validateEvent + validateShiJingSpace.

import type { Event } from '../../domain/event.ts';
import type { SubjectRef } from '../../domain/subject-ref.ts';
import { subjectRefEquals } from '../../domain/subject-ref.ts';

export interface EventDraft {
  readonly id: string | null;
  readonly title: string;
  readonly occurred_at_utc: string;
  readonly primary_subject_key: string;
  readonly participant_keys: readonly string[];
  readonly view_ref_ids: readonly string[];
  readonly recap: string;
  readonly notes: string;
}

export type EventDraftAction =
  | { type: 'reset' }
  | { type: 'hydrate'; event: Event }
  | { type: 'assign_id'; id: string }
  | { type: 'set_title'; value: string }
  | { type: 'set_occurred_at_utc'; value: string }
  | { type: 'set_primary_subject_key'; value: string }
  | { type: 'toggle_participant_key'; value: string }
  | { type: 'toggle_view_ref_id'; value: string }
  | { type: 'set_recap'; value: string }
  | { type: 'set_notes'; value: string };

export function createEmptyEventDraft(): EventDraft {
  return {
    id: null,
    title: '',
    occurred_at_utc: '',
    primary_subject_key: '',
    participant_keys: [],
    view_ref_ids: [],
    recap: '',
    notes: '',
  };
}

function subjectKey(ref: SubjectRef): string {
  return ref === 'self' ? 'self' : `person:${ref.id}`;
}

function hydrateFromEvent(event: Event): EventDraft {
  return {
    id: event.id,
    title: event.title,
    occurred_at_utc: event.occurred_at,
    primary_subject_key: subjectKey(event.primary_subject),
    participant_keys: event.participants.map(subjectKey),
    view_ref_ids: [...event.view_refs],
    recap: event.recap ?? '',
    notes: event.notes ?? '',
  };
}

function dropDuplicatePrimary(state: EventDraft): EventDraft {
  if (state.primary_subject_key.length === 0) return state;
  if (!state.participant_keys.includes(state.primary_subject_key)) return state;
  return {
    ...state,
    participant_keys: state.participant_keys.filter((key) => key !== state.primary_subject_key),
  };
}

export function eventDraftReducer(state: EventDraft, action: EventDraftAction): EventDraft {
  switch (action.type) {
    case 'reset':
      return createEmptyEventDraft();
    case 'hydrate':
      return hydrateFromEvent(action.event);
    case 'assign_id':
      return { ...state, id: action.id };
    case 'set_title':
      return { ...state, title: action.value };
    case 'set_occurred_at_utc':
      return { ...state, occurred_at_utc: action.value };
    case 'set_primary_subject_key':
      return dropDuplicatePrimary({ ...state, primary_subject_key: action.value });
    case 'toggle_participant_key': {
      if (action.value === state.primary_subject_key) return state;
      const has = state.participant_keys.includes(action.value);
      const next = has
        ? state.participant_keys.filter((key) => key !== action.value)
        : [...state.participant_keys, action.value];
      return { ...state, participant_keys: next };
    }
    case 'toggle_view_ref_id': {
      const has = state.view_ref_ids.includes(action.value);
      const next = has
        ? state.view_ref_ids.filter((id) => id !== action.value)
        : [...state.view_ref_ids, action.value];
      return { ...state, view_ref_ids: next };
    }
    case 'set_recap':
      return { ...state, recap: action.value };
    case 'set_notes':
      return { ...state, notes: action.value };
    default: {
      const exhaustive: never = action;
      void exhaustive;
      return state;
    }
  }
}

export type EventDraftValidationError =
  | { code: 'event_id_missing' }
  | { code: 'event_title_empty' }
  | { code: 'event_occurred_at_missing' }
  | { code: 'event_occurred_at_not_iso_utc' }
  | { code: 'event_primary_subject_missing' };

export type EventDraftValidationOutcome =
  | { ok: true }
  | { ok: false; error: EventDraftValidationError };

function isIsoUtc(value: string): boolean {
  // ISO-8601 UTC instant ending in `Z`; Date.parse must succeed.
  if (!value.endsWith('Z')) return false;
  const ts = Date.parse(value);
  return Number.isFinite(ts);
}

export function validateEventDraft(draft: EventDraft): EventDraftValidationOutcome {
  if (!draft.id || draft.id.length === 0) return { ok: false, error: { code: 'event_id_missing' } };
  if (draft.title.trim().length === 0) return { ok: false, error: { code: 'event_title_empty' } };
  if (draft.occurred_at_utc.length === 0) {
    return { ok: false, error: { code: 'event_occurred_at_missing' } };
  }
  if (!isIsoUtc(draft.occurred_at_utc)) {
    return { ok: false, error: { code: 'event_occurred_at_not_iso_utc' } };
  }
  if (draft.primary_subject_key.length === 0) {
    return { ok: false, error: { code: 'event_primary_subject_missing' } };
  }
  return { ok: true };
}

export interface BuildEventFromDraftInputs {
  readonly primary_subject: SubjectRef;
  readonly participants: readonly SubjectRef[];
}

export function buildEventFromDraft(draft: EventDraft, refs: BuildEventFromDraftInputs): Event {
  if (!draft.id) throw new Error('Event.id must be assigned before building an Event');
  if (draft.occurred_at_utc.length === 0) {
    throw new Error('Event.occurred_at must be set before building an Event');
  }
  const participants = refs.participants.filter(
    (participant) => !subjectRefEquals(participant, refs.primary_subject),
  );
  const base: Event = {
    id: draft.id,
    primary_subject: refs.primary_subject,
    participants,
    occurred_at: draft.occurred_at_utc,
    title: draft.title,
    view_refs: [...draft.view_ref_ids],
    ...(draft.recap.length > 0 ? { recap: draft.recap } : {}),
    ...(draft.notes.length > 0 ? { notes: draft.notes } : {}),
  };
  return base;
}
