// Wave-7 — small field components for the NatalInputs editor. Each
// component is dumb-by-design: it reads `value` + emits `onChange`,
// no validation, no fetch, no SDK. NaturalBirthDraft owns state.

import type { ChangeEvent } from 'react';

import {
  BIRTH_PRECISIONS,
  CALCULATION_SEXES,
  CALENDAR_SYSTEMS,
  CULTURAL_MARKERS,
} from '../../domain/person.ts';
import { FIELD_LABELS, LEAP_MONTH_LABELS } from '../i18n/copy.ts';

export interface TextFieldProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly type?: 'text' | 'date' | 'number' | 'time' | 'datetime-local';
  readonly required?: boolean;
  readonly placeholder?: string;
  readonly onChange: (value: string) => void;
}

export function TextField(props: TextFieldProps) {
  return (
    <label htmlFor={props.id} className="shijing-input-field">
      <span>{props.label}{props.required ? ' *' : null}</span>
      <input
        id={props.id}
        type={props.type ?? 'text'}
        value={props.value}
        required={props.required ?? false}
        placeholder={props.placeholder}
        onChange={(event: ChangeEvent<HTMLInputElement>) => props.onChange(event.target.value)}
      />
    </label>
  );
}

export interface SelectFieldProps<T extends string> {
  readonly id: string;
  readonly label: string;
  readonly value: T;
  readonly options: readonly T[];
  readonly required?: boolean;
  readonly emptyLabel?: string;
  readonly optionLabel?: (value: T) => string;
  readonly onChange: (value: T) => void;
}

export function SelectField<T extends string>(props: SelectFieldProps<T>) {
  return (
    <label htmlFor={props.id} className="shijing-input-field">
      <span>{props.label}{props.required ? ' *' : null}</span>
      <select
        id={props.id}
        value={props.value}
        required={props.required ?? false}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => props.onChange(event.target.value as T)}
      >
        {props.emptyLabel !== undefined ? <option value="">{props.emptyLabel}</option> : null}
        {props.options.map((option) => (
          <option key={option} value={option}>
            {props.optionLabel ? props.optionLabel(option) : option}
          </option>
        ))}
      </select>
    </label>
  );
}

export interface LeapMonthCheckboxProps {
  readonly id: string;
  readonly value: boolean | null;
  readonly onChange: (value: boolean) => void;
}

export function LeapMonthCheckbox(props: LeapMonthCheckboxProps) {
  return (
    <label htmlFor={props.id} className="shijing-input-field shijing-input-field--lunar-leap">
      <span>{FIELD_LABELS.lunar_is_leap_month} *</span>
      <select
        id={props.id}
        value={props.value === null ? 'unanswered' : props.value ? 'leap' : 'normal'}
        required
        onChange={(event: ChangeEvent<HTMLSelectElement>) => {
          if (event.target.value === 'leap') props.onChange(true);
          else if (event.target.value === 'normal') props.onChange(false);
        }}
      >
        <option value="unanswered">{LEAP_MONTH_LABELS.unanswered}</option>
        <option value="normal">{LEAP_MONTH_LABELS.normal}</option>
        <option value="leap">{LEAP_MONTH_LABELS.leap}</option>
      </select>
    </label>
  );
}

export const CALENDAR_OPTIONS = CALENDAR_SYSTEMS;
export const BIRTH_PRECISION_OPTIONS = BIRTH_PRECISIONS;
export const CALCULATION_SEX_OPTIONS = CALCULATION_SEXES;
export const CULTURAL_MARKER_OPTIONS = CULTURAL_MARKERS;
