// W05 — minimal natural-birth time parser (extracted from former
// src/product/inputs/natural-birth-time.ts so the astrology pipeline
// does not depend on the inputs UI surface).

export interface ParsedBirthTime {
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

const HHMM_PATTERN = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

export function parseNaturalBirthTime(text: string): ParsedBirthTime | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  const m = HHMM_PATTERN.exec(trimmed);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  const second = m[3] ? Number(m[3]) : 0;
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) return null;
  if (!Number.isFinite(second) || second < 0 || second > 59) return null;
  return { hour, minute, second };
}
