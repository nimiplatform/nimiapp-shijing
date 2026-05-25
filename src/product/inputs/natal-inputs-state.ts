// Wave-7 — pure TS state machine for the NatalInputs editor. No React
// coupling so it is unit-testable from `node --test` directly.

import type {
  BirthLocation,
  CalculationSex,
  CalendarSystem,
  CulturalMarker,
  NatalInputs,
  RawBirthInput,
} from '../../domain/person.ts';

export interface NatalInputsDraft {
  readonly calendar_system: CalendarSystem;
  readonly raw_local_date_text: string;
  readonly raw_local_time_text: string;
  readonly raw_place_text: string;
  readonly raw_lunar_year: string;
  readonly raw_lunar_month: string;
  readonly raw_lunar_day: string;
  readonly raw_lunar_is_leap_month: boolean | null;
  readonly birth_datetime_utc: string;
  readonly birth_precision: 'exact' | 'rough_day' | 'rough_month' | 'rough_year' | 'unknown';
  readonly latitude_text: string;
  readonly longitude_text: string;
  readonly iana_time_zone: string;
  readonly place_name: string;
  readonly calculation_sex: CalculationSex;
  readonly cultural_marker: CulturalMarker | '';
  readonly notes: string;
}

export type NatalInputsDraftAction =
  | { type: 'set_calendar_system'; value: CalendarSystem }
  | { type: 'set_raw_local_date_text'; value: string }
  | { type: 'set_raw_local_time_text'; value: string }
  | { type: 'set_raw_place_text'; value: string }
  | { type: 'set_raw_lunar_year'; value: string }
  | { type: 'set_raw_lunar_month'; value: string }
  | { type: 'set_raw_lunar_day'; value: string }
  | { type: 'set_raw_lunar_is_leap_month'; value: boolean | null }
  | { type: 'set_birth_datetime_utc'; value: string }
  | { type: 'set_birth_precision'; value: NatalInputsDraft['birth_precision'] }
  | { type: 'set_latitude_text'; value: string }
  | { type: 'set_longitude_text'; value: string }
  | { type: 'set_iana_time_zone'; value: string }
  | { type: 'set_place_name'; value: string }
  | { type: 'set_calculation_sex'; value: CalculationSex }
  | { type: 'set_cultural_marker'; value: CulturalMarker | '' }
  | { type: 'set_notes'; value: string }
  | { type: 'hydrate_from_natal_inputs'; value: NatalInputs };

export function createEmptyDraft(): NatalInputsDraft {
  return {
    calendar_system: 'gregorian',
    raw_local_date_text: '',
    raw_local_time_text: '',
    raw_place_text: '',
    raw_lunar_year: '',
    raw_lunar_month: '',
    raw_lunar_day: '',
    raw_lunar_is_leap_month: null,
    birth_datetime_utc: '',
    birth_precision: 'exact',
    latitude_text: '',
    longitude_text: '',
    iana_time_zone: '',
    place_name: '',
    calculation_sex: 'unspecified',
    cultural_marker: '',
    notes: '',
  };
}

function hydrateFrom(value: NatalInputs): NatalInputsDraft {
  const raw = value.raw_birth_input;
  return {
    calendar_system: value.calendar_system,
    raw_local_date_text: raw.local_date_text,
    raw_local_time_text: raw.local_time_text ?? '',
    raw_place_text: raw.place_text ?? '',
    raw_lunar_year: raw.lunar_year !== undefined ? String(raw.lunar_year) : '',
    raw_lunar_month: raw.lunar_month !== undefined ? String(raw.lunar_month) : '',
    raw_lunar_day: raw.lunar_day !== undefined ? String(raw.lunar_day) : '',
    raw_lunar_is_leap_month: raw.lunar_is_leap_month ?? null,
    birth_datetime_utc: value.birth_datetime_utc,
    birth_precision: value.birth_precision,
    latitude_text: String(value.birth_location.latitude),
    longitude_text: String(value.birth_location.longitude),
    iana_time_zone: value.birth_location.iana_time_zone,
    place_name: value.birth_location.place_name ?? '',
    calculation_sex: value.calculation_sex,
    cultural_marker: value.cultural_marker ?? '',
    notes: value.notes ?? '',
  };
}

function clearLunarFields(draft: NatalInputsDraft): NatalInputsDraft {
  return {
    ...draft,
    raw_lunar_year: '',
    raw_lunar_month: '',
    raw_lunar_day: '',
    raw_lunar_is_leap_month: null,
  };
}

export function natalInputsDraftReducer(state: NatalInputsDraft, action: NatalInputsDraftAction): NatalInputsDraft {
  switch (action.type) {
    case 'set_calendar_system': {
      if (state.calendar_system === action.value) return state;
      const cleared = action.value === 'gregorian' ? clearLunarFields(state) : state;
      return { ...cleared, calendar_system: action.value };
    }
    case 'set_raw_local_date_text':
      return { ...state, raw_local_date_text: action.value };
    case 'set_raw_local_time_text':
      return { ...state, raw_local_time_text: action.value };
    case 'set_raw_place_text':
      return { ...state, raw_place_text: action.value };
    case 'set_raw_lunar_year':
      return state.calendar_system === 'lunar_chinese' ? { ...state, raw_lunar_year: action.value } : state;
    case 'set_raw_lunar_month':
      return state.calendar_system === 'lunar_chinese' ? { ...state, raw_lunar_month: action.value } : state;
    case 'set_raw_lunar_day':
      return state.calendar_system === 'lunar_chinese' ? { ...state, raw_lunar_day: action.value } : state;
    case 'set_raw_lunar_is_leap_month':
      return state.calendar_system === 'lunar_chinese' ? { ...state, raw_lunar_is_leap_month: action.value } : state;
    case 'set_birth_datetime_utc':
      return { ...state, birth_datetime_utc: action.value };
    case 'set_birth_precision':
      return { ...state, birth_precision: action.value };
    case 'set_latitude_text':
      return { ...state, latitude_text: action.value };
    case 'set_longitude_text':
      return { ...state, longitude_text: action.value };
    case 'set_iana_time_zone':
      return { ...state, iana_time_zone: action.value };
    case 'set_place_name':
      return { ...state, place_name: action.value };
    case 'set_calculation_sex':
      return { ...state, calculation_sex: action.value };
    case 'set_cultural_marker':
      return { ...state, cultural_marker: action.value };
    case 'set_notes':
      return { ...state, notes: action.value };
    case 'hydrate_from_natal_inputs':
      return hydrateFrom(action.value);
    default: {
      const exhaustive: never = action;
      void exhaustive;
      return state;
    }
  }
}

export interface BuildNatalInputsOutcome {
  readonly raw: RawBirthInput;
  readonly inputs: NatalInputs;
}

function parseFinite(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(text: string): number | null {
  const value = parseFinite(text);
  if (value === null || !Number.isInteger(value)) return null;
  return value;
}

export function buildRawBirthInputFromDraft(draft: NatalInputsDraft): RawBirthInput {
  if (draft.calendar_system === 'gregorian') {
    return {
      calendar_system: 'gregorian',
      local_date_text: draft.raw_local_date_text,
      ...(draft.raw_local_time_text.length > 0 ? { local_time_text: draft.raw_local_time_text } : {}),
      ...(draft.raw_place_text.length > 0 ? { place_text: draft.raw_place_text } : {}),
    };
  }
  const lunarYear = parseInteger(draft.raw_lunar_year);
  const lunarMonth = parseInteger(draft.raw_lunar_month);
  const lunarDay = parseInteger(draft.raw_lunar_day);
  const lunarLeap = draft.raw_lunar_is_leap_month;
  return {
    calendar_system: 'lunar_chinese',
    local_date_text: draft.raw_local_date_text,
    ...(draft.raw_local_time_text.length > 0 ? { local_time_text: draft.raw_local_time_text } : {}),
    ...(draft.raw_place_text.length > 0 ? { place_text: draft.raw_place_text } : {}),
    ...(lunarYear !== null ? { lunar_year: lunarYear } : {}),
    ...(lunarMonth !== null ? { lunar_month: lunarMonth } : {}),
    ...(lunarDay !== null ? { lunar_day: lunarDay } : {}),
    ...(lunarLeap !== null ? { lunar_is_leap_month: lunarLeap } : {}),
  };
}

export function buildNatalInputsFromDraft(draft: NatalInputsDraft): NatalInputs {
  const raw = buildRawBirthInputFromDraft(draft);
  const latitude = parseFinite(draft.latitude_text) ?? Number.NaN;
  const longitude = parseFinite(draft.longitude_text) ?? Number.NaN;
  const location: BirthLocation = {
    latitude,
    longitude,
    iana_time_zone: draft.iana_time_zone,
    ...(draft.place_name.length > 0 ? { place_name: draft.place_name } : {}),
  };
  const culturalMarkerEntries = draft.cultural_marker !== ''
    ? ({ cultural_marker: draft.cultural_marker } as { cultural_marker: CulturalMarker })
    : {};
  const inputs: NatalInputs = {
    raw_birth_input: raw,
    birth_datetime_utc: draft.birth_datetime_utc,
    birth_precision: draft.birth_precision,
    calendar_system: draft.calendar_system,
    birth_location: location,
    calculation_sex: draft.calculation_sex,
    ...culturalMarkerEntries,
    ...(draft.notes.length > 0 ? { notes: draft.notes } : {}),
  };
  return inputs;
}
