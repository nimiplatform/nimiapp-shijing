import { type Dispatch } from 'react';
import { Button } from '@nimiplatform/kit/ui';

import { BIRTH_PRECISION_OPTIONS, CALENDAR_OPTIONS, LeapMonthCheckbox, SelectField, TextField } from './natal-inputs-fields.tsx';
import type { NaturalBirthDraft, NaturalBirthDraftAction } from './natural-birth-draft.ts';
import { BUTTONS, FIELD_LABELS, FIELD_PLACEHOLDERS, HEADINGS } from '../i18n/copy.ts';
import { enumLabel } from '../i18n/enum-label.ts';
import type { CalculationSex } from '../../domain/person.ts';

const NATURAL_CALCULATION_SEX_OPTIONS: readonly CalculationSex[] = ['female', 'male', 'unspecified'];

// Context-shortened field labels. The 3-fieldset layout introduced
// in the modal redesign means each field already sits under a
// legend that carries the "出生..." framing (出生日期 / 出生时间 /
// 出生地点与备注). Repeating that prefix in the field label reads as
// stutter ("出生时间 / 出生时间" / "出生地点与备注 / 出生地点") so we
// strip the prefix here. FIELD_LABELS keeps the long form for any
// future standalone-form caller; this is intentionally a local
// override for the grouped editor only.
const GROUP_FIELD_LABELS = {
  local_time_text: '时刻',
  place_text: '地点',
} as const;

export interface NaturalBirthEditorProps {
  readonly draft: NaturalBirthDraft;
  readonly dispatch: Dispatch<NaturalBirthDraftAction>;
  readonly idPrefix: string;
  readonly submitLabel?: string;
  readonly onCancel?: () => void;
}

// The historical "系统标准化预览" aside was retired in an earlier pass
// — 4 of its 6 rows were echoes of fields the user had just typed, and
// the only genuinely-new piece of information (resolved IANA timezone
// + standardization status) is exposed post-save on the Me tab.
//
// Wave-N (modal redesign): the single 7-field <fieldset> was split
// into three semantic groups — date / time / place+notes — so the
// form reads as three short stages instead of one long column. The
// `natal_section_*` legends in copy.ts back the group titles.
export function NaturalBirthEditor(props: NaturalBirthEditorProps) {
  const isGregorian = props.draft.calendar_system === 'gregorian';

  return (
    <div className="shijing-natural-birth">
      <div className="shijing-natural-birth__record">
        <fieldset className="shijing-natural-birth__group">
          <legend>{HEADINGS.natal_section_date}</legend>
          <SelectField
            id={`${props.idPrefix}-calendar-system`}
            label={FIELD_LABELS.calendar_system}
            value={props.draft.calendar_system}
            options={CALENDAR_OPTIONS}
            optionLabel={(value) => enumLabel('calendar_system', value)}
            required
            onChange={(value) => props.dispatch({ type: 'set_calendar_system', value })}
          />
          {isGregorian ? (
            <TextField
              id={`${props.idPrefix}-gregorian-date`}
              label={FIELD_LABELS.gregorian_date}
              value={props.draft.gregorian_date_text}
              required
              placeholder={FIELD_PLACEHOLDERS.gregorian_date}
              onChange={(value) => props.dispatch({ type: 'set_gregorian_date_text', value })}
            />
          ) : (
            <div className="shijing-natural-birth__lunar-grid">
              <TextField
                id={`${props.idPrefix}-lunar-year`}
                label={FIELD_LABELS.lunar_year}
                value={props.draft.lunar_year_text}
                required
                placeholder={FIELD_PLACEHOLDERS.lunar_year}
                onChange={(value) => props.dispatch({ type: 'set_lunar_year_text', value })}
              />
              <TextField
                id={`${props.idPrefix}-lunar-month`}
                label={FIELD_LABELS.lunar_month}
                value={props.draft.lunar_month_text}
                required
                placeholder={FIELD_PLACEHOLDERS.lunar_month}
                onChange={(value) => props.dispatch({ type: 'set_lunar_month_text', value })}
              />
              <TextField
                id={`${props.idPrefix}-lunar-day`}
                label={FIELD_LABELS.lunar_day}
                value={props.draft.lunar_day_text}
                required
                placeholder={FIELD_PLACEHOLDERS.lunar_day}
                onChange={(value) => props.dispatch({ type: 'set_lunar_day_text', value })}
              />
              <LeapMonthCheckbox
                id={`${props.idPrefix}-lunar-is-leap-month`}
                value={props.draft.lunar_is_leap_month}
                onChange={(value) => props.dispatch({ type: 'set_lunar_is_leap_month', value })}
              />
            </div>
          )}
        </fieldset>

        <fieldset className="shijing-natural-birth__group">
          <legend>{HEADINGS.natal_section_time}</legend>
          <TextField
            id={`${props.idPrefix}-local-time`}
            label={GROUP_FIELD_LABELS.local_time_text}
            value={props.draft.local_time_text}
            placeholder={FIELD_PLACEHOLDERS.local_time_text}
            onChange={(value) => props.dispatch({ type: 'set_local_time_text', value })}
          />
          <SelectField
            id={`${props.idPrefix}-birth-precision`}
            label={FIELD_LABELS.birth_precision}
            value={props.draft.birth_precision}
            options={BIRTH_PRECISION_OPTIONS}
            optionLabel={(value) => enumLabel('birth_precision', value)}
            required
            onChange={(value) => props.dispatch({ type: 'set_birth_precision', value })}
          />
        </fieldset>

        <fieldset className="shijing-natural-birth__group">
          <legend>{HEADINGS.natal_section_place_notes}</legend>
          <TextField
            id={`${props.idPrefix}-place-text`}
            label={GROUP_FIELD_LABELS.place_text}
            value={props.draft.place_text}
            required
            placeholder={FIELD_PLACEHOLDERS.place_text}
            onChange={(value) => props.dispatch({ type: 'set_place_text', value })}
          />
          <SelectField
            id={`${props.idPrefix}-calculation-sex`}
            label={FIELD_LABELS.calculation_sex}
            value={props.draft.calculation_sex}
            options={NATURAL_CALCULATION_SEX_OPTIONS}
            optionLabel={(value) => enumLabel('calculation_sex', value)}
            required
            onChange={(value) => props.dispatch({ type: 'set_calculation_sex', value })}
          />
          <TextField
            id={`${props.idPrefix}-notes`}
            label={FIELD_LABELS.notes}
            value={props.draft.notes}
            placeholder={FIELD_PLACEHOLDERS.notes}
            onChange={(value) => props.dispatch({ type: 'set_notes', value })}
          />
        </fieldset>
      </div>

      {(props.submitLabel || props.onCancel) ? (
        <div className="shijing-natural-birth__footer-actions">
          {props.onCancel ? (
            <Button type="button" tone="ghost" onClick={props.onCancel}>
              {BUTTONS.cancel}
            </Button>
          ) : null}
          {props.submitLabel ? (
            <Button type="submit" tone="primary">{props.submitLabel}</Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
