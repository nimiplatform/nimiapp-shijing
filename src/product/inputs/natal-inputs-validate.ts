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

// User-facing messages keyed by validator code. Field references use
// human field names; format examples are illustrative. The raw code
// stays available to the caller for placement inside <TechnicalDetails>.
const ERROR_CODE_TO_USER_MESSAGE: Readonly<Record<string, string>> = {
  natal_inputs_birth_datetime_utc_invalid:
    '「出生时刻」格式不正确，请使用标准 UTC 时间格式（示例：1990-04-12T08:30:00Z）。',
  natal_inputs_birth_precision_invalid:
    '请选择有效的「时间精度」。',
  natal_inputs_calendar_system_invalid:
    '「历法」必须为公历或农历。',
  natal_inputs_calculation_sex_invalid:
    '请选择有效的「用于推算的性别」。',
  natal_inputs_cultural_marker_invalid:
    '请选择有效的「文化标记」，或留空。',
  natal_inputs_birth_location_missing:
    '「出生地点」是必填项。',
  natal_inputs_raw_birth_input_missing:
    '「原始记录」是必填项。',
  natal_inputs_calendar_system_mismatch_raw_and_canonical:
    '「历法」在原始记录与标准化时刻中需保持一致。',
  raw_birth_input_calendar_system_invalid:
    '「历法」必须为公历或农历。',
  raw_birth_input_local_date_text_empty:
    '「出生日期（按记录原文）」不能为空。',
  raw_birth_input_lunar_missing_leap_month_evidence:
    '农历输入必须明确选择「是否闰月」。',
  raw_birth_input_lunar_field_invalid:
    '「农历年 / 月 / 日」必须为有效整数（年 1–9999，月 1–12，日 1–30）。',
  raw_birth_input_gregorian_must_not_carry_lunar_fields:
    '公历不应包含农历字段；如需录入农历，请先将「历法」切换为农历。',
  birth_location_latitude_invalid:
    '「出生地纬度」必须是 -90 到 90 之间的数。',
  birth_location_longitude_invalid:
    '「出生地经度」必须是 -180 到 180 之间的数。',
  birth_location_iana_time_zone_invalid:
    '「时区」必须是 IANA 标准时区，例如 Asia/Shanghai。',
  birth_location_iana_time_zone_offset_only_forbidden:
    '「时区」不接受 UTC+08、+08:00 等偏移格式，请使用 Asia/Shanghai 这样的标准时区。',
};

export function userMessageForValidationError(error: NatalInputsValidationError): string {
  return ERROR_CODE_TO_USER_MESSAGE[error.code] ?? '生辰输入有误，请检查表单。';
}
