// Wave-7 — typed NatalInputs editor mounted inside the Me tab. The
// form gathers field input via the pure-TS reducer
// (`natal-inputs-state.ts`), validates via the wave-4
// `validateNatalInputs` gate (`natal-inputs-validate.ts`), and on
// success dispatches `snapshot/replace` so the wave-5
// persistence-bridge debounces a save through IndexedDB.

import { useEffect, useMemo, useReducer, useState, type FormEvent } from 'react';

import { useShijingStore } from '../state/shijing-store.tsx';
import {
  BIRTH_PRECISION_OPTIONS,
  CALCULATION_SEX_OPTIONS,
  CALENDAR_OPTIONS,
  CULTURAL_MARKER_OPTIONS,
  LeapMonthCheckbox,
  SelectField,
  TextField,
} from './natal-inputs-fields.tsx';
import {
  createEmptyDraft,
  natalInputsDraftReducer,
} from './natal-inputs-state.ts';
import { userMessageForValidationError, validateDraft } from './natal-inputs-validate.ts';

export function NatalInputsForm() {
  const { state, dispatch } = useShijingStore();
  const initialDraft = useMemo(() => createEmptyDraft(), []);
  const [draft, draftDispatch] = useReducer(natalInputsDraftReducer, initialDraft);
  const [submission, setSubmission] = useState<
    | { kind: 'idle' }
    | { kind: 'invalid'; message: string; code: string }
    | { kind: 'saved'; at: string }
  >({ kind: 'idle' });

  useEffect(() => {
    draftDispatch({ type: 'hydrate_from_natal_inputs', value: state.snapshot.self_subject.natal_inputs });
  }, [state.snapshot.self_subject.natal_inputs]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const outcome = validateDraft(draft);
    if (!outcome.ok) {
      setSubmission({
        kind: 'invalid',
        message: userMessageForValidationError(outcome.error),
        code: outcome.error.code,
      });
      return;
    }
    const nextSnapshot = {
      ...state.snapshot,
      self_subject: { ...state.snapshot.self_subject, natal_inputs: outcome.inputs },
    };
    dispatch({ type: 'snapshot/replace', snapshot: nextSnapshot });
    setSubmission({ kind: 'saved', at: new Date().toISOString() });
  }

  return (
    <form className="shijing-natal-inputs-form" onSubmit={onSubmit} noValidate>
      <fieldset>
        <legend>Birth evidence (RawBirthInput)</legend>
        <SelectField
          id="natal-inputs-calendar-system"
          label="calendar_system"
          value={draft.calendar_system}
          options={CALENDAR_OPTIONS}
          required
          onChange={(value) => draftDispatch({ type: 'set_calendar_system', value })}
        />
        <TextField
          id="natal-inputs-raw-local-date-text"
          label="local_date_text"
          value={draft.raw_local_date_text}
          required
          placeholder="user-typed local date as recorded"
          onChange={(value) => draftDispatch({ type: 'set_raw_local_date_text', value })}
        />
        <TextField
          id="natal-inputs-raw-local-time-text"
          label="local_time_text"
          value={draft.raw_local_time_text}
          onChange={(value) => draftDispatch({ type: 'set_raw_local_time_text', value })}
        />
        <TextField
          id="natal-inputs-raw-place-text"
          label="place_text"
          value={draft.raw_place_text}
          onChange={(value) => draftDispatch({ type: 'set_raw_place_text', value })}
        />
        {draft.calendar_system === 'lunar_chinese' ? (
          <>
            <TextField
              id="natal-inputs-raw-lunar-year"
              label="lunar_year"
              value={draft.raw_lunar_year}
              required
              onChange={(value) => draftDispatch({ type: 'set_raw_lunar_year', value })}
            />
            <TextField
              id="natal-inputs-raw-lunar-month"
              label="lunar_month"
              value={draft.raw_lunar_month}
              required
              onChange={(value) => draftDispatch({ type: 'set_raw_lunar_month', value })}
            />
            <TextField
              id="natal-inputs-raw-lunar-day"
              label="lunar_day"
              value={draft.raw_lunar_day}
              required
              onChange={(value) => draftDispatch({ type: 'set_raw_lunar_day', value })}
            />
            <LeapMonthCheckbox
              id="natal-inputs-raw-lunar-is-leap-month"
              value={draft.raw_lunar_is_leap_month}
              onChange={(value) => draftDispatch({ type: 'set_raw_lunar_is_leap_month', value })}
            />
          </>
        ) : null}
      </fieldset>

      <fieldset>
        <legend>Canonical birth (NatalInputs)</legend>
        <TextField
          id="natal-inputs-birth-datetime-utc"
          label="birth_datetime_utc"
          value={draft.birth_datetime_utc}
          required
          placeholder="ISO-8601 UTC instant"
          onChange={(value) => draftDispatch({ type: 'set_birth_datetime_utc', value })}
        />
        <SelectField
          id="natal-inputs-birth-precision"
          label="birth_precision"
          value={draft.birth_precision}
          options={BIRTH_PRECISION_OPTIONS}
          required
          onChange={(value) => draftDispatch({ type: 'set_birth_precision', value })}
        />
        <SelectField
          id="natal-inputs-calculation-sex"
          label="calculation_sex"
          value={draft.calculation_sex}
          options={CALCULATION_SEX_OPTIONS}
          required
          onChange={(value) => draftDispatch({ type: 'set_calculation_sex', value })}
        />
        <SelectField
          id="natal-inputs-cultural-marker"
          label="cultural_marker"
          value={draft.cultural_marker}
          options={CULTURAL_MARKER_OPTIONS}
          emptyLabel="(unspecified)"
          onChange={(value) => draftDispatch({ type: 'set_cultural_marker', value })}
        />
      </fieldset>

      <fieldset>
        <legend>Birth location (BirthLocation)</legend>
        <TextField
          id="natal-inputs-latitude"
          label="latitude"
          value={draft.latitude_text}
          required
          placeholder="-90..90 inclusive"
          onChange={(value) => draftDispatch({ type: 'set_latitude_text', value })}
        />
        <TextField
          id="natal-inputs-longitude"
          label="longitude"
          value={draft.longitude_text}
          required
          placeholder="-180..180 inclusive"
          onChange={(value) => draftDispatch({ type: 'set_longitude_text', value })}
        />
        <TextField
          id="natal-inputs-iana-time-zone"
          label="iana_time_zone"
          value={draft.iana_time_zone}
          required
          placeholder="IANA timezone id"
          onChange={(value) => draftDispatch({ type: 'set_iana_time_zone', value })}
        />
        <TextField
          id="natal-inputs-place-name"
          label="place_name"
          value={draft.place_name}
          onChange={(value) => draftDispatch({ type: 'set_place_name', value })}
        />
      </fieldset>

      <fieldset>
        <legend>Notes</legend>
        <TextField
          id="natal-inputs-notes"
          label="notes"
          value={draft.notes}
          onChange={(value) => draftDispatch({ type: 'set_notes', value })}
        />
      </fieldset>

      <button type="submit">Save self_subject NatalInputs</button>

      {submission.kind === 'invalid' ? (
        <p role="alert" className="shijing-natal-inputs-form__error">
          {submission.message} (code: {submission.code})
        </p>
      ) : null}
      {submission.kind === 'saved' ? (
        <p role="status" className="shijing-natal-inputs-form__status">
          Saved at {submission.at} (debounced persistence will follow).
        </p>
      ) : null}
    </form>
  );
}
