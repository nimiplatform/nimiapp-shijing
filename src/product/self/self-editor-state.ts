// W-c03 Settings > Self — pure-state helpers for editing
// ShiJingSpace.self_subject.natal_inputs.
//
// The editor surface produces a NatalInputs draft. Commits run through
// validateNatalInputs before reaching the reducer; failure surfaces as
// a typed editor error, never a silent fail-open.

import type {
  BirthLocation,
  BirthPrecision,
  CalculationSex,
  CalendarSystem,
  CulturalMarker,
  NatalInputs,
  RawBirthInput,
} from '../../domain/person.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import {
  validateNatalInputs,
  type NatalInputsValidationError,
} from '../../contracts/natal-inputs-validator.ts';
import { localWallClockToUtcInstant } from '../astrology/local-wall-clock.ts';

export interface SelfNatalDraft {
  readonly calendar_system: CalendarSystem;
  readonly local_date_text: string;
  readonly local_time_text: string;
  readonly place_text: string;
  readonly lunar_year: string;
  readonly lunar_month: string;
  readonly lunar_day: string;
  readonly lunar_is_leap_month: 'unanswered' | 'normal' | 'leap';
  readonly birth_datetime_utc: string;
  readonly birth_precision: BirthPrecision;
  readonly calculation_sex: CalculationSex;
  readonly cultural_marker: CulturalMarker | '';
  readonly latitude: string;
  readonly longitude: string;
  readonly iana_time_zone: string;
  readonly place_name: string;
  readonly notes: string;
}

// A neutral natal draft with no birth data filled in. Used to seed a fresh
// Person so it starts from a blank chart (rather than silently inheriting the
// self subject's birth data, which would make every person an identical copy).
export function emptyNatalDraft(): SelfNatalDraft {
  return {
    calendar_system: 'gregorian',
    local_date_text: '',
    local_time_text: '',
    place_text: '',
    lunar_year: '',
    lunar_month: '',
    lunar_day: '',
    lunar_is_leap_month: 'unanswered',
    birth_datetime_utc: '',
    birth_precision: 'exact',
    calculation_sex: 'unspecified',
    cultural_marker: '',
    latitude: '',
    longitude: '',
    iana_time_zone: '',
    place_name: '',
    notes: '',
  };
}

export function selfDraftFromSpace(space: ShiJingSpace): SelfNatalDraft {
  const inputs = space.self_subject.natal_inputs;
  const raw = inputs.raw_birth_input;
  const loc = inputs.birth_location;
  return {
    calendar_system: raw.calendar_system,
    local_date_text: raw.local_date_text,
    local_time_text: raw.local_time_text ?? '',
    place_text: raw.place_text ?? '',
    lunar_year: raw.lunar_year !== undefined ? String(raw.lunar_year) : '',
    lunar_month: raw.lunar_month !== undefined ? String(raw.lunar_month) : '',
    lunar_day: raw.lunar_day !== undefined ? String(raw.lunar_day) : '',
    lunar_is_leap_month:
      raw.lunar_is_leap_month === undefined
        ? 'unanswered'
        : raw.lunar_is_leap_month
          ? 'leap'
          : 'normal',
    birth_datetime_utc: inputs.birth_datetime_utc,
    birth_precision: inputs.birth_precision,
    calculation_sex: inputs.calculation_sex,
    cultural_marker: inputs.cultural_marker ?? '',
    latitude: String(loc.latitude),
    longitude: String(loc.longitude),
    iana_time_zone: loc.iana_time_zone,
    place_name: loc.place_name ?? '',
    notes: inputs.notes ?? '',
  };
}

export type SelfDraftBuildError =
  | { code: 'lunar_field_invalid'; field: 'lunar_year' | 'lunar_month' | 'lunar_day' }
  | { code: 'latitude_invalid' }
  | { code: 'longitude_invalid' }
  | {
      code: 'birth_datetime_underivable';
      reason: 'local_date_invalid' | 'local_time_invalid' | 'timezone_conversion_failed';
    };

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_TIME_PATTERN = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

// Derive the canonical UTC instant from the local civil date/time + IANA zone.
// The UI no longer asks the user to enter birth_datetime_utc separately — it is
// fully determined by these three fields (the validator already requires the
// timezone), so deriving it here removes a redundant, error-prone manual entry.
function deriveBirthDatetimeUtc(
  draft: SelfNatalDraft,
): { ok: true; value: string } | { ok: false; error: SelfDraftBuildError } {
  const dateText = draft.local_date_text.trim();
  if (!LOCAL_DATE_PATTERN.test(dateText)) {
    return { ok: false, error: { code: 'birth_datetime_underivable', reason: 'local_date_invalid' } };
  }
  let hh = '00';
  let mm = '00';
  let ss = '00';
  const timeText = draft.local_time_text.trim();
  if (timeText.length > 0) {
    const match = LOCAL_TIME_PATTERN.exec(timeText);
    if (!match) {
      return { ok: false, error: { code: 'birth_datetime_underivable', reason: 'local_time_invalid' } };
    }
    hh = match[1].padStart(2, '0');
    mm = match[2];
    ss = match[3] ?? '00';
  }
  const instant = localWallClockToUtcInstant(`${dateText}T${hh}:${mm}:${ss}`, draft.iana_time_zone);
  if (!instant) {
    return { ok: false, error: { code: 'birth_datetime_underivable', reason: 'timezone_conversion_failed' } };
  }
  return { ok: true, value: instant.toISOString() };
}

export type SelfDraftBuildResult =
  | { ok: true; inputs: NatalInputs }
  | { ok: false; error: SelfDraftBuildError };

function parseInt10(value: string): number | null {
  if (value.trim().length === 0) return null;
  const n = Number(value);
  if (!Number.isInteger(n)) return null;
  return n;
}

function parseFloatStrict(value: string): number | null {
  if (value.trim().length === 0) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function buildSelfNatalInputs(draft: SelfNatalDraft): SelfDraftBuildResult {
  let lunarFields: Partial<Pick<RawBirthInput, 'lunar_year' | 'lunar_month' | 'lunar_day' | 'lunar_is_leap_month'>> = {};
  if (draft.calendar_system === 'lunar_chinese') {
    const lunarYear = parseInt10(draft.lunar_year);
    const lunarMonth = parseInt10(draft.lunar_month);
    const lunarDay = parseInt10(draft.lunar_day);
    if (lunarYear === null) return { ok: false, error: { code: 'lunar_field_invalid', field: 'lunar_year' } };
    if (lunarMonth === null) return { ok: false, error: { code: 'lunar_field_invalid', field: 'lunar_month' } };
    if (lunarDay === null) return { ok: false, error: { code: 'lunar_field_invalid', field: 'lunar_day' } };
    lunarFields = {
      lunar_year: lunarYear,
      lunar_month: lunarMonth,
      lunar_day: lunarDay,
      lunar_is_leap_month: draft.lunar_is_leap_month === 'leap',
    };
  }
  const raw: RawBirthInput = {
    calendar_system: draft.calendar_system,
    local_date_text: draft.local_date_text,
    ...(draft.local_time_text.length > 0 ? { local_time_text: draft.local_time_text } : {}),
    ...(draft.place_text.length > 0 ? { place_text: draft.place_text } : {}),
    ...lunarFields,
  };

  const lat = parseFloatStrict(draft.latitude);
  if (lat === null) return { ok: false, error: { code: 'latitude_invalid' } };
  const lon = parseFloatStrict(draft.longitude);
  if (lon === null) return { ok: false, error: { code: 'longitude_invalid' } };

  const location: BirthLocation = {
    latitude: lat,
    longitude: lon,
    iana_time_zone: draft.iana_time_zone,
    ...(draft.place_name.length > 0 ? { place_name: draft.place_name } : {}),
  };

  const derivedUtc = deriveBirthDatetimeUtc(draft);
  if (!derivedUtc.ok) return derivedUtc;

  const inputs: NatalInputs = {
    raw_birth_input: raw,
    birth_datetime_utc: derivedUtc.value,
    birth_precision: draft.birth_precision,
    calendar_system: draft.calendar_system,
    birth_location: location,
    calculation_sex: draft.calculation_sex,
    ...(draft.cultural_marker.length > 0 ? { cultural_marker: draft.cultural_marker as CulturalMarker } : {}),
    ...(draft.notes.length > 0 ? { notes: draft.notes } : {}),
  };
  return { ok: true, inputs };
}

export type SelfCommitOutcome =
  | { ok: true; next_space: ShiJingSpace }
  | { ok: false; error: SelfDraftBuildError | { code: 'natal_inputs_invalid'; detail: NatalInputsValidationError } };

export function commitSelfDraft(space: ShiJingSpace, draft: SelfNatalDraft): SelfCommitOutcome {
  const built = buildSelfNatalInputs(draft);
  if (!built.ok) return { ok: false, error: built.error };
  const check = validateNatalInputs(built.inputs);
  if (!check.ok) {
    return { ok: false, error: { code: 'natal_inputs_invalid', detail: check.error } };
  }
  const next_space: ShiJingSpace = {
    ...space,
    self_subject: { ...space.self_subject, natal_inputs: built.inputs },
  };
  return { ok: true, next_space };
}
