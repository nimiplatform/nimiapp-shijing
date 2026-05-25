// Wave-7 — bridge between the form state machine and the wave-4
// validateNatalInputs gate. Returns a typed result that the UI can
// render as a field-level error message OR a "draft is valid → safe
// to submit" success state.

import { validateNatalInputs, type NatalInputsValidationError } from '../../contracts/natal-inputs-validator.ts';
import type { NatalInputs } from '../../domain/person.ts';
import {
  buildNatalInputsFromDraft,
  type NatalInputsDraft,
} from './natal-inputs-state.ts';

export type DraftValidationOutcome =
  | { ok: true; inputs: NatalInputs }
  | { ok: false; inputs: NatalInputs; error: NatalInputsValidationError };

export function validateDraft(draft: NatalInputsDraft): DraftValidationOutcome {
  const inputs = buildNatalInputsFromDraft(draft);
  const result = validateNatalInputs(inputs);
  if (result.ok) return { ok: true, inputs };
  return { ok: false, inputs, error: result.error };
}

const ERROR_CODE_TO_USER_MESSAGE: Readonly<Record<string, string>> = {
  natal_inputs_birth_datetime_utc_invalid:
    'birth_datetime_utc must be an ISO-8601 UTC instant (e.g. 1990-04-12T08:30:00Z).',
  natal_inputs_birth_precision_invalid: 'birth_precision must be one of the admitted enum values.',
  natal_inputs_calendar_system_invalid: 'calendar_system must be gregorian or lunar_chinese.',
  natal_inputs_calculation_sex_invalid: 'calculation_sex must be male / female / unspecified.',
  natal_inputs_cultural_marker_invalid:
    'cultural_marker must be natal_yang / natal_yin / unspecified (or leave empty).',
  natal_inputs_birth_location_missing: 'birth_location is required.',
  natal_inputs_raw_birth_input_missing: 'raw_birth_input is required.',
  natal_inputs_calendar_system_mismatch_raw_and_canonical:
    'calendar_system must agree between raw_birth_input and the canonical record.',
  raw_birth_input_calendar_system_invalid:
    'raw_birth_input.calendar_system must be gregorian or lunar_chinese.',
  raw_birth_input_local_date_text_empty: 'raw_birth_input.local_date_text must not be empty.',
  raw_birth_input_lunar_missing_leap_month_evidence:
    'Chinese lunar inputs require an explicit lunar_is_leap_month checkbox.',
  raw_birth_input_lunar_field_invalid:
    'lunar_year / lunar_month / lunar_day must be integers within admitted ranges.',
  raw_birth_input_gregorian_must_not_carry_lunar_fields:
    'Gregorian inputs must not carry lunar fields; switch the calendar to lunar_chinese first.',
  birth_location_latitude_invalid: 'latitude must be a finite number in [-90, 90].',
  birth_location_longitude_invalid: 'longitude must be a finite number in [-180, 180].',
  birth_location_iana_time_zone_invalid:
    'iana_time_zone must be an IANA timezone id such as Asia/Shanghai.',
  birth_location_iana_time_zone_offset_only_forbidden:
    'Offset-only strings (UTC+08, +08:00, Etc/GMT+8) are not accepted; use an IANA timezone id.',
};

export function userMessageForValidationError(error: NatalInputsValidationError): string {
  return ERROR_CODE_TO_USER_MESSAGE[error.code] ?? `Invalid input: ${error.code}`;
}
