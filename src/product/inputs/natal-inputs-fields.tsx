// Wave-7 — small field components for the NatalInputs editor.
//
// Wave-N (kit form pass): the external API is unchanged
// (TextField / SelectField keep their props shape), but the
// internals now compose kit primitives — `FieldShell` for the
// labeled wrapper, kit's `TextField` for the styled input, kit's
// `SelectField` for the dropdown. Every Me overlay
// (NaturalBirthEditor / PersonForm / RelationForm) inherits the
// kit field look automatically; SettingsForm migrates separately
// because its layout was hand-rolled.
//
// Wave-N (lunar pickers): `LeapMonthCheckbox` was retired in favour
// of a tyme4ts-driven cascading month select that exposes "闰X月"
// as a distinct option — see `lunarMonthOptionsFor` /
// `lunarDayOptionsFor` below. Those helpers are used by
// `NaturalBirthEditor`'s lunar branch directly so the year/month/
// day selects stay tightly coupled.
//
// Each component is still dumb-by-design: it reads `value` + emits
// `onChange`, no validation, no fetch, no SDK. NaturalBirthDraft
// (and its sibling drafts) own state.

import { Fragment, type ReactNode } from 'react';
import {
  DatePicker as KitDatePicker,
  FieldShell,
  TextField as KitTextField,
  SelectField as KitSelectField,
  formatDateValue,
} from '@nimiplatform/kit/ui';
import { LunarMonth, LunarYear } from 'tyme4ts';

import {
  BIRTH_PRECISIONS,
  CALCULATION_SEXES,
  CALENDAR_SYSTEMS,
  CULTURAL_MARKERS,
} from '../../domain/person.ts';
import { FIELD_LABELS } from '../i18n/copy.ts';

// Compose a field label with the required asterisk wrapped in a
// dedicated span so CSS can color it independently of the label
// text. aria-hidden because the real semantic "required" signal is
// the `required` HTML attribute on the input itself — the asterisk
// is purely visual.
export function decoratedLabel(label: ReactNode, required?: boolean): ReactNode {
  if (!required) return label;
  return (
    <Fragment>
      {label}
      <span className="shijing-required-marker" aria-hidden="true"> *</span>
    </Fragment>
  );
}

// Birth dates can't be in the future. Computed once per module load —
// one-day drift in a long-running session is acceptable for a birth-
// date max.
const TODAY_ISO = formatDateValue(new Date());

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

export interface DateFieldProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;       // ISO YYYY-MM-DD
  readonly required?: boolean;
  readonly onChange: (value: string) => void;
}

// Calendar date input — kit `DatePicker` inside a hand-rolled
// label+wrapper instead of FieldShell. Reason: kit DatePicker
// renders its own <input> with its own visuals (rounded-2xl, kit
// field tokens), and our `.nimi-field-shell input` reset rule
// (which exists to neutralise the project-scoped form CSS for kit
// TextField / SelectField / TextareaField) would zero out the
// DatePicker's border / radius / padding too. Standing it outside
// FieldShell lets DatePicker keep its own intentional chrome; CSS
// in the .shijing-natal-overlay__panel scope normalises the radius
// + height to match the surrounding fields.
export function DateField(props: DateFieldProps) {
  return (
    <div className="shijing-date-field">
      <label className="shijing-date-field__label" htmlFor={props.id}>
        {decoratedLabel(props.label, props.required)}
      </label>
      <KitDatePicker
        value={props.value}
        onChange={props.onChange}
        maxDate={TODAY_ISO}
      />
    </div>
  );
}

// === Lunar (农历) cascading-select helpers =========================
//
// tyme4ts encodes leap lunar months by NEGATING the month number when
// passed to `LunarMonth.fromYm(year, month)` — see
// canonicalize-natal-inputs.ts. We mirror that contract in the UI
// layer by encoding select-option values as:
//
//   "5"   →  五月    (normal)
//   "L5"  →  闰五月  (leap)
//
// The "L" prefix collapses two pieces of draft state
// (`lunar_month_text` + `lunar_is_leap_month`) into a single select
// value, then the editor decodes it back on change. Tyme4ts's
// `LunarMonth.getName()` provides ready-made Chinese labels ("正月" /
// "闰四月" / "腊月" etc) so we don't have to format month names.

export interface LunarSelectOption {
  readonly value: string;
  readonly label: string;
}

// Birth records can't be in the future; cap year range at "now".
// tyme4ts ships lunar tables back to ~1900 so the lower bound is the
// table coverage (years before that throw on `getMonths()`).
export const LUNAR_YEAR_MIN = 1900;
export function lunarYearMax(): number {
  return new Date().getFullYear();
}

function parseLunarYear(yearText: string): number | null {
  const y = Number.parseInt(yearText.trim(), 10);
  if (!Number.isInteger(y)) return null;
  if (y < LUNAR_YEAR_MIN || y > lunarYearMax()) return null;
  return y;
}

export function lunarMonthOptionsFor(yearText: string): readonly LunarSelectOption[] {
  const year = parseLunarYear(yearText);
  if (year === null) return [];
  try {
    return LunarYear.fromYear(year).getMonths().map((m) => {
      const num = Math.abs(m.getMonthWithLeap());
      return {
        value: m.isLeap() ? `L${num}` : String(num),
        label: m.getName(),
      };
    });
  } catch {
    return [];
  }
}

export function lunarDayOptionsFor(
  yearText: string,
  monthText: string,
  isLeap: boolean,
): readonly LunarSelectOption[] {
  const year = parseLunarYear(yearText);
  const month = Number.parseInt(monthText.trim(), 10);
  if (year === null || !Number.isInteger(month) || month < 1 || month > 12) return [];
  try {
    const lm = LunarMonth.fromYm(year, isLeap ? -month : month);
    return lm.getDays().map((d, i) => ({
      value: String(i + 1),
      label: d.getName(),
    }));
  } catch {
    return [];
  }
}

/** Compose draft (monthText + isLeap) → select value ("5" or "L5"). */
export function encodeLunarMonthSelectValue(
  monthText: string,
  isLeap: boolean | null,
): string {
  if (!monthText.trim()) return '';
  return isLeap ? `L${monthText.trim()}` : monthText.trim();
}

/** Decode select value → { monthText, isLeap } for dispatch. */
export function decodeLunarMonthSelectValue(
  value: string,
): { monthText: string; isLeap: boolean } {
  if (!value) return { monthText: '', isLeap: false };
  if (value.startsWith('L')) return { monthText: value.slice(1), isLeap: true };
  return { monthText: value, isLeap: false };
}

export const CALENDAR_OPTIONS = CALENDAR_SYSTEMS;
export const BIRTH_PRECISION_OPTIONS = BIRTH_PRECISIONS;
export const CALCULATION_SEX_OPTIONS = CALCULATION_SEXES;
export const CULTURAL_MARKER_OPTIONS = CULTURAL_MARKERS;
