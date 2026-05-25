// Wave-7 — small field components for the NatalInputs editor. Each
// component is dumb-by-design: it reads `value` + emits `onChange`,
// no validation, no fetch, no SDK. The form-state reducer in
// `natal-inputs-state.ts` is the only state owner.

import type { ChangeEvent } from 'react';

import {
  BIRTH_PRECISIONS,
  CALCULATION_SEXES,
  CALENDAR_SYSTEMS,
  CULTURAL_MARKERS,
} from '../../domain/person.ts';

export interface TextFieldProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
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
        type="text"
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
            {option}
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
      <span>lunar_is_leap_month *</span>
      <select
        id={props.id}
        value={props.value === null ? 'unanswered' : props.value ? 'leap' : 'normal'}
        required
        onChange={(event: ChangeEvent<HTMLSelectElement>) => {
          if (event.target.value === 'leap') props.onChange(true);
          else if (event.target.value === 'normal') props.onChange(false);
        }}
      >
        <option value="unanswered">— (required)</option>
        <option value="normal">normal (not a leap month)</option>
        <option value="leap">leap month</option>
      </select>
    </label>
  );
}

export const CALENDAR_OPTIONS = CALENDAR_SYSTEMS;
export const BIRTH_PRECISION_OPTIONS = BIRTH_PRECISIONS;
export const CALCULATION_SEX_OPTIONS = CALCULATION_SEXES;
export const CULTURAL_MARKER_OPTIONS = CULTURAL_MARKERS;
