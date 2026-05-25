// SJG-DATA-05 — add/edit Event form. Binds primary_subject and
// participants to the actual subject roster (no manual id typing) and
// binds view_refs to the actual view list. validateEventDraft +
// validateEvent + validateShiJingSpace gate every dispatch.

import { useEffect, useMemo, useReducer, useState, type FormEvent } from 'react';

import { useShijingStore } from '../state/shijing-store.tsx';
import { SelectField, TextField } from '../inputs/natal-inputs-fields.tsx';
import { validateEvent } from '../../contracts/event-validator.ts';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import type { Event } from '../../domain/event.ts';
import {
  buildEventFromDraft,
  createEmptyEventDraft,
  eventDraftReducer,
  validateEventDraft,
} from './event-form-state.ts';
import { buildSubjectRoster, findRosterEntry, type SubjectRosterEntry } from '../views/subject-roster.ts';
import { newEventId } from './event-id.ts';

export interface EventFormProps {
  readonly mode: 'create' | { kind: 'edit'; event: Event };
  readonly onClose: () => void;
}

export function EventForm(props: EventFormProps) {
  const { state, dispatch } = useShijingStore();
  const [draft, draftDispatch] = useReducer(eventDraftReducer, createEmptyEventDraft());
  const [submission, setSubmission] = useState<
    | { kind: 'idle' }
    | { kind: 'invalid_draft'; code: string }
    | { kind: 'invalid_event'; code: string }
    | { kind: 'invalid_space'; code: string }
    | { kind: 'saved'; at: string }
  >({ kind: 'idle' });

  const roster = useMemo<readonly SubjectRosterEntry[]>(
    () => buildSubjectRoster(state.snapshot),
    [state.snapshot],
  );

  useEffect(() => {
    draftDispatch({ type: 'reset' });
    if (typeof props.mode === 'object') {
      draftDispatch({ type: 'hydrate', event: props.mode.event });
    } else {
      draftDispatch({ type: 'assign_id', id: newEventId() });
    }
  }, [props.mode]);

  function onSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const draftCheck = validateEventDraft(draft);
    if (!draftCheck.ok) {
      setSubmission({ kind: 'invalid_draft', code: draftCheck.error.code });
      return;
    }
    const primaryEntry = findRosterEntry(roster, draft.primary_subject_key);
    if (!primaryEntry) {
      setSubmission({ kind: 'invalid_draft', code: 'event_primary_subject_missing' });
      return;
    }
    const participants = draft.participant_keys
      .map((key) => findRosterEntry(roster, key))
      .filter((entry): entry is SubjectRosterEntry => Boolean(entry))
      .map((entry) => entry.ref);
    const event = buildEventFromDraft(draft, { primary_subject: primaryEntry.ref, participants });
    const eventCheck = validateEvent(event);
    if (!eventCheck.ok) {
      setSubmission({ kind: 'invalid_event', code: eventCheck.error.code });
      return;
    }
    const events = (() => {
      if (typeof props.mode === 'object') {
        return state.snapshot.events.map((existing) => (existing.id === event.id ? event : existing));
      }
      return [...state.snapshot.events, event];
    })();
    const nextSnapshot = { ...state.snapshot, events };
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
    <form className="shijing-event-form" onSubmit={onSubmit} noValidate>
      <fieldset>
        <legend>{typeof props.mode === 'object' ? 'Edit Event' : 'Add Event'}</legend>
        <TextField
          id="event-title"
          label="title"
          value={draft.title}
          required
          onChange={(value) => draftDispatch({ type: 'set_title', value })}
        />
        <TextField
          id="event-occurred-at"
          label="occurred_at (ISO-8601 UTC)"
          value={draft.occurred_at_utc}
          required
          onChange={(value) => draftDispatch({ type: 'set_occurred_at_utc', value })}
        />
        <SelectField
          id="event-primary-subject"
          label="primary_subject"
          value={draft.primary_subject_key}
          options={roster.map((entry) => entry.key)}
          required
          emptyLabel="— (required, no implicit default)"
          onChange={(value) => draftDispatch({ type: 'set_primary_subject_key', value })}
        />
        <fieldset>
          <legend>participants[] (primary_subject auto-excluded)</legend>
          {roster.map((entry) => (
            <label key={entry.key} className="shijing-input-field">
              <input
                type="checkbox"
                checked={draft.participant_keys.includes(entry.key)}
                disabled={entry.key === draft.primary_subject_key}
                onChange={() => draftDispatch({ type: 'toggle_participant_key', value: entry.key })}
              />
              <span>{entry.label}</span>
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>view_refs[]</legend>
          {state.snapshot.views.length === 0 ? (
            <p>No views available to reference.</p>
          ) : (
            state.snapshot.views.map((view) => (
              <label key={view.id} className="shijing-input-field">
                <input
                  type="checkbox"
                  checked={draft.view_ref_ids.includes(view.id)}
                  onChange={() => draftDispatch({ type: 'toggle_view_ref_id', value: view.id })}
                />
                <span>{view.title} (view:{view.id})</span>
              </label>
            ))
          )}
        </fieldset>
        <TextField
          id="event-recap"
          label="recap"
          value={draft.recap}
          onChange={(value) => draftDispatch({ type: 'set_recap', value })}
        />
        <TextField
          id="event-notes"
          label="notes"
          value={draft.notes}
          onChange={(value) => draftDispatch({ type: 'set_notes', value })}
        />
      </fieldset>
      <div className="shijing-form-actions">
        <button type="button" data-variant="ghost" onClick={props.onClose}>Cancel</button>
        <button type="submit">Save</button>
      </div>
      {submission.kind === 'invalid_draft' ? (
        <p role="alert">Event draft invalid: {submission.code}</p>
      ) : null}
      {submission.kind === 'invalid_event' ? (
        <p role="alert">validateEvent refused: {submission.code}</p>
      ) : null}
      {submission.kind === 'invalid_space' ? (
        <p role="alert">validateShiJingSpace refused: {submission.code}</p>
      ) : null}
      {submission.kind === 'saved' ? (
        <p role="status">Saved at {submission.at}.</p>
      ) : null}
    </form>
  );
}
