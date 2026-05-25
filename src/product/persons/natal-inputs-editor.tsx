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
import { FIELD_LABELS, FIELD_PLACEHOLDERS, HEADINGS, SELECT_OPTIONAL_PLACEHOLDER } from '../i18n/copy.ts';
import { enumLabel } from '../i18n/enum-label.ts';

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
        <legend>{HEADINGS.natal_section_raw}</legend>
        <SelectField
          id={`${idPrefix}-calendar-system`}
          label={FIELD_LABELS.calendar_system}
          value={draft.calendar_system}
          options={CALENDAR_OPTIONS}
          optionLabel={(v) => enumLabel('calendar_system', v)}
          required
          onChange={(value) => dispatch({ type: 'set_calendar_system', value })}
        />
        <TextField
          id={`${idPrefix}-raw-local-date-text`}
          label={FIELD_LABELS.local_date_text}
          value={draft.raw_local_date_text}
          required
          placeholder={FIELD_PLACEHOLDERS.local_date_text}
          onChange={(value) => dispatch({ type: 'set_raw_local_date_text', value })}
        />
        <TextField
          id={`${idPrefix}-raw-local-time-text`}
          label={FIELD_LABELS.local_time_text}
          value={draft.raw_local_time_text}
          placeholder={FIELD_PLACEHOLDERS.local_time_text}
          onChange={(value) => dispatch({ type: 'set_raw_local_time_text', value })}
        />
        <TextField
          id={`${idPrefix}-raw-place-text`}
          label={FIELD_LABELS.place_text}
          value={draft.raw_place_text}
          placeholder={FIELD_PLACEHOLDERS.place_text}
          onChange={(value) => dispatch({ type: 'set_raw_place_text', value })}
        />
        {draft.calendar_system === 'lunar_chinese' ? (
          <>
            <TextField
              id={`${idPrefix}-raw-lunar-year`}
              label={FIELD_LABELS.lunar_year}
              value={draft.raw_lunar_year}
              required
              onChange={(value) => dispatch({ type: 'set_raw_lunar_year', value })}
            />
            <TextField
              id={`${idPrefix}-raw-lunar-month`}
              label={FIELD_LABELS.lunar_month}
              value={draft.raw_lunar_month}
              required
              onChange={(value) => dispatch({ type: 'set_raw_lunar_month', value })}
            />
            <TextField
              id={`${idPrefix}-raw-lunar-day`}
              label={FIELD_LABELS.lunar_day}
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
        <legend>{HEADINGS.natal_section_canonical}</legend>
        <TextField
          id={`${idPrefix}-birth-datetime-utc`}
          label={FIELD_LABELS.birth_datetime_utc}
          value={draft.birth_datetime_utc}
          required
          placeholder={FIELD_PLACEHOLDERS.birth_datetime_utc}
          onChange={(value) => dispatch({ type: 'set_birth_datetime_utc', value })}
        />
        <SelectField
          id={`${idPrefix}-birth-precision`}
          label={FIELD_LABELS.birth_precision}
          value={draft.birth_precision}
          options={BIRTH_PRECISION_OPTIONS}
          optionLabel={(v) => enumLabel('birth_precision', v)}
          required
          onChange={(value) => dispatch({ type: 'set_birth_precision', value })}
        />
        <SelectField
          id={`${idPrefix}-calculation-sex`}
          label={FIELD_LABELS.calculation_sex}
          value={draft.calculation_sex}
          options={CALCULATION_SEX_OPTIONS}
          optionLabel={(v) => enumLabel('calculation_sex', v)}
          required
          onChange={(value) => dispatch({ type: 'set_calculation_sex', value })}
        />
        <SelectField
          id={`${idPrefix}-cultural-marker`}
          label={FIELD_LABELS.cultural_marker}
          value={draft.cultural_marker}
          options={CULTURAL_MARKER_OPTIONS}
          optionLabel={(v) => enumLabel('cultural_marker', v)}
          emptyLabel={SELECT_OPTIONAL_PLACEHOLDER}
          onChange={(value) => dispatch({ type: 'set_cultural_marker', value })}
        />
      </fieldset>
      <fieldset>
        <legend>{HEADINGS.natal_section_location}</legend>
        <TextField
          id={`${idPrefix}-latitude`}
          label={FIELD_LABELS.latitude}
          value={draft.latitude_text}
          required
          placeholder={FIELD_PLACEHOLDERS.latitude}
          onChange={(value) => dispatch({ type: 'set_latitude_text', value })}
        />
        <TextField
          id={`${idPrefix}-longitude`}
          label={FIELD_LABELS.longitude}
          value={draft.longitude_text}
          required
          placeholder={FIELD_PLACEHOLDERS.longitude}
          onChange={(value) => dispatch({ type: 'set_longitude_text', value })}
        />
        <TextField
          id={`${idPrefix}-iana-time-zone`}
          label={FIELD_LABELS.iana_time_zone}
          value={draft.iana_time_zone}
          required
          placeholder={FIELD_PLACEHOLDERS.iana_time_zone}
          onChange={(value) => dispatch({ type: 'set_iana_time_zone', value })}
        />
        <TextField
          id={`${idPrefix}-place-name`}
          label={FIELD_LABELS.place_name}
          value={draft.place_name}
          onChange={(value) => dispatch({ type: 'set_place_name', value })}
        />
      </fieldset>
      <fieldset>
        <legend>{HEADINGS.natal_section_notes}</legend>
        <TextField
          id={`${idPrefix}-notes`}
          label={FIELD_LABELS.notes}
          value={draft.notes}
          onChange={(value) => dispatch({ type: 'set_notes', value })}
        />
      </fieldset>
    </div>
  );
}
