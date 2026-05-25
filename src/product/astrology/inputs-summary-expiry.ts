// SJG-ASTRO-09 — InputsSummary expiry classifier.
//
// Per spec:
//   - kind === 'today'                       → 24h horizon from captured_at
//   - kind ∈ {period_outlook, key_window,
//             consultation}                  → 7d  horizon from captured_at
//   - kind === 'sign'                        → never expires
//
// The expired snapshot is retained on the historical Reading for
// evidence and is not mutated; the renderer surfaces an "expired"
// banner so the user can decide to regenerate. This module owns only
// the boolean classifier; it does not write or mutate the Reading.

import type { Reading } from '../../domain/reading.ts';

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export const INPUTS_SUMMARY_EXPIRY_HORIZONS_MS = {
  today: 24 * MS_PER_HOUR,
  period_outlook: 7 * MS_PER_DAY,
  key_window: 7 * MS_PER_DAY,
  consultation: 7 * MS_PER_DAY,
  // sign never expires; encoded as Number.POSITIVE_INFINITY so the
  // comparison below short-circuits to never-expired.
  sign: Number.POSITIVE_INFINITY,
} as const;

export function expiryHorizonMs(kind: Reading['kind']): number {
  return INPUTS_SUMMARY_EXPIRY_HORIZONS_MS[kind];
}

/**
 * Returns true iff the Reading's frozen InputsSummary is past its
 * expiry horizon at `now`. SJG-ASTRO-09 is the spec authority.
 *
 * Implementation notes:
 *   - Uses `inputs_summary.captured_at` (not `reading.created_at`)
 *     because the spec language is explicit about captured_at.
 *   - Returns false for any invalid captured_at string (fail-close
 *     would be wrong here: the renderer should still display the
 *     reading; invalid captured_at is a separate validator concern).
 */
export function inputsSummaryExpired(reading: Reading, now: Date): boolean {
  const horizon = expiryHorizonMs(reading.kind);
  if (!Number.isFinite(horizon)) return false;
  const capturedMs = new Date(reading.inputs_summary.captured_at).getTime();
  if (Number.isNaN(capturedMs)) return false;
  const elapsed = now.getTime() - capturedMs;
  return elapsed > horizon;
}
