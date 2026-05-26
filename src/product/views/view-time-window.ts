import type { ReadingTimeWindow } from '../../domain/reading.ts';

interface LocalDateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

interface LocalDateTimeParts extends LocalDateParts {
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

function partsValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  const value = parts.find((part) => part.type === type)?.value;
  if (!value) throw new Error(`missing_${type}_for_time_zone`);
  return Number.parseInt(value, 10);
}

function zonedPartsFor(basisTimeZone: string, instant: Date): LocalDateTimeParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: basisTimeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = formatter.formatToParts(instant);
  return {
    year: partsValue(parts, 'year'),
    month: partsValue(parts, 'month'),
    day: partsValue(parts, 'day'),
    hour: partsValue(parts, 'hour'),
    minute: partsValue(parts, 'minute'),
    second: partsValue(parts, 'second'),
  };
}

function timeZoneOffsetMsAt(basisTimeZone: string, instant: Date): number {
  const parts = zonedPartsFor(basisTimeZone, instant);
  const localAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const instantAtSecond = Math.trunc(instant.getTime() / 1000) * 1000;
  return localAsUtc - instantAtSecond;
}

function localCivilMidnightToUtc(parts: LocalDateParts, basisTimeZone: string): Date {
  const localAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0);
  let candidate = localAsUtc;
  for (let i = 0; i < 4; i += 1) {
    const offset = timeZoneOffsetMsAt(basisTimeZone, new Date(candidate));
    const next = localAsUtc - offset;
    if (next === candidate) break;
    candidate = next;
  }
  return new Date(candidate);
}

function addLocalDays(parts: LocalDateParts, days: number): LocalDateParts {
  const next = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 0, 0, 0));
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function parseLocalDateInput(value: string): LocalDateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const probe = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() + 1 !== month ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function localDateInputToUtcIso(value: string, basisTimeZone: string): string | null {
  const parts = parseLocalDateInput(value);
  if (!parts) return null;
  return localCivilMidnightToUtc(parts, basisTimeZone).toISOString();
}

export function utcIsoToLocalDateInput(value: string, basisTimeZone: string): string {
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime())) return '';
  const parts = zonedPartsFor(basisTimeZone, instant);
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function localCivilDaysWindow(
  basisTimeZone: string,
  days: number,
  now: Date = new Date(),
  source: ReadingTimeWindow['source'] = 'view_time_scope',
): ReadingTimeWindow {
  const localToday = zonedPartsFor(basisTimeZone, now);
  const startUtc = localCivilMidnightToUtc(localToday, basisTimeZone).toISOString();
  const endUtc = localCivilMidnightToUtc(addLocalDays(localToday, days), basisTimeZone).toISOString();
  return {
    mode: 'bounded',
    start_utc: startUtc,
    end_utc: endUtc,
    basis_time_zone: basisTimeZone,
    source,
  };
}
