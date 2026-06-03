// SJG-ASTRO-10 — InputsSummary expiry classifier under the Mirror
// Architecture v1.
//
//   mirror_kind === 'rijing'    → 24h horizon
//   mirror_kind === 'yuejing'   → 7d  horizon
//   mirror_kind === 'nianjing'  → 30d horizon
//   mirror_kind === 'shijing'   → 7d  horizon (for new AI turns)

import type { Reading } from '../../domain/reading.ts';
import type { MirrorKind } from '../../domain/mirror-scope.ts';

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export const INPUTS_SUMMARY_EXPIRY_HORIZONS_MS: Readonly<Record<MirrorKind, number>> = {
  rijing: 24 * MS_PER_HOUR,
  yuejing: 7 * MS_PER_DAY,
  nianjing: 30 * MS_PER_DAY,
  shijing: 7 * MS_PER_DAY,
};

export function expiryHorizonMs(mirrorKind: MirrorKind): number {
  return INPUTS_SUMMARY_EXPIRY_HORIZONS_MS[mirrorKind];
}

export function inputsSummaryExpired(reading: Reading, now: Date): boolean {
  const horizon = expiryHorizonMs(reading.mirror_kind);
  const capturedMs = new Date(reading.inputs_summary.captured_at).getTime();
  if (Number.isNaN(capturedMs)) return false;
  const elapsed = now.getTime() - capturedMs;
  return elapsed > horizon;
}
