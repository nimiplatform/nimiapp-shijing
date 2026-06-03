// W03 — Reading selectors under the Mirror Architecture v1.

import type { Reading } from '../../domain/reading.ts';
import type { MirrorKind } from '../../domain/mirror-scope.ts';

export interface LatestReadingByMirrorKindInput {
  readonly readings: readonly Reading[];
  readonly mirror_kind: MirrorKind;
}

export function latestReadingByMirrorKind(
  input: LatestReadingByMirrorKindInput,
): Reading | undefined {
  return input.readings
    .filter((reading) => reading.mirror_kind === input.mirror_kind)
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
