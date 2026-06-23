// W03 — typed discriminated union returned by every deterministic stage
// in the SJG-ALGO-02 pipeline. Stages MUST never throw; failure is
// encoded as a typed `stage_*` error so downstream stages can
// short-circuit without losing evidence.

import type { SubjectRef } from '../../domain/subject-ref.ts';

export type StageId =
  | 'canonicalize_natal_inputs'
  | 'build_natal_chart'
  | 'build_cycle_snapshot'
  | 'build_feature_snapshot'
  | 'rijing_generate'
  | 'yuejing_generate'
  | 'nianjing_generate'
  | 'shijing_generate'
  | 'mingjing_projection'
  | 'mirror_window';

export const STAGE_IDS: readonly StageId[] = [
  'canonicalize_natal_inputs',
  'build_natal_chart',
  'build_cycle_snapshot',
  'build_feature_snapshot',
  'rijing_generate',
  'yuejing_generate',
  'nianjing_generate',
  'shijing_generate',
  'mingjing_projection',
  'mirror_window',
] as const;

export type StageFailureKind =
  | 'stage_missing_input'
  | 'stage_invalid_input'
  | 'stage_upstream_failure'
  | 'stage_dayun_calculation_sex_unspecified'
  | 'stage_runtime_ai_unavailable';

export interface StageFailure {
  readonly stage: StageId;
  readonly kind: StageFailureKind;
  readonly subject_ref?: SubjectRef;
  readonly detail?: string;
  readonly upstream?: StageFailure;
}

export type StageResult<T> = { ok: true; value: T } | { ok: false; error: StageFailure };
