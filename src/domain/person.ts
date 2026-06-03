// SJG-DATA-03 — SelfSubject, Person, NatalInputs, RawBirthInput,
// BirthLocation. NatalInputs is frozen by Astrology Algorithm Contract v1;
// adding a field is an Algorithm Contract change.

export type BirthPrecision =
  | 'exact'
  | 'rough_day'
  | 'rough_month'
  | 'rough_year'
  | 'unknown';

export const BIRTH_PRECISIONS: readonly BirthPrecision[] = [
  'exact',
  'rough_day',
  'rough_month',
  'rough_year',
  'unknown',
] as const;

export type CalendarSystem = 'gregorian' | 'lunar_chinese';

export const CALENDAR_SYSTEMS: readonly CalendarSystem[] = ['gregorian', 'lunar_chinese'] as const;

export type CulturalMarker = 'natal_yang' | 'natal_yin' | 'unspecified';

export const CULTURAL_MARKERS: readonly CulturalMarker[] = [
  'natal_yang',
  'natal_yin',
  'unspecified',
] as const;

export type CalculationSex = 'male' | 'female' | 'unspecified';

export const CALCULATION_SEXES: readonly CalculationSex[] = [
  'male',
  'female',
  'unspecified',
] as const;

export interface BirthLocation {
  readonly latitude: number;
  readonly longitude: number;
  readonly iana_time_zone: string;
  readonly place_name?: string;
}

export interface RawBirthInput {
  readonly calendar_system: CalendarSystem;
  readonly local_date_text: string;
  readonly local_time_text?: string;
  readonly lunar_year?: number;
  readonly lunar_month?: number;
  readonly lunar_day?: number;
  readonly lunar_is_leap_month?: boolean;
  readonly place_text?: string;
}

export interface NatalInputs {
  readonly raw_birth_input: RawBirthInput;
  readonly birth_datetime_utc: string;
  readonly birth_precision: BirthPrecision;
  readonly calendar_system: CalendarSystem;
  readonly birth_location: BirthLocation;
  readonly calculation_sex: CalculationSex;
  readonly cultural_marker?: CulturalMarker;
  readonly notes?: string;
}

export interface SelfSubject {
  readonly natal_inputs: NatalInputs;
  readonly notes?: string;
}

export type ConsentState = 'owner_recorded' | 'subject_consented' | 'withheld';

export const CONSENT_STATES: readonly ConsentState[] = [
  'owner_recorded',
  'subject_consented',
  'withheld',
] as const;

// Free-text display label describing how the subject relates to the user
// (母亲 / 合伙人 / …). Presentation hint only — bounded, never parsed into a
// relationship graph or fed to calculation. See SJG-DATA-03 invariants.
export const PERSON_RELATION_MAX_LENGTH = 40 as const;

export interface Person {
  readonly id: string;
  readonly display_name: string;
  readonly kind: 'person';
  readonly natal_inputs: NatalInputs;
  readonly consent_state: ConsentState;
  readonly relation?: string;
  readonly notes?: string;
}
