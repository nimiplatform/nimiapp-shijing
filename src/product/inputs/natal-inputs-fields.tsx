// Wave-7 — small field components for the NatalInputs editor.
//
// Wave-N (kit form pass): the external API is unchanged
// (TextField / SelectField / LeapMonthCheckbox keep their props
// shape), but the internals now compose kit primitives —
// `FieldShell` for the labeled wrapper, kit's `TextField` for the
// styled input, kit's `SelectField` for the dropdown. Every Me
// overlay (NaturalBirthEditor / PersonForm / RelationForm)
// inherits the kit field look automatically; SettingsForm migrates
// separately because its layout was hand-rolled.
//
// Each component is still dumb-by-design: it reads `value` + emits
// `onChange`, no validation, no fetch, no SDK. NaturalBirthDraft
// (and its sibling drafts) own state.

import {
  FieldShell,
  TextField as KitTextField,
  SelectField as KitSelectField,
} from '@nimiplatform/kit/ui';

import {
  BIRTH_PRECISIONS,
  CALCULATION_SEXES,
  CALENDAR_SYSTEMS,
  CULTURAL_MARKERS,
} from '../../domain/person.ts';
import { FIELD_LABELS, LEAP_MONTH_LABELS } from '../i18n/copy.ts';

function decoratedLabel(label: string, required?: boolean): string {
  return required ? `${label} *` : label;
}

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
    <FieldShell label={decoratedLabel(props.label, props.required)}>
      <KitTextField
        id={props.id}
        type={props.type ?? 'text'}
        value={props.value}
        required={props.required ?? false}
        placeholder={props.placeholder}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </FieldShell>
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
  // Kit's SelectField surfaces "no value yet" via its built-in
  // `placeholder` slot — it does NOT need a synthetic <option
  // value=""/>. Mapping `emptyLabel` -> `placeholder` keeps the
  // existing call-site contract while letting kit own the visual.
  const options = props.options.map((option) => ({
    value: option,
    label: props.optionLabel ? props.optionLabel(option) : option,
  }));
  return (
    <FieldShell label={decoratedLabel(props.label, props.required)}>
      <KitSelectField
        id={props.id}
        value={props.value}
        options={options}
        {...(props.emptyLabel !== undefined ? { placeholder: props.emptyLabel } : {})}
        required={props.required ?? false}
        onValueChange={(value) => props.onChange(value as T)}
      />
    </FieldShell>
  );
}

export interface LeapMonthCheckboxProps {
  readonly id: string;
  readonly value: boolean | null;
  readonly onChange: (value: boolean) => void;
}

export function LeapMonthCheckbox(props: LeapMonthCheckboxProps) {
  const value = props.value === null ? 'unanswered' : props.value ? 'leap' : 'normal';
  return (
    <FieldShell label={`${FIELD_LABELS.lunar_is_leap_month} *`}>
      <KitSelectField
        id={props.id}
        value={value}
        required
        options={[
          { value: 'unanswered', label: LEAP_MONTH_LABELS.unanswered },
          { value: 'normal', label: LEAP_MONTH_LABELS.normal },
          { value: 'leap', label: LEAP_MONTH_LABELS.leap },
        ]}
        onValueChange={(next) => {
          if (next === 'leap') props.onChange(true);
          else if (next === 'normal') props.onChange(false);
        }}
      />
    </FieldShell>
  );
}

export const CALENDAR_OPTIONS = CALENDAR_SYSTEMS;
export const BIRTH_PRECISION_OPTIONS = BIRTH_PRECISIONS;
export const CALCULATION_SEX_OPTIONS = CALCULATION_SEXES;
export const CULTURAL_MARKER_OPTIONS = CULTURAL_MARKERS;
