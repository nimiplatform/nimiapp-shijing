import { LunarHour } from 'tyme4ts';

import { validateNatalInputs, type NatalInputsValidationError } from '../../contracts/natal-inputs-validator.ts';
import type { BirthPrecision, NatalInputs, RawBirthInput } from '../../domain/person.ts';
import { canonicalizeNatalInputs } from '../astrology/canonicalize-natal-inputs.ts';
import type { StageFailure } from '../astrology/stage-result.ts';
import { standardHoursForTimeZone } from '../astrology/true-solar-time.ts';
import type { NaturalBirthDraft } from './natural-birth-draft.ts';
import { birthLocationFromResolvedPlace, resolveBirthPlace, type ResolvedBirthPlace } from './natural-birth-place.ts';
import { parseNaturalBirthTime, type ParsedNaturalBirthTime } from './natural-birth-time.ts';

export type NaturalBirthBuildError =
  | { code: 'natural_birth_gregorian_date_invalid'; received: string }
  | { code: 'natural_birth_lunar_field_invalid'; field: 'lunar_year' | 'lunar_month' | 'lunar_day'; received: string }
  | { code: 'natural_birth_lunar_missing_leap_month_evidence' }
  | { code: 'natural_birth_lunar_conversion_failed' }
  | { code: 'natural_birth_time_required_for_exact' }
  | { code: 'natural_birth_time_invalid'; received: string }
  | { code: 'natural_birth_place_unresolved'; received: string }
  | { code: 'natural_birth_utc_conversion_failed'; iana_time_zone: string }
  | { code: 'natural_birth_natal_inputs_invalid'; error: NatalInputsValidationError }
  | { code: 'natural_birth_canonicalization_failed'; error: StageFailure };

export type NaturalBirthBuildOutcome =
  | { ok: true; inputs: NatalInputs; preview: NaturalBirthPreview }
  | { ok: false; error: NaturalBirthBuildError; preview: NaturalBirthPreview };

export interface NaturalBirthPreview {
  readonly status: 'ready' | 'incomplete';
  readonly local_datetime_text?: string;
  readonly place?: ResolvedBirthPlace;
  readonly birth_datetime_utc?: string;
  readonly birth_precision: BirthPrecision;
  readonly utc_write_explanation?: string;
  readonly technical_details?: string;
}

interface ParsedDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function pad4(value: number): string {
  const text = String(value);
  return text.length >= 4 ? text : `${'0'.repeat(4 - text.length)}${text}`;
}

function parseGregorianDate(text: string): ParsedDate | null {
  const trimmed = text.trim();
  if (/^\d{4}$/.test(trimmed)) {
    const yearOnly = Number(trimmed);
    if (yearOnly >= 1 && yearOnly <= 9999) return { year: yearOnly, month: 1, day: 1 };
  }
  const match = /^(\d{4})(?:[-/.](\d{1,2})(?:[-/.](\d{1,2}))?|\s*年\s*(?:(\d{1,2})\s*月\s*)?(?:(\d{1,2})\s*日?)?)$/.exec(trimmed);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2] ?? match[4] ?? '1');
  const day = Number(match[3] ?? match[5] ?? '1');
  if (!Number.isInteger(year) || year < 1 || year > 9999) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (!Number.isInteger(day) || day < 1 || day > maxDay) return null;
  return { year, month, day };
}

function parseIntegerText(text: string, min: number, max: number): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value < min || value > max) return null;
  return value;
}

function localIso(date: ParsedDate, time: ParsedNaturalBirthTime): string {
  return `${pad4(date.year)}-${pad2(date.month)}-${pad2(date.day)}T${pad2(time.hour)}:${pad2(time.minute)}:${pad2(time.second)}`;
}

function localWallClockToUtcInstant(localIsoText: string, ianaTimeZone: string): Date | null {
  const standardHours = standardHoursForTimeZone(ianaTimeZone);
  if (standardHours !== null) {
    const probe = new Date(`${localIsoText}Z`);
    if (Number.isNaN(probe.getTime())) return null;
    return new Date(probe.getTime() - standardHours * 60 * 60 * 1000);
  }
  try {
    const probe = new Date(`${localIsoText}Z`);
    if (Number.isNaN(probe.getTime())) return null;
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: ianaTimeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = formatter.formatToParts(probe);
    const get = (type: Intl.DateTimeFormatPartTypes): number => {
      const part = parts.find((candidate) => candidate.type === type);
      return part ? Number(part.value) : NaN;
    };
    const zonedAsUtc = Date.UTC(
      get('year'),
      get('month') - 1,
      get('day'),
      get('hour'),
      get('minute'),
      get('second'),
    );
    if (Number.isNaN(zonedAsUtc)) return null;
    const offsetMs = zonedAsUtc - probe.getTime();
    return new Date(probe.getTime() - offsetMs);
  } catch {
    return null;
  }
}

function lunarToGregorianDate(year: number, month: number, day: number, isLeapMonth: boolean, time: ParsedNaturalBirthTime): ParsedDate | null {
  try {
    const lunarMonth = isLeapMonth ? -month : month;
    const lunar = LunarHour.fromYmdHms(year, lunarMonth, day, time.hour, time.minute, time.second);
    const solarDay = lunar.getSolarTime().getSolarDay();
    return {
      year: solarDay.getYear(),
      month: solarDay.getMonth(),
      day: solarDay.getDay(),
    };
  } catch {
    return null;
  }
}

function parseDraftTime(draft: NaturalBirthDraft): { ok: true; time: ParsedNaturalBirthTime } | { ok: false; error: NaturalBirthBuildError } {
  const trimmed = draft.local_time_text.trim();
  if (!trimmed) {
    if (draft.birth_precision === 'exact') {
      return { ok: false, error: { code: 'natural_birth_time_required_for_exact' } };
    }
    return { ok: true, time: { hour: 0, minute: 0, second: 0 } };
  }
  const time = parseNaturalBirthTime(trimmed);
  if (!time) return { ok: false, error: { code: 'natural_birth_time_invalid', received: draft.local_time_text } };
  return { ok: true, time };
}

function parseDraftDate(draft: NaturalBirthDraft, time: ParsedNaturalBirthTime): {
  ok: true;
  date: ParsedDate;
  raw: RawBirthInput;
} | { ok: false; error: NaturalBirthBuildError } {
  if (draft.calendar_system === 'gregorian') {
    const date = parseGregorianDate(draft.gregorian_date_text);
    if (!date) {
      return { ok: false, error: { code: 'natural_birth_gregorian_date_invalid', received: draft.gregorian_date_text } };
    }
    const raw: RawBirthInput = {
      calendar_system: 'gregorian',
      local_date_text: draft.gregorian_date_text.trim(),
      ...(draft.local_time_text.trim() ? { local_time_text: draft.local_time_text.trim() } : {}),
      ...(draft.place_text.trim() ? { place_text: draft.place_text.trim() } : {}),
    };
    return { ok: true, date, raw };
  }

  const lunarYear = parseIntegerText(draft.lunar_year_text, 1900, 2099);
  const lunarMonth = parseIntegerText(draft.lunar_month_text, 1, 12);
  const lunarDay = parseIntegerText(draft.lunar_day_text, 1, 30);
  if (lunarYear === null) {
    return { ok: false, error: { code: 'natural_birth_lunar_field_invalid', field: 'lunar_year', received: draft.lunar_year_text } };
  }
  if (lunarMonth === null) {
    return { ok: false, error: { code: 'natural_birth_lunar_field_invalid', field: 'lunar_month', received: draft.lunar_month_text } };
  }
  if (lunarDay === null) {
    return { ok: false, error: { code: 'natural_birth_lunar_field_invalid', field: 'lunar_day', received: draft.lunar_day_text } };
  }
  if (draft.lunar_is_leap_month === null) {
    return { ok: false, error: { code: 'natural_birth_lunar_missing_leap_month_evidence' } };
  }
  const date = lunarToGregorianDate(lunarYear, lunarMonth, lunarDay, draft.lunar_is_leap_month, time);
  if (!date) return { ok: false, error: { code: 'natural_birth_lunar_conversion_failed' } };
  const localDateText = `${lunarYear}-${pad2(lunarMonth)}-${pad2(lunarDay)}`;
  const raw: RawBirthInput = {
    calendar_system: 'lunar_chinese',
    local_date_text: localDateText,
    lunar_year: lunarYear,
    lunar_month: lunarMonth,
    lunar_day: lunarDay,
    lunar_is_leap_month: draft.lunar_is_leap_month,
    ...(draft.local_time_text.trim() ? { local_time_text: draft.local_time_text.trim() } : {}),
    ...(draft.place_text.trim() ? { place_text: draft.place_text.trim() } : {}),
  };
  return { ok: true, date, raw };
}

function incompletePreview(draft: NaturalBirthDraft, place?: ResolvedBirthPlace): NaturalBirthPreview {
  return {
    status: 'incomplete',
    birth_precision: draft.birth_precision,
    ...(place ? { place } : {}),
  };
}

export function buildNaturalBirthNatalInputs(draft: NaturalBirthDraft): NaturalBirthBuildOutcome {
  const place = resolveBirthPlace(draft.place_text);
  if (!place) {
    return {
      ok: false,
      error: { code: 'natural_birth_place_unresolved', received: draft.place_text },
      preview: incompletePreview(draft),
    };
  }

  const timeOutcome = parseDraftTime(draft);
  if (!timeOutcome.ok) {
    return { ok: false, error: timeOutcome.error, preview: incompletePreview(draft, place) };
  }
  const dateOutcome = parseDraftDate(draft, timeOutcome.time);
  if (!dateOutcome.ok) {
    return { ok: false, error: dateOutcome.error, preview: incompletePreview(draft, place) };
  }

  const localIsoText = localIso(dateOutcome.date, timeOutcome.time);
  const utcInstant = localWallClockToUtcInstant(localIsoText, place.iana_time_zone);
  if (!utcInstant) {
    return {
      ok: false,
      error: { code: 'natural_birth_utc_conversion_failed', iana_time_zone: place.iana_time_zone },
      preview: incompletePreview(draft, place),
    };
  }
  const birthDatetimeUtc = utcInstant.toISOString();
  const inputs: NatalInputs = {
    raw_birth_input: dateOutcome.raw,
    birth_datetime_utc: birthDatetimeUtc,
    birth_precision: draft.birth_precision,
    calendar_system: draft.calendar_system,
    birth_location: birthLocationFromResolvedPlace(place),
    calculation_sex: draft.calculation_sex,
    ...(draft.notes.trim() ? { notes: draft.notes.trim() } : {}),
  };

  const preview: NaturalBirthPreview = {
    status: 'ready',
    local_datetime_text: localIsoText.replace('T', ' '),
    place,
    birth_datetime_utc: birthDatetimeUtc,
    birth_precision: draft.birth_precision,
    utc_write_explanation: `按 ${place.iana_time_zone} 将本地时间 ${localIsoText.replace('T', ' ')} 写入为 ${birthDatetimeUtc}`,
    technical_details: JSON.stringify(
      {
        birth_datetime_utc: birthDatetimeUtc,
        utc_write_explanation: `按 ${place.iana_time_zone} 将本地时间 ${localIsoText.replace('T', ' ')} 写入为 ${birthDatetimeUtc}`,
        birth_location: inputs.birth_location,
        raw_birth_input: inputs.raw_birth_input,
      },
      null,
      2,
    ),
  };

  const validation = validateNatalInputs(inputs);
  if (!validation.ok) {
    return {
      ok: false,
      error: { code: 'natural_birth_natal_inputs_invalid', error: validation.error },
      preview,
    };
  }
  const canonical = canonicalizeNatalInputs(inputs);
  if (!canonical.ok) {
    return {
      ok: false,
      error: { code: 'natural_birth_canonicalization_failed', error: canonical.error },
      preview,
    };
  }
  return { ok: true, inputs, preview };
}

export function userMessageForNaturalBirthError(error: NaturalBirthBuildError): string {
  switch (error.code) {
    case 'natural_birth_gregorian_date_invalid':
      return '请填写可识别的公历日期，例如 1990-04-12 或 1990 年 4 月 12 日。';
    case 'natural_birth_lunar_field_invalid':
      return '请填写有效的农历年、月、日；当前仅支持 1900–2099 年。';
    case 'natural_birth_lunar_missing_leap_month_evidence':
      return '农历日期必须明确选择是否闰月。';
    case 'natural_birth_lunar_conversion_failed':
      return '这组农历日期无法标准化，请检查日期和闰月选择。';
    case 'natural_birth_time_required_for_exact':
      return '时间精度选择“准确”时，需要填写具体出生时间。';
    case 'natural_birth_time_invalid':
      return '请填写可识别的出生时间，例如 08:30 或 23:00。';
    case 'natural_birth_place_unresolved':
      return '暂未识别这个出生地点。请填写省市区中文名（例：湖北省钟祥市、上海市黄浦区、北京），若同名地点存在多处请补全到省级。';
    case 'natural_birth_utc_conversion_failed':
      return '出生地点对应的时区无法转换本地时间，请检查地点。';
    case 'natural_birth_natal_inputs_invalid':
      return '标准化后的出生资料未通过合同校验，请检查出生记录。';
    case 'natural_birth_canonicalization_failed':
      return '标准化预检失败，无法保存为排盘输入。';
    default: {
      const exhaustive: never = error;
      void exhaustive;
      return '出生记录无法标准化，请检查输入。';
    }
  }
}

export function technicalDetailForNaturalBirthError(error: NaturalBirthBuildError): string {
  return JSON.stringify(error, null, 2);
}
