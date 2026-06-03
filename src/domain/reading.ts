// SJG-DATA-07 + SJG-DATA-09 + SJG-ASTRO-03 + SJG-ASTRO-09 — Reading,
// InputsSummary, MirrorContextSnapshot, ReadingGenerationFailure,
// UncertaintyAnnotation.

import type {
  AstrologyFeatureSnapshot,
  AstrologyMethodProfile,
} from './algorithm.ts';
import type { ConcernTagSnapshot } from './concern-tag.ts';
import type { MirrorKind, MirrorScope } from './mirror-scope.ts';
import type { MirrorOutput } from './mirror-output.ts';
import type { SubjectRef } from './subject-ref.ts';

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export const CONFIDENCE_LEVELS: readonly ConfidenceLevel[] = ['low', 'medium', 'high'] as const;

export interface UncertaintyAnnotation {
  readonly confidence: ConfidenceLevel;
  readonly caveats: readonly string[];
  readonly data_gaps: readonly string[];
}

export interface MirrorContextSnapshot {
  readonly mirror_kind: MirrorKind;
  readonly mirror_scope: MirrorScope;
  readonly active_concern_tags: readonly ConcernTagSnapshot[];
  readonly resolved_person_refs: readonly SubjectRef[];
  readonly cited_event_memory_refs: readonly string[];
  readonly cited_plan_item_refs: readonly string[];
  readonly response_preferences_hash: string;
}

export interface InputsSummary {
  readonly captured_at: string;
  readonly contract_version: 'SJG-ASTRO-v1';
  readonly algorithm_contract_version: 'SJG-ALGO-v1';
  readonly method_profile: AstrologyMethodProfile;
  readonly mirror_context_snapshot: MirrorContextSnapshot;
  readonly input_hash: string;
  readonly feature_snapshot_hash: string;
  readonly feature_snapshot: AstrologyFeatureSnapshot;
}

export interface Reading {
  readonly id: string;
  readonly created_at: string;
  readonly mirror_kind: MirrorKind;
  readonly mirror_scope: MirrorScope;
  readonly primary_subject_ref: 'self';
  readonly related_person_refs: readonly SubjectRef[];
  readonly concern_tag_refs: readonly string[];
  readonly cited_reading_ids: readonly string[];
  readonly cited_event_memory_refs: readonly string[];
  readonly cited_plan_item_refs: readonly string[];
  readonly inputs_summary: InputsSummary;
  readonly output: MirrorOutput;
  readonly uncertainty: UncertaintyAnnotation;
}

export type ReadingGenerationFailureKind =
  | 'runtime_ai_failed'
  | 'pipeline_stage_failed'
  | 'validation_failed'
  | 'stale_inputs'
  | 'hash_mismatch';

export const READING_GENERATION_FAILURE_KINDS: readonly ReadingGenerationFailureKind[] = [
  'runtime_ai_failed',
  'pipeline_stage_failed',
  'validation_failed',
  'stale_inputs',
  'hash_mismatch',
] as const;

export interface ReadingGenerationFailure {
  readonly kind: ReadingGenerationFailureKind;
  readonly mirror_kind: MirrorKind;
  readonly mirror_scope: MirrorScope;
  readonly stage?: string;
  readonly detail?: string;
}

// Re-export commonly imported scope/output unions so consumers can grab
// them through Reading's barrel without depending on per-file paths.
export type { MirrorKind, MirrorScope } from './mirror-scope.ts';
export type { MirrorOutput } from './mirror-output.ts';
