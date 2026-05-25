// Wave-8 — controlled NatalInputs editor for Person forms. Wraps the
// wave-7 reducer + dumb fields without coupling to the store. The
// parent Person form holds the NatalInputsDraft state and consumes
// validateDraft to gate submission.

import { useReducer, useEffect, type Dispatch } from 'react';

import {
  BIRTH_PRECISION_OPTIONS,
  CALCULATION_SEX_OPTIONS,
  CALENDAR_OPTIONS,
  CULTURAL_MARKER_OPTIONS,
  LeapMonthCheckbox,
  SelectField,
  TextField,
} from '../inputs/natal-inputs-fields.tsx';
import {
  createEmptyDraft,
  natalInputsDraftReducer,
  type NatalInputsDraft,
  type NatalInputsDraftAction,
} from '../inputs/natal-inputs-state.ts';
import type { NatalInputs } from '../../domain/person.ts';

export interface NatalInputsEditorProps {
  readonly initial?: NatalInputs;
  readonly onDraftChange?: (draft: NatalInputsDraft) => void;
  readonly idPrefix: string;
}

export function NatalInputsEditor(props: NatalInputsEditorProps) {
  const [draft, dispatch] = useReducer(natalInputsDraftReducer, createEmptyDraft());

  useEffect(() => {
    if (props.initial) dispatch({ type: 'hydrate_from_natal_inputs', value: props.initial });
  }, [props.initial]);

  useEffect(() => {
    if (props.onDraftChange) props.onDraftChange(draft);
  }, [draft, props.onDraftChange]);

  return <NatalInputsEditorBody draft={draft} dispatch={dispatch} idPrefix={props.idPrefix} />;
}

interface NatalInputsEditorBodyProps {
  readonly draft: NatalInputsDraft;
  readonly dispatch: Dispatch<NatalInputsDraftAction>;
  readonly idPrefix: string;
}

function NatalInputsEditorBody({ draft, dispatch, idPrefix }: NatalInputsEditorBodyProps) {
  return (
    <div className="shijing-person-natal-editor">
      <fieldset>
        <legend>Birth evidence (RawBirthInput)</legend>
        <SelectField
          id={`${idPrefix}-calendar-system`}
          label="calendar_system"
          value={draft.calendar_system}
          options={CALENDAR_OPTIONS}
          required
          onChange={(value) => dispatch({ type: 'set_calendar_system', value })}
        />
        <TextField
          id={`${idPrefix}-raw-local-date-text`}
          label="local_date_text"
          value={draft.raw_local_date_text}
          required
          onChange={(value) => dispatch({ type: 'set_raw_local_date_text', value })}
        />
        <TextField
          id={`${idPrefix}-raw-local-time-text`}
          label="local_time_text"
          value={draft.raw_local_time_text}
          onChange={(value) => dispatch({ type: 'set_raw_local_time_text', value })}
        />
        <TextField
          id={`${idPrefix}-raw-place-text`}
          label="place_text"
          value={draft.raw_place_text}
          onChange={(value) => dispatch({ type: 'set_raw_place_text', value })}
        />
        {draft.calendar_system === 'lunar_chinese' ? (
          <>
            <TextField
              id={`${idPrefix}-raw-lunar-year`}
              label="lunar_year"
              value={draft.raw_lunar_year}
              required
              onChange={(value) => dispatch({ type: 'set_raw_lunar_year', value })}
            />
            <TextField
              id={`${idPrefix}-raw-lunar-month`}
              label="lunar_month"
              value={draft.raw_lunar_month}
              required
              onChange={(value) => dispatch({ type: 'set_raw_lunar_month', value })}
            />
            <TextField
              id={`${idPrefix}-raw-lunar-day`}
              label="lunar_day"
              value={draft.raw_lunar_day}
              required
              onChange={(value) => dispatch({ type: 'set_raw_lunar_day', value })}
            />
            <LeapMonthCheckbox
              id={`${idPrefix}-raw-lunar-is-leap-month`}
              value={draft.raw_lunar_is_leap_month}
              onChange={(value) => dispatch({ type: 'set_raw_lunar_is_leap_month', value })}
            />
          </>
        ) : null}
      </fieldset>
      <fieldset>
        <legend>Canonical birth (NatalInputs)</legend>
        <TextField
          id={`${idPrefix}-birth-datetime-utc`}
          label="birth_datetime_utc"
          value={draft.birth_datetime_utc}
          required
          onChange={(value) => dispatch({ type: 'set_birth_datetime_utc', value })}
        />
        <SelectField
          id={`${idPrefix}-birth-precision`}
          label="birth_precision"
          value={draft.birth_precision}
          options={BIRTH_PRECISION_OPTIONS}
          required
          onChange={(value) => dispatch({ type: 'set_birth_precision', value })}
        />
        <SelectField
          id={`${idPrefix}-calculation-sex`}
          label="calculation_sex"
          value={draft.calculation_sex}
          options={CALCULATION_SEX_OPTIONS}
          required
          onChange={(value) => dispatch({ type: 'set_calculation_sex', value })}
        />
        <SelectField
          id={`${idPrefix}-cultural-marker`}
          label="cultural_marker"
          value={draft.cultural_marker}
          options={CULTURAL_MARKER_OPTIONS}
          emptyLabel="(unspecified)"
          onChange={(value) => dispatch({ type: 'set_cultural_marker', value })}
        />
      </fieldset>
      <fieldset>
        <legend>Birth location (BirthLocation)</legend>
        <TextField
          id={`${idPrefix}-latitude`}
          label="latitude"
          value={draft.latitude_text}
          required
          onChange={(value) => dispatch({ type: 'set_latitude_text', value })}
        />
        <TextField
          id={`${idPrefix}-longitude`}
          label="longitude"
          value={draft.longitude_text}
          required
          onChange={(value) => dispatch({ type: 'set_longitude_text', value })}
        />
        <TextField
          id={`${idPrefix}-iana-time-zone`}
          label="iana_time_zone"
          value={draft.iana_time_zone}
          required
          onChange={(value) => dispatch({ type: 'set_iana_time_zone', value })}
        />
        <TextField
          id={`${idPrefix}-place-name`}
          label="place_name"
          value={draft.place_name}
          onChange={(value) => dispatch({ type: 'set_place_name', value })}
        />
      </fieldset>
      <fieldset>
        <legend>Notes</legend>
        <TextField
          id={`${idPrefix}-notes`}
          label="notes"
          value={draft.notes}
          onChange={(value) => dispatch({ type: 'set_notes', value })}
        />
      </fieldset>
    </div>
  );
}
