// W03 — Reading selectors under the Mirror Architecture v1.

import type { Reading } from '../../domain/reading.ts';
import type { MirrorKind } from '../../domain/mirror-scope.ts';
import type {
  NianJingMirrorOutput,
  YueJingMirrorOutput,
} from '../../domain/mirror-output.ts';

export interface LatestReadingByMirrorKindInput {
  readonly readings: readonly Reading[];
  readonly mirror_kind: MirrorKind;
}

export function latestReadingByMirrorKind(
  input: LatestReadingByMirrorKindInput,
): Reading | undefined {
  return input.readings
    .filter((reading) =>
      reading.mirror_kind === input.mirror_kind &&
      !readingHasSyntheticNianjingBaseline(reading),
    )
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
}

export function readingsCitingReading(
  readings: readonly Reading[],
  sourceReadingId: string,
): Reading[] {
  return readings.filter((reading) => reading.cited_reading_ids.includes(sourceReadingId));
}

export function readingsForConcernTag(
  readings: readonly Reading[],
  concernTagId: string,
): Reading[] {
  return readings.filter((reading) => reading.concern_tag_refs.includes(concernTagId));
}

export function yuejingReadingStartsOn(reading: Reading | undefined, date: string): boolean {
  if (!reading || reading.mirror_kind !== 'yuejing') return false;
  if (reading.output.mirror_kind !== 'yuejing') return false;
  return (reading.output as YueJingMirrorOutput).range.start_date === date;
}

export function readingHasSyntheticNianjingBaseline(reading: Reading): boolean {
  if (reading.mirror_kind !== 'nianjing') return false;
  if (reading.output.mirror_kind !== 'nianjing') return false;
  const output = reading.output as NianJingMirrorOutput;
  return (
    output.phase_bands.some((band) =>
      band.driver_refs.some((ref) => ref.startsWith('cycle_baseline')),
    ) ||
    reading.inputs_summary.feature_snapshot.nianjing_phase_drivers.some((driver) =>
      driver.driver_refs.some((ref) => ref.startsWith('cycle_baseline')),
    )
  );
}
