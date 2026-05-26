import { useMemo, type Dispatch } from 'react';

import { BIRTH_PRECISION_OPTIONS, CALENDAR_OPTIONS, LeapMonthCheckbox, SelectField, TextField } from './natal-inputs-fields.tsx';
import type { NaturalBirthDraft, NaturalBirthDraftAction } from './natural-birth-draft.ts';
import { buildNaturalBirthNatalInputs } from './natural-birth-build.ts';
import { FIELD_LABELS, FIELD_PLACEHOLDERS, HEADINGS } from '../i18n/copy.ts';
import { enumLabel } from '../i18n/enum-label.ts';
import { TechnicalDetails } from '../components/technical-details.tsx';
import type { CalculationSex } from '../../domain/person.ts';

const NATURAL_CALCULATION_SEX_OPTIONS: readonly CalculationSex[] = ['female', 'male', 'unspecified'];

export interface NaturalBirthEditorProps {
  readonly draft: NaturalBirthDraft;
  readonly dispatch: Dispatch<NaturalBirthDraftAction>;
  readonly idPrefix: string;
  readonly submitLabel?: string;
}

export function NaturalBirthEditor(props: NaturalBirthEditorProps) {
  const outcome = useMemo(() => buildNaturalBirthNatalInputs(props.draft), [props.draft]);
  const preview = outcome.preview;
  const standardizationText = preview.status === 'ready'
    ? `已标准化为 ${preview.place?.iana_time_zone ?? '当前时区'}`
    : '继续填写后预览';

  return (
    <div className="shijing-natural-birth">
      <div className="shijing-natural-birth__record">
        <fieldset>
          <legend>{HEADINGS.natal_section_record}</legend>
          <SelectField
            id={`${props.idPrefix}-calendar-system`}
            label={FIELD_LABELS.calendar_system}
            value={props.draft.calendar_system}
            options={CALENDAR_OPTIONS}
            optionLabel={(value) => enumLabel('calendar_system', value)}
            required
            onChange={(value) => props.dispatch({ type: 'set_calendar_system', value })}
          />
          {props.draft.calendar_system === 'gregorian' ? (
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
          <TextField
            id={`${props.idPrefix}-local-time`}
            label={FIELD_LABELS.local_time_text}
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
          <TextField
            id={`${props.idPrefix}-place-text`}
            label={FIELD_LABELS.place_text}
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
      <aside className="shijing-natural-birth__preview" aria-live="polite">
        <h3>{HEADINGS.natal_section_standardized_preview}</h3>
        <dl>
          <div>
            <dt>本地时间</dt>
            <dd>{preview.local_datetime_text ?? '等待填写日期、时间精度和地点'}</dd>
          </div>
          <div>
            <dt>地点</dt>
            <dd>{preview.place ? `${preview.place.place_name}` : '等待识别出生地点'}</dd>
          </div>
          <div>
            <dt>时区</dt>
            <dd>{preview.place?.iana_time_zone ?? '标准化后显示'}</dd>
          </div>
          <div>
            <dt>状态</dt>
            <dd>{standardizationText}</dd>
          </div>
          <div>
            <dt>时间记忆</dt>
            <dd>{enumLabel('birth_precision', preview.birth_precision)}</dd>
          </div>
          <div>
            <dt>推算性别</dt>
            <dd>{enumLabel('calculation_sex', props.draft.calculation_sex)}</dd>
          </div>
        </dl>
        <TechnicalDetails content={preview.technical_details ?? ''} />
        {props.submitLabel ? <button type="submit">{props.submitLabel}</button> : null}
      </aside>
    </div>
  );
}
