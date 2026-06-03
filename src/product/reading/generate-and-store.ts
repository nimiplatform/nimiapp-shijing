// W03 — Reading orchestration entry that calls generateReading and
// appends the resulting Reading to a new ShiJingSpace snapshot. Failure
// modes are typed as `ReadingGenerationFailure` exactly per
// SJG-DATA-07; no fake Reading is ever returned.

import type { Reading, ReadingGenerationFailure } from '../../domain/reading.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import type { MirrorKind, MirrorScope } from '../../domain/mirror-scope.ts';
import type { SubjectRef } from '../../domain/subject-ref.ts';
import {
  generateReading,
  type GenerateReadingDependencies,
} from '../astrology/generate-reading.ts';

export interface GenerateAndStoreInput {
  readonly id: string;
  readonly created_at: string;
  readonly mirror_kind: MirrorKind;
  readonly mirror_scope: MirrorScope;
  readonly related_person_refs: readonly SubjectRef[];
  readonly concern_tag_refs: readonly string[];
  readonly cited_reading_ids?: readonly string[];
  readonly cited_event_memory_refs?: readonly string[];
  readonly cited_plan_item_refs?: readonly string[];
  readonly question?: string;
  readonly space: ShiJingSpace;
  readonly deps?: GenerateReadingDependencies;
}

export type GenerateAndStoreOutcome =
  | { ok: true; reading: Reading; next_space: ShiJingSpace }
  | { ok: false; failure: ReadingGenerationFailure };

export async function generateReadingForStorage(
  input: GenerateAndStoreInput,
): Promise<GenerateAndStoreOutcome> {
  const result = await generateReading(
    {
      id: input.id,
      created_at: input.created_at,
      mirror_kind: input.mirror_kind,
      mirror_scope: input.mirror_scope,
      related_person_refs: input.related_person_refs,
      concern_tag_refs: input.concern_tag_refs,
      cited_reading_ids: input.cited_reading_ids ?? [],
      cited_event_memory_refs: input.cited_event_memory_refs ?? [],
      cited_plan_item_refs: input.cited_plan_item_refs ?? [],
      space: input.space,
      ...(input.question ? { question: input.question } : {}),
    },
    input.deps ?? {},
  );
  if (!result.ok) return { ok: false, failure: result.failure };
  const next_space: ShiJingSpace = {
    ...input.space,
    readings: [...input.space.readings, result.reading],
  };
  return { ok: true, reading: result.reading, next_space };
}
