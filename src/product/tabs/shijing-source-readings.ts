import type { MirrorKind } from '../../domain/mirror-scope.ts';
import type { Reading } from '../../domain/reading.ts';
import { inputsSummaryExpired } from '../astrology/inputs-summary-expiry.ts';

const DEFAULT_SOURCE_MIRROR_KINDS: readonly MirrorKind[] = ['rijing', 'yuejing', 'nianjing'];

export interface ResolveShiJingSourceReadingIdsInput {
  readonly imported_reading_ids: readonly string[];
  readonly readings: readonly Reading[];
  readonly now?: Date;
}

function uniqueInOrder(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
  }
  return unique;
}

function freshEnough(reading: Reading, now: Date): boolean {
  return !inputsSummaryExpired(reading, now);
}

function latestFreshReadingForKind(
  readings: readonly Reading[],
  kind: MirrorKind,
  now: Date,
): Reading | undefined {
  return readings
    .filter((reading) => reading.mirror_kind === kind && freshEnough(reading, now))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
}

export function resolveShiJingSourceReadingIds(
  input: ResolveShiJingSourceReadingIdsInput,
): string[] {
  const now = input.now ?? new Date();
  const readingById = new Map(input.readings.map((reading) => [reading.id, reading] as const));
  const importedIds = uniqueInOrder(input.imported_reading_ids).filter((id) => {
    const reading = readingById.get(id);
    return reading != null && freshEnough(reading, now);
  });
  if (importedIds.length > 0) return importedIds;

  return DEFAULT_SOURCE_MIRROR_KINDS.flatMap((kind) => {
    const reading = latestFreshReadingForKind(input.readings, kind, now);
    return reading ? [reading.id] : [];
  });
}
