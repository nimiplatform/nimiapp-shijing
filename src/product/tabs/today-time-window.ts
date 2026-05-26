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

export function todayTimeWindowFor(basisTimeZone: string, now: Date = new Date()): ReadingTimeWindow {
  const localToday = zonedPartsFor(basisTimeZone, now);
  const startUtc = localCivilMidnightToUtc(localToday, basisTimeZone).toISOString();
  const endUtc = localCivilMidnightToUtc(addLocalDays(localToday, 1), basisTimeZone).toISOString();
  return {
    mode: 'bounded',
    start_utc: startUtc,
    end_utc: endUtc,
    basis_time_zone: basisTimeZone,
    source: 'kind_default',
  };
}

export function todayBasisLabelFor(basisTimeZone: string, now: Date = new Date()): string {
  const localToday = zonedPartsFor(basisTimeZone, now);
  return `${basisTimeZone} · ${localToday.year}年${localToday.month}月${localToday.day}日`;
}
