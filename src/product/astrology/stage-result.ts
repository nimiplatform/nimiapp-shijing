// Wave-5 — typed discriminated union returned by every deterministic
// stage in the SJG-ALGO-02 pipeline. Stages MUST never throw; failure
// is encoded as a typed `stage_*` error so downstream stages can
// short-circuit without losing evidence.

import type { SubjectRef } from '../../domain/subject-ref.ts';

export type StageId =
  | 'canonicalize_natal_inputs'
  | 'build_natal_chart'
  | 'build_cycle_snapshot'
  | 'build_feature_snapshot';

export const STAGE_IDS: readonly StageId[] = [
  'canonicalize_natal_inputs',
  'build_natal_chart',
  'build_cycle_snapshot',
  'build_feature_snapshot',
] as const;

export type StageFailureKind =
  | 'stage_not_implemented_in_scaffold_wave'
  | 'stage_missing_input'
  | 'stage_invalid_input'
  | 'stage_upstream_failure';

export interface StageFailure {
  readonly stage: StageId;
  readonly kind: StageFailureKind;
  readonly subject?: SubjectRef;
  readonly detail?: string;
  readonly upstream?: StageFailure;
}

export type StageResult<T> = { ok: true; value: T } | { ok: false; error: StageFailure };

export function stageNotImplemented<T>(stage: StageId, subject?: SubjectRef): StageResult<T> {
  return {
    ok: false,
    error: {
      stage,
      kind: 'stage_not_implemented_in_scaffold_wave',
      subject,
      detail:
        'SJG-ALGO-02 pipeline stage is scaffold-only in wave-5; real calculation is admitted by a later wave.',
    },
  };
}
