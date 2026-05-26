const ISO_UTC_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/;

export interface IsoUtcInstant {
  readonly iso: string;
  readonly ms: number;
}

export function parseIsoUtcInstant(value: unknown): IsoUtcInstant | null {
  if (typeof value !== 'string') return null;
  const match = ISO_UTC_PATTERN.exec(value);
  if (!match) return null;
  const [, yyyy, mm, dd, hh, min, ss, fraction = ''] = match;
  const year = Number(yyyy);
  const month = Number(mm);
  const day = Number(dd);
  const hour = Number(hh);
  const minute = Number(min);
  const second = Number(ss);
  const millisecond = fraction.length > 0 ? Number(fraction.padEnd(3, '0')) : 0;
  const ms = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() + 1 !== month ||
    d.getUTCDate() !== day ||
    d.getUTCHours() !== hour ||
    d.getUTCMinutes() !== minute ||
    d.getUTCSeconds() !== second ||
    d.getUTCMilliseconds() !== millisecond
  ) {
    return null;
  }
  return { iso: value, ms };
}

export function isValidIanaTimeZone(value: unknown): boolean {
  if (typeof value !== 'string' || value.length === 0) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}
