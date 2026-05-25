// SJG-DATA-07 + SJG-ASTRO-04..09 + SJG-ALGO-03/08 — Reading entity,
// ReadingTimeWindow, AstrologyOutput, UncertaintyAnnotation, InputsSummary.

import type { SubjectRef } from './subject-ref.ts';
import type { ReadingKind, ReadingScope } from './reading-matrix.ts';
import type {
  AstrologyFeatureSnapshot,
  AstrologyMethodProfile,
  ReadingTimeWindow,
  ReadingTimeWindowMode,
  ReadingTimeWindowSource,
} from './algorithm.ts';
import { READING_TIME_WINDOW_MODES, READING_TIME_WINDOW_SOURCES } from './algorithm.ts';

export type {
  ReadingTimeWindow,
  ReadingTimeWindowMode,
  ReadingTimeWindowSource,
} from './algorithm.ts';

export { READING_TIME_WINDOW_MODES, READING_TIME_WINDOW_SOURCES };

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export const CONFIDENCE_LEVELS: readonly ConfidenceLevel[] = ['low', 'medium', 'high'] as const;

export interface UncertaintyAnnotation {
  readonly confidence: ConfidenceLevel;
  readonly caveats: readonly string[];
  readonly data_gaps: readonly string[];
}

export type RecommendationHorizon = 'today' | 'this_week' | 'this_month' | 'long_term';

export const RECOMMENDATION_HORIZONS: readonly RecommendationHorizon[] = [
  'today',
  'this_week',
  'this_month',
  'long_term',
] as const;

export interface Highlight {
  readonly label: string;
  readonly body: string;
  readonly subject_ref: SubjectRef;
}

export interface Recommendation {
  readonly body: string;
  readonly subject_ref: SubjectRef;
  readonly horizon: RecommendationHorizon;
}

export interface AstrologyCitation {
  readonly method: string;
  readonly reference: string;
}

export interface AstrologyOutput {
  readonly summary: string;
  readonly highlights: readonly Highlight[];
  readonly recommendations: readonly Recommendation[];
  readonly citations: readonly AstrologyCitation[];
}

export interface SubjectSummary {
  readonly subject: SubjectRef;
  readonly summary: string;
}

export interface RelationSummary {
  readonly from_subject: SubjectRef;
  readonly to_subject: SubjectRef;
  readonly relation_kind: string;
}

export interface EventSummary {
  readonly subject: SubjectRef;
  readonly occurred_at: string;
  readonly title: string;
}

export interface ViewSnapshot {
  readonly view_id: string;
  readonly anchor_subject: SubjectRef;
  readonly subjects: readonly SubjectRef[];
  readonly time_scope: 'bounded' | 'open_ended' | 'rolling';
  readonly instructions_hash: string;
  readonly context_items_hash: string;
  readonly memory_summary_hash: string;
  readonly memory_locked: boolean;
}

export interface InputsSummary {
  readonly captured_at: string;
  readonly contract_version: 'SJG-ASTRO-v1';
  readonly algorithm_contract_version: 'SJG-ALGO-v1';
  readonly method_profile: AstrologyMethodProfile;
  readonly time_window: ReadingTimeWindow;
  readonly input_hash: string;
  readonly feature_snapshot_hash: string;
  readonly feature_snapshot: AstrologyFeatureSnapshot;
  readonly subject_summaries: readonly SubjectSummary[];
  readonly relation_summaries: readonly RelationSummary[];
  readonly event_summaries: readonly EventSummary[];
  readonly view_snapshot?: ViewSnapshot;
  readonly ad_hoc_context?: string;
}

export interface Reading {
  readonly id: string;
  readonly created_at: string;
  readonly scope: ReadingScope;
  readonly kind: ReadingKind;
  readonly anchor_subject: SubjectRef;
  readonly subjects: readonly SubjectRef[];
  readonly time_window: ReadingTimeWindow;
  readonly view_id?: string;
  readonly inputs_summary: InputsSummary;
  readonly output: AstrologyOutput;
  readonly uncertainty: UncertaintyAnnotation;
}
