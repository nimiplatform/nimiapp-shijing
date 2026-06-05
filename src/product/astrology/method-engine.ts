// SJG-ALGO-01 / SJG-ALGO-08 — the MethodEngine port. Every 命理 system plugs in
// here. Two deterministic stages:
//   computeEvidence:      canonical inputs -> engine-private deterministic chart
//   deriveCommonDrivers:  chart -> algorithm-agnostic common driver surface
// The orchestrator (build-feature-snapshot.ts) selects an engine from the
// registry and assembles AstrologyFeatureSnapshot { method_profile, common,
// method_evidence }. Adding an engine must not touch Layer 3 (projection,
// runtime AI, validators, persistence, non-evidence UI).

import type {
  CanonicalMirrorWindow,
  CommonDrivers,
  MethodEvidence,
  MethodProfile,
  MethodProfileId,
} from '../../domain/algorithm.ts';
import type { NatalCanonicalization } from '../../domain/algorithm.ts';
import type { ConcernTag } from '../../domain/concern-tag.ts';
import type { NatalInputs } from '../../domain/person.ts';
import type { MirrorKind, MirrorScope } from '../../domain/mirror-scope.ts';
import type { SubjectRef } from '../../domain/subject-ref.ts';
import type { StageResult } from './stage-result.ts';

// A subject resolved by the orchestrator from ShiJingSpace, already through the
// shared NatalCanonicalization stage. Engines never read ShiJingSpace directly.
export interface ResolvedSubject {
  readonly subject_ref: SubjectRef;
  readonly natal_inputs: NatalInputs;
  readonly canonicalization: NatalCanonicalization;
}

export interface EngineComputeInput {
  readonly self_subject: ResolvedSubject;
  readonly related_persons: readonly ResolvedSubject[];
  readonly mirror_kind: MirrorKind;
  readonly mirror_scope: MirrorScope;
  readonly canonical_window: CanonicalMirrorWindow;
  readonly dayun_required: boolean;
}

export interface EngineDeriveInput<E> {
  readonly evidence: E;
  readonly mirror_kind: MirrorKind;
  readonly mirror_scope: MirrorScope;
  readonly canonical_window: CanonicalMirrorWindow;
  readonly active_concern_tags: readonly ConcernTag[];
}

export interface MethodEngineCapabilities {
  // 大运/大限 direction needs calculation_sex when the horizon is required.
  readonly requires_calculation_sex: boolean;
  // Engines that cannot place their primary structure without 时辰 (e.g. 紫微
  // 命宫) fail closed instead of degrading when the hour is unknown.
  readonly requires_birth_time: boolean;
  // Long-horizon unit produced by this engine: 八字 大运 vs 紫微 大限.
  readonly horizon_unit: 'dayun' | 'daxian';
}

// E is the engine-private evidence type (BaziEvidence, ZiweiEvidence, ...).
export interface MethodEngine<E = unknown> {
  readonly id: MethodProfileId;
  readonly profile: MethodProfile;
  readonly capabilities: MethodEngineCapabilities;

  // Stage 1: deterministic, engine-private chart. Goes into method_evidence and
  // the feature snapshot hash. Engine-specific failures are typed StageFailures.
  computeEvidence(input: EngineComputeInput): StageResult<E>;

  // Stage 2: project the chart onto the agnostic common surface, including
  // engine-level uncertainty (per the SJG-ALGO-10 baseline tightened by
  // `capabilities`). Orchestration-level uncertainty (concern tags, consent) is
  // appended by the orchestrator.
  deriveCommonDrivers(input: EngineDeriveInput<E>): StageResult<CommonDrivers>;

  // Tag the engine-private chart as discriminated method_evidence for the envelope.
  toMethodEvidence(evidence: E): MethodEvidence;
}
