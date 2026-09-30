import type { BaseProductCopy } from '../i18n/copy-types.ts';

export function relativeTimeShort(instant: string, copy: BaseProductCopy['relativeTime'], now: Date = new Date()): string {
  const elapsed = now.getTime() - Date.parse(instant);
  if (!Number.isFinite(elapsed)) return instant;
  if (elapsed < 60_000) return copy.justNow;
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 60) return copy.minutes(minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return copy.hours(hours);
  return copy.days(Math.floor(hours / 24));
}
