// SJG-ALGO-04 helper — local wall-clock → UTC instant conversion.
//
// Single source of truth for turning a local civil date-time (`YYYY-MM-DDTHH:mm:ss`)
// in a given IANA time zone into the corresponding UTC instant, DST-correct.
// Shared by the natal canonicalization stage and the editor's input-build step
// so a derived `birth_datetime_utc` matches the value the calculation pipeline
// would compute from the same local inputs.

// Zone offset (minutes east of UTC) in effect for a given local civil time.
// null if the local time / zone can't be resolved.
function zoneOffsetMinutes(localIso: string, ianaTimeZone: string): number | null {
  const instant = localWallClockToUtcInstant(localIso, ianaTimeZone);
  if (!instant) return null;
  const localAsUtc = new Date(`${localIso}Z`).getTime();
  if (Number.isNaN(localAsUtc)) return null;
  return Math.round((localAsUtc - instant.getTime()) / 60000);
}

// True when daylight-saving time is in effect for the given local birth date in
// the given zone. Standard offset is taken as the smaller of the year's January
// and July offsets (works for both hemispheres); DST is when the date's offset
// exceeds it. China observed DST 1986–1991, which `Asia/Shanghai` encodes, so
// e.g. a July 1988 Shanghai birth resolves to +9 and trips this check.
export function isDaylightSavingActive(
  localDateText: string,
  localTimeText: string,
  ianaTimeZone: string,
): boolean {
  const dateMatch = /^(\d{4})-\d{2}-\d{2}$/.exec(localDateText.trim());
  if (!dateMatch || !ianaTimeZone || !ianaTimeZone.includes('/')) return false;
  const year = dateMatch[1];
  const timeMatch = /^(\d{1,2}):(\d{2})/.exec(localTimeText.trim());
  const hhmm = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : '12:00';

  const current = zoneOffsetMinutes(`${localDateText.trim()}T${hhmm}:00`, ianaTimeZone);
  const january = zoneOffsetMinutes(`${year}-01-15T12:00:00`, ianaTimeZone);
  const july = zoneOffsetMinutes(`${year}-07-15T12:00:00`, ianaTimeZone);
  if (current === null || january === null || july === null) return false;
  return current > Math.min(january, july);
}

export function localWallClockToUtcInstant(localIso: string, ianaTimeZone: string): Date | null {
  try {
    const probe = new Date(`${localIso}Z`);
    if (Number.isNaN(probe.getTime())) return null;
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: ianaTimeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = dtf.formatToParts(probe);
    const get = (type: Intl.DateTimeFormatPartTypes): number => {
      const part = parts.find((p) => p.type === type);
      return part ? Number(part.value) : NaN;
    };
    const tzY = get('year');
    const tzM = get('month');
    const tzD = get('day');
    const tzH = get('hour');
    const tzMin = get('minute');
    const tzS = get('second');
    const asUtcAgain = Date.UTC(tzY, tzM - 1, tzD, tzH, tzMin, tzS);
    const offsetMs = asUtcAgain - probe.getTime();
    return new Date(probe.getTime() - offsetMs);
  } catch {
    return null;
  }
}
