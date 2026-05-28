import { useEffect, useMemo, type Dispatch } from 'react';
import { Button, FieldShell, SelectField as KitSelectField } from '@nimiplatform/kit/ui';

import {
  BIRTH_PRECISION_OPTIONS,
  CALENDAR_OPTIONS,
  DateField,
  SelectField,
  TextField,
  decodeLunarMonthSelectValue,
  decoratedLabel,
  encodeLunarMonthSelectValue,
  lunarDayOptionsFor,
  lunarMonthOptionsFor,
} from './natal-inputs-fields.tsx';
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

// Wave-N (modal redesign): the single 7-field <fieldset> was split
// into three semantic groups — date / time / place+notes — so the
// form reads as three short stages instead of one long column. The
// `natal_section_*` legends in copy.ts back the group titles.
//
// Wave-N (lunar picker): the historical "lunar year / month / day +
// 是否闰月" four-input grid was replaced by a tyme4ts-driven
// cascading set — year stays a text input (typing 4 digits is faster
// than scrolling a 125-entry dropdown), but month + day are kit
// SelectFields populated from the actual lunar calendar of the
// chosen year. Leap months render as their own option ("闰四月"), so
// the "是否闰月" question is fully absorbed into the month dropdown
// and storage's `lunar_is_leap_month` is set as a side-effect of
// picking the option.
export function NaturalBirthEditor(props: NaturalBirthEditorProps) {
  const isGregorian = props.draft.calendar_system === 'gregorian';

  // --- Lunar cascading-select state -----------------------------------
  // Options for month / day come straight from tyme4ts, gated on the
  // currently-entered year (and month, for day count). When the user
  // edits a higher tier of the cascade we explicitly clear the lower
  // tiers if the existing value would no longer be valid.
  const monthOptions = useMemo(
    () => (isGregorian ? [] : lunarMonthOptionsFor(props.draft.lunar_year_text)),
    [isGregorian, props.draft.lunar_year_text],
  );
  const dayOptions = useMemo(
    () => (
      isGregorian
        ? []
        : lunarDayOptionsFor(
          props.draft.lunar_year_text,
          props.draft.lunar_month_text,
          props.draft.lunar_is_leap_month === true,
        )
    ),
    [
      isGregorian,
      props.draft.lunar_year_text,
      props.draft.lunar_month_text,
      props.draft.lunar_is_leap_month,
    ],
  );
  const lunarMonthSelectValue = encodeLunarMonthSelectValue(
    props.draft.lunar_month_text,
    props.draft.lunar_is_leap_month,
  );

  // Cascade-invalidation: if year change makes the current month
  // invalid (e.g. the previously-selected leap month no longer
  // exists in the new year), reset month + day. Similarly, if the
  // currently-selected day exceeds the new month's day count after a
  // month change, reset day. Both run in useEffect so the editor
  // stays a pure render of draft state without side-effect glue in
  // event handlers.
  useEffect(() => {
    if (isGregorian) return;
    if (!props.draft.lunar_month_text) return;
    const stillValid = monthOptions.some((opt) => opt.value === lunarMonthSelectValue);
    if (!stillValid) {
      props.dispatch({ type: 'set_lunar_month_text', value: '' });
      props.dispatch({ type: 'set_lunar_is_leap_month', value: false });
      props.dispatch({ type: 'set_lunar_day_text', value: '' });
    }
  }, [
    isGregorian,
    monthOptions,
    lunarMonthSelectValue,
    props.draft.lunar_month_text,
    props.dispatch,
  ]);

  useEffect(() => {
    if (isGregorian) return;
    if (!props.draft.lunar_day_text) return;
    if (dayOptions.length === 0) return;
    const stillValid = dayOptions.some((opt) => opt.value === props.draft.lunar_day_text);
    if (!stillValid) {
      props.dispatch({ type: 'set_lunar_day_text', value: '' });
    }
  }, [isGregorian, dayOptions, props.draft.lunar_day_text, props.dispatch]);

  function handleLunarMonthChange(value: string) {
    const { monthText, isLeap } = decodeLunarMonthSelectValue(value);
    props.dispatch({ type: 'set_lunar_month_text', value: monthText });
    props.dispatch({ type: 'set_lunar_is_leap_month', value: isLeap });
  }

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
            <DateField
              id={`${props.idPrefix}-gregorian-date`}
              label={FIELD_LABELS.gregorian_date}
              value={props.draft.gregorian_date_text}
              required
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
              <FieldShell label={decoratedLabel(FIELD_LABELS.lunar_month, true)}>
                <KitSelectField
                  id={`${props.idPrefix}-lunar-month`}
                  value={lunarMonthSelectValue}
                  required
                  disabled={monthOptions.length === 0}
                  placeholder={monthOptions.length === 0 ? '先填年份' : '选择月份'}
                  options={[...monthOptions]}
                  onValueChange={handleLunarMonthChange}
                />
              </FieldShell>
              <FieldShell label={decoratedLabel(FIELD_LABELS.lunar_day, true)}>
                <KitSelectField
                  id={`${props.idPrefix}-lunar-day`}
                  value={props.draft.lunar_day_text}
                  required
                  disabled={dayOptions.length === 0}
                  placeholder={
                    !props.draft.lunar_month_text
                      ? '先选月份'
                      : dayOptions.length === 0
                        ? '—'
                        : '选择日期'
                  }
                  options={[...dayOptions]}
                  onValueChange={(value) =>
                    props.dispatch({ type: 'set_lunar_day_text', value })
                  }
                />
              </FieldShell>
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
          {/* Inline advisory: only shown when the user has actively
            * selected "不确定". Keeps the warning at the point of
            * choice rather than carrying it out to the summary card
            * after the fact. */}
          {props.draft.birth_precision === 'unknown' ? (
            <p className="shijing-natural-birth__precision-hint">
              如果出生时间只是大概时间，部分细节分析可能会有偏差。
            </p>
          ) : null}
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
