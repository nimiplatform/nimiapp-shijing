import type { Reading, ReadingGenerationFailure } from '../../../domain/reading.ts';
import type { MirrorKind, MirrorScope } from '../../../domain/mirror-scope.ts';
import type { ShiJingSpace } from '../../../domain/shijing-space.ts';
import type { SubjectRef } from '../../../domain/subject-ref.ts';
import type { RuntimeAiClient } from '../runtime-ai-client.ts';
import type { StageFailure } from '../stage-result.ts';

export interface GenerateReadingInput {
  readonly id: string;
  readonly created_at: string;
  readonly mirror_kind: MirrorKind;
  readonly mirror_scope: MirrorScope;
  readonly related_person_refs: readonly SubjectRef[];
  readonly concern_tag_refs: readonly string[];
  readonly cited_reading_ids: readonly string[];
  readonly cited_event_memory_refs: readonly string[];
  readonly cited_plan_item_refs: readonly string[];
  readonly space: ShiJingSpace;
  readonly question?: string;
}

export interface GenerateReadingDependencies {
  readonly runtime_ai_client?: RuntimeAiClient;
  readonly response_preferences_hasher?: (space: ShiJingSpace) => string;
  readonly now?: Date;
}

export type GenerateReadingResult =
  | { ok: true; reading: Reading }
  | { ok: false; failure: ReadingGenerationFailure; stage_failure?: StageFailure };
