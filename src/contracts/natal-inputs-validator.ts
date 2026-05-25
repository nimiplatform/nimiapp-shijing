// SJG-DATA-03 — NatalInputs + RawBirthInput + BirthLocation validator.
// Algorithm Contract v1 freezes the input shape; this validator is the
// fail-close gate.

import {
  BIRTH_PRECISIONS,
  CALCULATION_SEXES,
  CALENDAR_SYSTEMS,
  CULTURAL_MARKERS,
  type BirthLocation,
  type NatalInputs,
  type RawBirthInput,
} from '../domain/person.ts';

export type NatalInputsValidationError =
  | { code: 'natal_inputs_birth_datetime_utc_invalid'; received: unknown }
  | { code: 'natal_inputs_birth_precision_invalid'; received: unknown }
  | { code: 'natal_inputs_calendar_system_invalid'; received: unknown }
  | { code: 'natal_inputs_calculation_sex_invalid'; received: unknown }
  | { code: 'natal_inputs_cultural_marker_invalid'; received: unknown }
  | { code: 'natal_inputs_birth_location_missing' }
  | { code: 'natal_inputs_raw_birth_input_missing' }
  | { code: 'natal_inputs_calendar_system_mismatch_raw_and_canonical' }
  | { code: 'raw_birth_input_calendar_system_invalid'; received: unknown }
  | { code: 'raw_birth_input_local_date_text_empty' }
  | { code: 'raw_birth_input_lunar_missing_leap_month_evidence' }
  | { code: 'raw_birth_input_lunar_field_invalid'; field: string; received: unknown }
  | { code: 'raw_birth_input_gregorian_must_not_carry_lunar_fields'; field: string }
  | { code: 'birth_location_latitude_invalid'; received: unknown }
  | { code: 'birth_location_longitude_invalid'; received: unknown }
  | { code: 'birth_location_iana_time_zone_invalid'; received: unknown }
  | { code: 'birth_location_iana_time_zone_offset_only_forbidden'; received: string };

export type NatalInputsValidationResult =
  | { ok: true }
  | { ok: false; error: NatalInputsValidationError };

const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const OFFSET_ONLY_TZ_PATTERN = /^(?:UTC|GMT|Etc\/GMT)?[+-]?\d{1,2}(?::\d{2})?$/i;

export function validateBirthLocation(location: BirthLocation): NatalInputsValidationResult {
  if (typeof location.latitude !== 'number' || !Number.isFinite(location.latitude) || location.latitude < -90 || location.latitude > 90) {
    return { ok: false, error: { code: 'birth_location_latitude_invalid', received: location.latitude } };
  }
  if (typeof location.longitude !== 'number' || !Number.isFinite(location.longitude) || location.longitude < -180 || location.longitude > 180) {
    return { ok: false, error: { code: 'birth_location_longitude_invalid', received: location.longitude } };
  }
  if (typeof location.iana_time_zone !== 'string' || location.iana_time_zone.length === 0) {
    return { ok: false, error: { code: 'birth_location_iana_time_zone_invalid', received: location.iana_time_zone } };
  }
  if (OFFSET_ONLY_TZ_PATTERN.test(location.iana_time_zone)) {
    return { ok: false, error: { code: 'birth_location_iana_time_zone_offset_only_forbidden', received: location.iana_time_zone } };
  }
  if (!location.iana_time_zone.includes('/')) {
    return { ok: false, error: { code: 'birth_location_iana_time_zone_invalid', received: location.iana_time_zone } };
  }
  return { ok: true };
}

export function validateRawBirthInput(raw: RawBirthInput): NatalInputsValidationResult {
  if (!CALENDAR_SYSTEMS.includes(raw.calendar_system)) {
    return { ok: false, error: { code: 'raw_birth_input_calendar_system_invalid', received: raw.calendar_system } };
  }
  if (typeof raw.local_date_text !== 'string' || raw.local_date_text.length === 0) {
    return { ok: false, error: { code: 'raw_birth_input_local_date_text_empty' } };
  }
  const lunarFields: (keyof RawBirthInput)[] = ['lunar_year', 'lunar_month', 'lunar_day', 'lunar_is_leap_month'];
  if (raw.calendar_system === 'gregorian') {
    for (const field of lunarFields) {
      if (raw[field] !== undefined) {
        return { ok: false, error: { code: 'raw_birth_input_gregorian_must_not_carry_lunar_fields', field } };
      }
    }
  }
  if (raw.calendar_system === 'lunar_chinese') {
    const checks: { field: 'lunar_year' | 'lunar_month' | 'lunar_day'; min: number; max: number }[] = [
      { field: 'lunar_year', min: 1, max: 9999 },
      { field: 'lunar_month', min: 1, max: 12 },
      { field: 'lunar_day', min: 1, max: 30 },
    ];
    for (const { field, min, max } of checks) {
      const value = raw[field];
      if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
        return { ok: false, error: { code: 'raw_birth_input_lunar_field_invalid', field, received: value } };
      }
    }
    if (typeof raw.lunar_is_leap_month !== 'boolean') {
      return { ok: false, error: { code: 'raw_birth_input_lunar_missing_leap_month_evidence' } };
    }
  }
  return { ok: true };
}

export function validateNatalInputs(inputs: NatalInputs): NatalInputsValidationResult {
  if (!inputs.raw_birth_input) {
    return { ok: false, error: { code: 'natal_inputs_raw_birth_input_missing' } };
  }
  const rawCheck = validateRawBirthInput(inputs.raw_birth_input);
  if (!rawCheck.ok) return rawCheck;
  if (typeof inputs.birth_datetime_utc !== 'string' || !ISO_UTC_PATTERN.test(inputs.birth_datetime_utc)) {
    return { ok: false, error: { code: 'natal_inputs_birth_datetime_utc_invalid', received: inputs.birth_datetime_utc } };
  }
  if (!BIRTH_PRECISIONS.includes(inputs.birth_precision)) {
    return { ok: false, error: { code: 'natal_inputs_birth_precision_invalid', received: inputs.birth_precision } };
  }
  if (!CALENDAR_SYSTEMS.includes(inputs.calendar_system)) {
    return { ok: false, error: { code: 'natal_inputs_calendar_system_invalid', received: inputs.calendar_system } };
  }
  if (inputs.calendar_system !== inputs.raw_birth_input.calendar_system) {
    return { ok: false, error: { code: 'natal_inputs_calendar_system_mismatch_raw_and_canonical' } };
  }
  if (!CALCULATION_SEXES.includes(inputs.calculation_sex)) {
    return { ok: false, error: { code: 'natal_inputs_calculation_sex_invalid', received: inputs.calculation_sex } };
  }
  if (!inputs.birth_location) {
    return { ok: false, error: { code: 'natal_inputs_birth_location_missing' } };
  }
  if (inputs.cultural_marker !== undefined && !CULTURAL_MARKERS.includes(inputs.cultural_marker)) {
    return { ok: false, error: { code: 'natal_inputs_cultural_marker_invalid', received: inputs.cultural_marker } };
  }
  const locationCheck = validateBirthLocation(inputs.birth_location);
  if (!locationCheck.ok) return locationCheck;
  return { ok: true };
}
