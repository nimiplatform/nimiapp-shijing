// SJG-ALGO-02 - Reading generation orchestrator under Mirror Architecture v1.
//
//   ShiJingSpace
//     -> buildAstrologyFeatureSnapshot       (deterministic)
//     -> per-kind generator                  (deterministic prompt context)
//     -> Runtime AI wording                  (required final wording)
//     -> validateReading                     (W02 contract)
//     -> persisted Reading
//
// Failure surfaces as a typed `ReadingGenerationFailure`, never a fake
// Reading. Hash mismatch, stale inputs, runtime parse failure, and DaYun
// gap all return typed failures.

import type {
  InputsSummary,
  MirrorContextSnapshot,
  Reading,
  UncertaintyAnnotation,
} from '../../domain/reading.ts';
import {
  isAdmittedMethodProfileId,
  SJG_ALGO_CONTRACT_VERSION,
  SJG_ASTRO_CONTRACT_VERSION,
} from '../../domain/algorithm.ts';
import { validateReading } from '../../contracts/reading-validator.ts';
import { buildAstrologyFeatureSnapshot } from './build-feature-snapshot.ts';
import { computeCanonicalHash } from './canonical-hash.ts';
import { inputsSummaryExpired } from './inputs-summary-expiry.ts';
import { deriveUncertainty, evaluateFailClose } from './uncertainty-decision.ts';
import {
  activeConcernTagsForRefs,
  defaultResponsePreferencesHash,
  resolveEventMemories,
  resolvePlanItems,
  snapshotConcernTags,
} from './reading-generation/context.ts';
import { buildDeterministicMirrorOutput } from './reading-generation/deterministic-output.ts';
import { buildRuntimeFinalOutput } from './reading-generation/runtime-final-output.ts';
import { validateGenerationGates } from './reading-generation/support.ts';
import type {
  GenerateReadingDependencies,
  GenerateReadingInput,
  GenerateReadingResult,
} from './reading-generation/types.ts';

export type {
  GenerateReadingDependencies,
  GenerateReadingInput,
  GenerateReadingResult,
} from './reading-generation/types.ts';

export async function generateReading(
  input: GenerateReadingInput,
  deps: GenerateReadingDependencies = {},
): Promise<GenerateReadingResult> {
  const gateFailure = validateGenerationGates(input);
  if (gateFailure) {
    return { ok: false, failure: gateFailure };
  }

  const tagsResult = activeConcernTagsForRefs(input.concern_tag_refs, input.space);
  if (!tagsResult.ok) {
    return {
      ok: false,
      failure: {
        kind: 'validation_failed',
        mirror_kind: input.mirror_kind,
        mirror_scope: input.mirror_scope,
        stage: 'orchestrator',
        detail: `concern tag ref ${tagsResult.missing} does not resolve`,
      },
    };
  }
  const activeTags = tagsResult.tags.filter((t) => t.status === 'active');

  const memoriesResult = resolveEventMemories(input.cited_event_memory_refs, input.space);
  if (!memoriesResult.ok) {
    return {
      ok: false,
      failure: {
        kind: 'validation_failed',
        mirror_kind: input.mirror_kind,
        mirror_scope: input.mirror_scope,
        stage: 'orchestrator',
        detail: `cited event memory ${memoriesResult.missing} does not resolve`,
      },
    };
  }
  const plansResult = resolvePlanItems(input.cited_plan_item_refs, input.space);
  if (!plansResult.ok) {
    return {
      ok: false,
      failure: {
        kind: 'validation_failed',
        mirror_kind: input.mirror_kind,
        mirror_scope: input.mirror_scope,
        stage: 'orchestrator',
        detail: `cited plan item ${plansResult.missing} does not resolve`,
      },
    };
  }

  const featureResult = buildAstrologyFeatureSnapshot({
    mirror_kind: input.mirror_kind,
    mirror_scope: input.mirror_scope,
    space: input.space,
    related_person_refs: input.related_person_refs,
    active_concern_tags: activeTags,
    method_profile_id: input.space.settings.method_profile_id,
  });
  if (!featureResult.ok) {
    return {
      ok: false,
      stage_failure: featureResult.error,
      failure: {
        kind: 'pipeline_stage_failed',
        mirror_kind: input.mirror_kind,
        mirror_scope: input.mirror_scope,
        stage: featureResult.error.stage,
        detail: featureResult.error.detail,
      },
    };
  }
  const featureSnapshot = featureResult.value;

  const failClose = evaluateFailClose(featureSnapshot);
  if (failClose.failed) {
    return {
      ok: false,
      failure: {
        kind: 'algorithm_fail_closed',
        mirror_kind: input.mirror_kind,
        mirror_scope: input.mirror_scope,
        stage: 'uncertainty_decision',
        detail: `SJG-ALGO-10 fail-closed: ${failClose.codes.join(',')}`,
      },
    };
  }

  const deterministicResult = buildDeterministicMirrorOutput({
    input,
    feature_snapshot: featureSnapshot,
    active_concern_tags: activeTags,
    event_memories: memoriesResult.memories,
  });
  if (!deterministicResult.ok) return deterministicResult;

  const responsePreferencesHasher =
    deps.response_preferences_hasher ?? defaultResponsePreferencesHash;
  const responsePreferencesHash = responsePreferencesHasher(input.space);
  const concernTagSnapshots = snapshotConcernTags(activeTags, input.created_at);
  const mirrorContext: MirrorContextSnapshot = {
    mirror_kind: input.mirror_kind,
    mirror_scope: input.mirror_scope,
    active_concern_tags: concernTagSnapshots,
    resolved_person_refs: input.related_person_refs,
    cited_event_memory_refs: input.cited_event_memory_refs,
    cited_plan_item_refs: input.cited_plan_item_refs,
    response_preferences_hash: responsePreferencesHash,
  };

  const runtimeResult = await buildRuntimeFinalOutput({
    input,
    runtime_ai_client: deps.runtime_ai_client,
    feature_snapshot: featureSnapshot,
    mirror_context: mirrorContext,
    deterministic_output: deterministicResult.output,
    event_memories: memoriesResult.memories,
  });
  if (!runtimeResult.ok) return { ok: false, failure: runtimeResult.failure };

  const inputHash = computeCanonicalHash({
    method_profile: featureSnapshot.method_profile,
    mirror_scope: input.mirror_scope,
    canonical_window: featureSnapshot.canonical_window,
    concern_tag_snapshots: concernTagSnapshots,
    related_person_refs: input.related_person_refs,
    cited_event_memory_refs: input.cited_event_memory_refs,
    cited_plan_item_refs: input.cited_plan_item_refs,
    response_preferences_hash: responsePreferencesHash,
  });
  const featureSnapshotHash = computeCanonicalHash(featureSnapshot);

  const uncertainty: UncertaintyAnnotation = deriveUncertainty({
    feature_snapshot: featureSnapshot,
    ai_parse_failed: false,
  });

  const inputsSummary: InputsSummary = {
    captured_at: input.created_at,
    contract_version: SJG_ASTRO_CONTRACT_VERSION,
    algorithm_contract_version: SJG_ALGO_CONTRACT_VERSION,
    method_profile: featureSnapshot.method_profile,
    mirror_context_snapshot: mirrorContext,
    input_hash: inputHash,
    feature_snapshot_hash: featureSnapshotHash,
    feature_snapshot: featureSnapshot,
  };

  const candidateReading: Reading = {
    id: input.id,
    created_at: input.created_at,
    mirror_kind: input.mirror_kind,
    mirror_scope: input.mirror_scope,
    primary_subject_ref: 'self',
    related_person_refs: input.related_person_refs,
    concern_tag_refs: input.concern_tag_refs,
    cited_reading_ids: input.cited_reading_ids,
    cited_event_memory_refs: input.cited_event_memory_refs,
    cited_plan_item_refs: input.cited_plan_item_refs,
    inputs_summary: inputsSummary,
    output: runtimeResult.output,
    uncertainty,
  };

  const validation = validateReading(candidateReading);
  if (!validation.ok) {
    return {
      ok: false,
      failure: {
        kind: 'validation_failed',
        mirror_kind: input.mirror_kind,
        mirror_scope: input.mirror_scope,
        stage: 'validate_reading',
        detail: validation.error.code,
      },
    };
  }

  const now = deps.now ?? new Date();
  if (inputsSummaryExpired(candidateReading, now)) {
    return {
      ok: false,
      failure: {
        kind: 'stale_inputs',
        mirror_kind: input.mirror_kind,
        mirror_scope: input.mirror_scope,
        detail: 'InputsSummary captured_at exceeds freshness horizon',
      },
    };
  }

  if (!isAdmittedMethodProfileId(candidateReading.inputs_summary.method_profile.id)) {
    return {
      ok: false,
      failure: {
        kind: 'validation_failed',
        mirror_kind: input.mirror_kind,
        mirror_scope: input.mirror_scope,
        stage: 'validate_reading',
        detail: 'reading_inputs_summary_method_profile_id_mismatch',
      },
    };
  }
  return { ok: true, reading: candidateReading };
}
