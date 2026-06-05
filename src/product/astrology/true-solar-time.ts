// Wave-10 — true solar time correction. Approximation good to ~±15 s
// for the 1850-2100 range; ephemeris_version = "shijing-approx-v1".

export function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.floor((date.getTime() - start) / (24 * 60 * 60 * 1000)) + 1;
}

// Equation of time (in minutes). NOAA / Spencer approximation.
export function equationOfTimeMinutes(date: Date): number {
  const n = dayOfYear(date);
  const gamma = (2 * Math.PI / 365) * (n - 1);
  return 229.18 * (
    0.000075 +
    0.001868 * Math.cos(gamma) -
    0.032077 * Math.sin(gamma) -
    0.014615 * Math.cos(2 * gamma) -
    0.040849 * Math.sin(2 * gamma)
  );
}

export interface TrueSolarTimeResult {
  readonly true_solar_time_utc_ms: number;
  readonly standard_meridian_longitude: number;
  readonly longitude_correction_minutes: number;
  readonly equation_of_time_minutes: number;
}

// Compute the true-solar wall clock from a genuine UTC birth instant + the
// recorded IANA timezone standard offset (hours) + the birth longitude.
//
// `birth_datetime_utc` is a real UTC instant (the UI builds it via
// localWallClockToUtcInstant). We first convert it to the zone's STANDARD civil
// wall clock by adding the standard offset — because birthUtc was computed with
// the actual (possibly DST) offset, adding the standard offset back removes any
// DST hour — then apply the minute-scale true-solar correction (longitude +
// equation of time). The returned `true_solar_time_utc_ms` is a "naive" instant
// whose UTC fields ARE the local apparent-solar wall clock the engines read.
export function trueSolarTimeFromInstant(
  birthUtc: Date,
  longitudeDegrees: number,
  standardMeridianHours: number,
): TrueSolarTimeResult {
  const standardMeridianLongitude = standardMeridianHours * 15;
  const longitudeCorrectionMinutes = (longitudeDegrees - standardMeridianLongitude) * 4;
  const eotMinutes = equationOfTimeMinutes(birthUtc);
  const standardOffsetMs = standardMeridianHours * 60 * 60 * 1000;
  const totalCorrectionMs = (longitudeCorrectionMinutes + eotMinutes) * 60 * 1000;
  return {
    true_solar_time_utc_ms: birthUtc.getTime() + standardOffsetMs + totalCorrectionMs,
    standard_meridian_longitude: standardMeridianLongitude,
    longitude_correction_minutes: longitudeCorrectionMinutes,
    equation_of_time_minutes: eotMinutes,
  };
}

// Standard meridian hours derived from the IANA timezone id. Wave-10
// accepts only the IANA ids we can map to a single offset value
// without DST; ambiguous zones (those with DST) are approximated to
// their standard (winter) offset.
export const IANA_TIMEZONE_STANDARD_HOURS: Readonly<Record<string, number>> = {
  'Etc/UTC': 0,
  'Etc/GMT': 0,
  'Asia/Shanghai': 8,
  'Asia/Beijing': 8,
  'Asia/Hong_Kong': 8,
  'Asia/Taipei': 8,
  'Asia/Tokyo': 9,
  'Asia/Seoul': 9,
  'Asia/Singapore': 8,
  'Asia/Bangkok': 7,
  'Asia/Kolkata': 5.5,
  'Asia/Dubai': 4,
  'Europe/London': 0,
  'Europe/Paris': 1,
  'Europe/Berlin': 1,
  'Europe/Moscow': 3,
  'America/New_York': -5,
  'America/Chicago': -6,
  'America/Denver': -7,
  'America/Los_Angeles': -8,
  'Australia/Sydney': 10,
};

// SJG-ALGO-05 — derive standard-offset hours from any IANA id by asking
// `Intl.DateTimeFormat` for the wall-clock at a January (Northern winter)
// instant, then differencing from the same UTC instant. January is chosen
// to land outside DST for the Northern hemisphere; Southern-hemisphere
// summer DST is the known approximate path the deterministic stages
// already mark `approximate`. Returns null only for malformed IANA ids
// that `Intl.DateTimeFormat` itself rejects at construction.
function deriveStandardHoursFromIntl(iana: string): number | null {
  try {
    const probeUtc = Date.UTC(2024, 0, 15, 0, 0, 0); // 2024-01-15T00:00:00Z
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: iana,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    const parts = dtf.formatToParts(new Date(probeUtc));
    const get = (type: Intl.DateTimeFormatPartTypes): number => {
      const part = parts.find((p) => p.type === type);
      return part ? Number(part.value) : NaN;
    };
    const y = get('year'), m = get('month'), d = get('day');
    const hh = get('hour'), mm = get('minute'), ss = get('second');
    if ([y, m, d, hh, mm, ss].some(Number.isNaN)) return null;
    const wallUtc = Date.UTC(y, m - 1, d, hh, mm, ss);
    const offsetMinutes = Math.round((wallUtc - probeUtc) / 60_000);
    return offsetMinutes / 60;
  } catch {
    return null;
  }
}

export function standardHoursForTimeZone(iana: string): number | null {
  const explicit = IANA_TIMEZONE_STANDARD_HOURS[iana];
  if (typeof explicit === 'number') return explicit;
  return deriveStandardHoursFromIntl(iana);
}
