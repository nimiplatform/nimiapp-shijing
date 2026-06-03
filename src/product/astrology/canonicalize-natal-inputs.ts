// SJG-ALGO-04 — natal canonicalization stage.
// - Gregorian inputs: canonical_birth_datetime_utc passed through, true
//   solar time computed from longitude + standard meridian.
// - Lunar (lunar_chinese) inputs: converted to Gregorian via tyme4ts
//   (1900-2099 range), then the same true-solar pipeline applies.

import { LunarHour } from 'tyme4ts';
import type { NatalInputs, RawBirthInput } from '../../domain/person.ts';
import type { NatalCanonicalization } from '../../domain/algorithm.ts';
import { type StageResult } from './stage-result.ts';
import { trueSolarTimeFromInstant, standardHoursForTimeZone } from './true-solar-time.ts';
import { localWallClockToUtcInstant } from './local-wall-clock.ts';
import { computeCanonicalHash } from './canonical-hash.ts';
import { EPHEMERIS_VERSION } from './solar-terms.ts';
import { parseNaturalBirthTime } from './natural-birth-time.ts';

// Back-compat alias for the wave-10 module-local constant. The single
// source of truth lives in `solar-terms.ts::EPHEMERIS_VERSION` per
// SJG-ALGO-06 + SJG-ALGO-08 + SJG-ALGO-11.
export const SHIJING_EPHEMERIS_VERSION = EPHEMERIS_VERSION;

interface LunarComponents {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

function parseLunarComponents(raw: RawBirthInput, birthDatetimeUtc: string): LunarComponents | null {
  let year: number, month: number, day: number;
  if (
    typeof raw.lunar_year === 'number'
    && typeof raw.lunar_month === 'number'
    && typeof raw.lunar_day === 'number'
  ) {
    year = raw.lunar_year;
    // tyme4ts encodes leap months by passing a negative month (-N).
    month = raw.lunar_is_leap_month ? -raw.lunar_month : raw.lunar_month;
    day = raw.lunar_day;
  } else {
    const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.local_date_text.trim());
    if (!dateMatch) return null;
    year = Number(dateMatch[1]);
    month = Number(dateMatch[2]);
    day = Number(dateMatch[3]);
  }
  let hour = 0;
  let minute = 0;
  let second = 0;
  const timeText = raw.local_time_text?.trim() || '';
  if (timeText.length > 0) {
    const parsedTime = parseNaturalBirthTime(timeText);
    if (!parsedTime) return null;
    hour = parsedTime.hour;
    minute = parsedTime.minute;
    second = parsedTime.second;
  } else {
    const utcDate = new Date(birthDatetimeUtc);
    if (!Number.isNaN(utcDate.getTime())) {
      hour = utcDate.getUTCHours();
      minute = utcDate.getUTCMinutes();
      second = utcDate.getUTCSeconds();
    }
  }
  if (year < 1900 || year > 2099) return null;
  const absMonth = Math.abs(month);
  if (absMonth < 1 || absMonth > 12) return null;
  if (day < 1 || day > 30) return null;
  return { year, month, day, hour, minute, second };
}

function pad2(n: number): string { return n < 10 ? `0${n}` : String(n); }
function pad4(n: number): string {
  const s = String(n);
  return s.length >= 4 ? s : '0'.repeat(4 - s.length) + s;
}

function lunarToGregorianLocalIso(components: LunarComponents): string | null {
  try {
    const lh = LunarHour.fromYmdHms(
      components.year, components.month, components.day,
      components.hour, components.minute, components.second,
    );
    const solar = lh.getSolarTime();
    const sd = solar.getSolarDay();
    return `${pad4(sd.getYear())}-${pad2(sd.getMonth())}-${pad2(sd.getDay())}T${pad2(solar.getHour())}:${pad2(solar.getMinute())}:${pad2(solar.getSecond())}`;
  } catch {
    return null;
  }
}

export function canonicalizeNatalInputs(inputs: NatalInputs): StageResult<NatalCanonicalization> {
  const standardHours = standardHoursForTimeZone(inputs.birth_location.iana_time_zone);
  if (standardHours === null) {
    return {
      ok: false,
      error: {
        stage: 'canonicalize_natal_inputs',
        kind: 'stage_missing_input',
        detail: `IANA timezone ${inputs.birth_location.iana_time_zone} is not in the wave-10 standard-hours table; admit a fuller TZ table or supply a recognised id.`,
      },
    };
  }

  let canonicalBirthUtcIso = inputs.birth_datetime_utc;
  let calendarConversionSource: NatalCanonicalization['calendar_conversion_source'] = 'input_gregorian';

  if (inputs.calendar_system === 'lunar_chinese') {
    const components = parseLunarComponents(inputs.raw_birth_input, inputs.birth_datetime_utc);
    if (!components) {
      return {
        ok: false,
        error: {
          stage: 'canonicalize_natal_inputs',
          kind: 'stage_invalid_input',
          detail: 'lunar_chinese inputs must supply local_date_text=YYYY-MM-DD (1900-2099) and optional local_time_text=HH:MM[:SS]',
        },
      };
    }
    const localIso = lunarToGregorianLocalIso(components);
    if (!localIso) {
      return {
        ok: false,
        error: {
          stage: 'canonicalize_natal_inputs',
          kind: 'stage_invalid_input',
          detail: 'lunar_chinese to gregorian conversion failed (tyme4ts rejected the date — likely invalid lunar date)',
        },
      };
    }
    const utcInstant = localWallClockToUtcInstant(localIso, inputs.birth_location.iana_time_zone);
    if (!utcInstant) {
      return {
        ok: false,
        error: {
          stage: 'canonicalize_natal_inputs',
          kind: 'stage_invalid_input',
          detail: `lunar→gregorian local wall-clock could not be converted to UTC for ${inputs.birth_location.iana_time_zone}`,
        },
      };
    }
    canonicalBirthUtcIso = utcInstant.toISOString();
    calendarConversionSource = 'lunar_to_gregorian';
  }

  const birthUtc = new Date(canonicalBirthUtcIso);
  if (Number.isNaN(birthUtc.getTime())) {
    return {
      ok: false,
      error: {
        stage: 'canonicalize_natal_inputs',
        kind: 'stage_invalid_input',
        detail: `birth_datetime_utc ${canonicalBirthUtcIso} is not a valid Date instant`,
      },
    };
  }
  const trueSolar = trueSolarTimeFromInstant(
    birthUtc,
    inputs.birth_location.longitude,
    standardHours,
  );
  const status: NatalCanonicalization['status'] = inputs.birth_precision === 'exact' ? 'exact' : 'approximate';
  // SJG-ALGO-04: preserve raw_birth_input verbatim AND its canonical hash.
  const canonical: NatalCanonicalization = {
    raw_birth_input: inputs.raw_birth_input,
    raw_birth_input_hash: computeCanonicalHash(inputs.raw_birth_input),
    canonical_birth_datetime_utc: canonicalBirthUtcIso,
    canonical_birth_precision: inputs.birth_precision,
    true_solar_time_utc: new Date(trueSolar.true_solar_time_utc_ms).toISOString(),
    standard_meridian_longitude: trueSolar.standard_meridian_longitude,
    longitude_correction_minutes: trueSolar.longitude_correction_minutes,
    equation_of_time_minutes: trueSolar.equation_of_time_minutes,
    calendar_conversion_source: calendarConversionSource,
    ephemeris_version: EPHEMERIS_VERSION,
    status,
  };
  return { ok: true, value: canonical };
}
