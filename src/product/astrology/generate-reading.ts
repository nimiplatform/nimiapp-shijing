// SJG-ALGO-02 — Reading generation orchestrator under the Mirror
// Architecture v1.
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
  Reading,
  ReadingGenerationFailure,
  InputsSummary,
  MirrorContextSnapshot,
  UncertaintyAnnotation,
} from '../../domain/reading.ts';
import type { ConcernTag, ConcernTagSnapshot } from '../../domain/concern-tag.ts';
import type { EventMemory } from '../../domain/event-memory.ts';
import type { PlanItem } from '../../domain/plan-item.ts';
import type {
  ConsultationMirrorScope,
  LongHorizonMirrorScope,
  MirrorKind,
  MirrorScope,
  NatalMirrorScope,
  RelationshipNatalMirrorScope,
  Rolling30DayMirrorScope,
} from '../../domain/mirror-scope.ts';
import type { MirrorOutput } from '../../domain/mirror-output.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import type { SubjectRef } from '../../domain/subject-ref.ts';
import { validateReading } from '../../contracts/reading-validator.ts';
import {
  isAdmittedMethodProfileId,
  SJG_ALGO_CONTRACT_VERSION,
  SJG_ASTRO_CONTRACT_VERSION,
} from '../../domain/algorithm.ts';
import { buildAstrologyFeatureSnapshot } from './build-feature-snapshot.ts';
import { computeCanonicalHash } from './canonical-hash.ts';
import { generateRiJingOutput } from './rijing-generator.ts';
import { generateYueJingOutput } from './yuejing-generator.ts';
import { generateNianJingOutput } from './nianjing-generator.ts';
import { generateShiJingOutput } from './shijing-generator.ts';
import { generateMingJingOutput } from './mingjing-reading-generator.ts';
import { generateMingJingRelationshipOutput } from './mingjing-relationship-generator.ts';
import { buildMingJingProjection } from './mingjing-projection.ts';
import { validateMirrorOutput } from '../../contracts/mirror-output-validator.ts';
import { evaluateMirrorKindScope, validateMirrorScope } from '../../contracts/mirror-scope-validator.ts';
import {
  buildRuntimeAiPromptRequest,
} from './runtime-ai-prompt.ts';
import type {
  RuntimeAiClient,
  RuntimeAiFailure,
  RuntimeAiResult,
} from './runtime-ai-client.ts';
import { isRuntimeAiWordingPatchAppliedSource } from './runtime-ai-client.ts';
import type { StageFailure } from './stage-result.ts';
import { deriveUncertainty, evaluateFailClose } from './uncertainty-decision.ts';
import { inputsSummaryExpired } from './inputs-summary-expiry.ts';

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

function activeConcernTagsForRefs(
  refs: readonly string[],
  space: ShiJingSpace,
): { ok: true; tags: ConcernTag[] } | { ok: false; missing: string } {
  const tags: ConcernTag[] = [];
  for (const ref of refs) {
    const tag = space.concern_tags.find((t) => t.id === ref);
    if (!tag) return { ok: false, missing: ref };
    tags.push(tag);
  }
  return { ok: true, tags };
}

function snapshotConcernTags(
  tags: readonly ConcernTag[],
  capturedAt: string,
): ConcernTagSnapshot[] {
  return tags.map((tag) => {
    const personRefs: SubjectRef[] = [];
    for (const mention of tag.mention_refs) {
      if (mention.resolved_subject_ref) personRefs.push(mention.resolved_subject_ref);
    }
    return {
      id: tag.id,
      label: tag.label,
      status: tag.status,
      sort_order: tag.sort_order,
      parsed_topics: tag.parsed_topics,
      mention_refs: tag.mention_refs,
      prompt_text_hash: computeCanonicalHash(tag.prompt_text),
      resolved_person_refs: personRefs,
      captured_at: capturedAt,
    };
  });
}

function resolveEventMemories(
  refs: readonly string[],
  space: ShiJingSpace,
): { ok: true; memories: EventMemory[] } | { ok: false; missing: string } {
  const result: EventMemory[] = [];
  for (const ref of refs) {
    const memory = space.event_memories.find((m) => m.id === ref);
    if (!memory) return { ok: false, missing: ref };
    result.push(memory);
  }
  return { ok: true, memories: result };
}

function resolvePlanItems(
  refs: readonly string[],
  space: ShiJingSpace,
): { ok: true; plans: PlanItem[] } | { ok: false; missing: string } {
  const result: PlanItem[] = [];
  for (const ref of refs) {
    const plan = space.plan_items.find((p) => p.id === ref);
    if (!plan) return { ok: false, missing: ref };
    result.push(plan);
  }
  return { ok: true, plans: result };
}

function resolveSourceReadings(
  refs: readonly string[],
  space: ShiJingSpace,
): { ok: true; readings: Reading[] } | { ok: false; missing: string } {
  const result: Reading[] = [];
  for (const ref of refs) {
    const reading = space.readings.find((r) => r.id === ref);
    if (!reading) return { ok: false, missing: ref };
    result.push(reading);
  }
  return { ok: true, readings: result };
}

function defaultResponsePreferencesHash(space: ShiJingSpace): string {
  return computeCanonicalHash(space.settings.response_preferences);
}

function validateGenerationScopePairing(input: GenerateReadingInput): ReadingGenerationFailure | null {
  const scopeCheck = validateMirrorScope(input.mirror_scope);
  if (!scopeCheck.ok) {
    return {
      kind: 'validation_failed',
      mirror_kind: input.mirror_kind,
      mirror_scope: input.mirror_scope,
      stage: 'orchestrator',
      detail: `mirror_scope_invalid:${scopeCheck.error.code}`,
    };
  }
  if (evaluateMirrorKindScope(input.mirror_kind, input.mirror_scope) === 'forbidden') {
    return {
      kind: 'validation_failed',
      mirror_kind: input.mirror_kind,
      mirror_scope: input.mirror_scope,
      stage: 'orchestrator',
      detail: `mirror_kind_scope_forbidden:${input.mirror_kind}:${input.mirror_scope.kind}`,
    };
  }
  return null;
}

async function refineWithRuntimeAi(
  client: RuntimeAiClient,
  mirrorKind: MirrorKind,
  promptRequest: ReturnType<typeof buildRuntimeAiPromptRequest>,
): Promise<RuntimeAiResult> {
  return client.generate(mirrorKind, promptRequest);
}

function runtimeAiFailureDetail(failure: RuntimeAiFailure): string {
  if (failure.kind === 'runtime_unavailable') return failure.detail;
  const parseFailure = failure.failure;
  switch (parseFailure.kind) {
    case 'invalid_json':
      return `parse_failure:invalid_json:${parseFailure.detail}`;
    case 'mirror_kind_mismatch':
      return [
        'parse_failure:mirror_kind_mismatch',
        `expected=${parseFailure.expected}`,
        `received=${String(parseFailure.received)}`,
      ].join(';');
    case 'validation_failed':
      return `parse_failure:validation_failed:${parseFailure.detail}`;
  }
}

export async function generateReading(
  input: GenerateReadingInput,
  deps: GenerateReadingDependencies = {},
): Promise<GenerateReadingResult> {
  const scopePairingFailure = validateGenerationScopePairing(input);
  if (scopePairingFailure) {
    return { ok: false, failure: scopePairingFailure };
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

  // SJG-ALGO-10 — fail closed in the deterministic layer (defence-in-depth):
  // any uncertainty input a producer marked fail_close (precision below the
  // usable floor, DaYun-required gaps, no active concern tags, ...) yields a
  // typed failure — never a low-confidence reading — and never reaches the AI.
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

  let structuralOutput: MirrorOutput;
  if (input.mirror_kind === 'rijing') {
    const out = generateRiJingOutput({
      feature_snapshot: featureSnapshot,
      active_concern_tags: activeTags,
      cited_event_memory_refs: input.cited_event_memory_refs,
      cited_plan_item_refs: input.cited_plan_item_refs,
    });
    if (!out.ok) {
      return {
        ok: false,
        stage_failure: out.error,
        failure: {
          kind: 'pipeline_stage_failed',
          mirror_kind: input.mirror_kind,
          mirror_scope: input.mirror_scope,
          stage: out.error.stage,
          detail: out.error.detail,
        },
      };
    }
    structuralOutput = out.value;
  } else if (input.mirror_kind === 'yuejing') {
    const out = generateYueJingOutput({
      feature_snapshot: featureSnapshot,
      mirror_scope: input.mirror_scope as Rolling30DayMirrorScope,
      active_concern_tags: activeTags,
      cited_event_memory_refs: input.cited_event_memory_refs,
      cited_plan_item_refs: input.cited_plan_item_refs,
    });
    if (!out.ok) {
      return {
        ok: false,
        stage_failure: out.error,
        failure: {
          kind: 'pipeline_stage_failed',
          mirror_kind: input.mirror_kind,
          mirror_scope: input.mirror_scope,
          stage: out.error.stage,
          detail: out.error.detail,
        },
      };
    }
    structuralOutput = out.value;
  } else if (input.mirror_kind === 'nianjing') {
    const out = generateNianJingOutput({
      feature_snapshot: featureSnapshot,
      mirror_scope: input.mirror_scope as LongHorizonMirrorScope,
      active_concern_tags: activeTags,
      cited_event_memory_refs: input.cited_event_memory_refs,
      cited_plan_item_refs: input.cited_plan_item_refs,
    });
    if (!out.ok) {
      return {
        ok: false,
        stage_failure: out.error,
        failure: {
          kind: 'pipeline_stage_failed',
          mirror_kind: input.mirror_kind,
          mirror_scope: input.mirror_scope,
          stage: out.error.stage,
          detail: out.error.detail,
        },
      };
    }
    structuralOutput = out.value;
  } else if (input.mirror_kind === 'mingjing') {
    const out =
      input.mirror_scope.kind === 'relationship_natal'
        ? generateMingJingRelationshipOutput({
            feature_snapshot: featureSnapshot,
            mirror_scope: input.mirror_scope as RelationshipNatalMirrorScope,
            method_profile_id: featureSnapshot.method_profile.id,
            cited_event_memory_refs: input.cited_event_memory_refs,
            cited_plan_item_refs: input.cited_plan_item_refs,
          })
        : (() => {
            const scope = input.mirror_scope as NatalMirrorScope;
            const projection = buildMingJingProjection({
              space: input.space,
              reference_year: scope.anchor_year,
            });
            if (!projection.ok) return projection;
            return generateMingJingOutput({
              chart: projection.value,
              method_profile_id: featureSnapshot.method_profile.id,
              events: memoriesResult.memories,
              cited_event_memory_refs: input.cited_event_memory_refs,
              cited_plan_item_refs: input.cited_plan_item_refs,
            });
          })();
    if (!out.ok) {
      return {
        ok: false,
        stage_failure: out.error,
        failure: {
          kind: 'pipeline_stage_failed',
          mirror_kind: input.mirror_kind,
          mirror_scope: input.mirror_scope,
          stage: out.error.stage,
          detail: out.error.detail,
        },
      };
    }
    structuralOutput = out.value;
  } else {
    const scope = input.mirror_scope as ConsultationMirrorScope;
    const sourceResult = resolveSourceReadings(scope.source_reading_ids, input.space);
    if (!sourceResult.ok) {
      return {
        ok: false,
        failure: {
          kind: 'validation_failed',
          mirror_kind: input.mirror_kind,
          mirror_scope: input.mirror_scope,
          stage: 'orchestrator',
          detail: `source reading ${sourceResult.missing} does not resolve`,
        },
      };
    }
    const out = generateShiJingOutput({
      mirror_scope: scope,
      source_readings: sourceResult.readings,
      question: input.question ?? '',
      cited_event_memory_refs: input.cited_event_memory_refs,
      cited_plan_item_refs: input.cited_plan_item_refs,
    });
    if (!out.ok) {
      return {
        ok: false,
        stage_failure: out.error,
        failure: {
          kind: 'pipeline_stage_failed',
          mirror_kind: input.mirror_kind,
          mirror_scope: input.mirror_scope,
          stage: out.error.stage,
          detail: out.error.detail,
        },
      };
    }
    structuralOutput = out.value;
  }

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

  // Runtime AI wording is the required final output boundary. The
  // deterministic structural output is only prompt context and must not
  // be persisted as fallback user-facing content.
  const aiParseFailed = false;
  if (!deps.runtime_ai_client) {
    return {
      ok: false,
      failure: {
        kind: 'runtime_ai_failed',
        mirror_kind: input.mirror_kind,
        mirror_scope: input.mirror_scope,
        detail: 'runtime_unavailable:Runtime AI client is required',
      },
    };
  }
  let promptRequest: ReturnType<typeof buildRuntimeAiPromptRequest>;
  try {
    promptRequest = buildRuntimeAiPromptRequest({
      mirror_kind: input.mirror_kind,
      feature_snapshot: featureSnapshot,
      mirror_context: mirrorContext,
      deterministic_output: structuralOutput,
      response_preferences: input.space.settings.response_preferences,
      cited_event_memories: memoriesResult.memories,
      ...(input.question ? { question: input.question } : {}),
    });
  } catch (error) {
    return {
      ok: false,
      failure: {
        kind: 'runtime_ai_failed',
        mirror_kind: input.mirror_kind,
        mirror_scope: input.mirror_scope,
        detail: `runtime_prompt_build_failed:${error instanceof Error ? error.message : String(error)}`,
      },
    };
  }
  let aiResult: RuntimeAiResult;
  try {
    aiResult = await refineWithRuntimeAi(
      deps.runtime_ai_client,
      input.mirror_kind,
      promptRequest,
    );
  } catch (error) {
    return {
      ok: false,
      failure: {
        kind: 'runtime_ai_failed',
        mirror_kind: input.mirror_kind,
        mirror_scope: input.mirror_scope,
        detail: `runtime_exception:${error instanceof Error ? error.message : String(error)}`,
      },
    };
  }
  if (!aiResult.ok) {
    // SJG-PROD-11 - parse failure must surface typed runtime_ai_failed,
    // not be silently replaced by structural output.
    return {
      ok: false,
      failure: {
        kind: 'runtime_ai_failed',
        mirror_kind: input.mirror_kind,
        mirror_scope: input.mirror_scope,
        detail: runtimeAiFailureDetail(aiResult.failure),
      },
    };
  }
  if (
    input.mirror_kind === 'mingjing' &&
    input.mirror_scope.kind === 'relationship_natal' &&
    !isRuntimeAiWordingPatchAppliedSource(aiResult.output_source)
  ) {
    return {
      ok: false,
      failure: {
        kind: 'runtime_ai_failed',
        mirror_kind: input.mirror_kind,
        mirror_scope: input.mirror_scope,
        detail: 'runtime_output_missing_wording_patch_provenance',
      },
    };
  }

  // Defence-in-depth: validate the AI-provided MirrorOutput shape
  // BEFORE accepting it as final output. Forbidden fields,
  // mirror_kind mismatch, or schema violations surface a typed
  // `runtime_ai_failed` instead of silently producing a Reading.
  const runtimeOutputValidation = validateMirrorOutput(aiResult.output);
  if (!runtimeOutputValidation.ok) {
    return {
      ok: false,
      failure: {
        kind: 'runtime_ai_failed',
        mirror_kind: input.mirror_kind,
        mirror_scope: input.mirror_scope,
        detail: `runtime_output_validation_failed:${runtimeOutputValidation.error.code}`,
      },
    };
  }
  if (aiResult.output.mirror_kind !== input.mirror_kind) {
    return {
      ok: false,
      failure: {
        kind: 'runtime_ai_failed',
        mirror_kind: input.mirror_kind,
        mirror_scope: input.mirror_scope,
        detail: 'runtime_output_mirror_kind_mismatch',
      },
    };
  }
  const finalOutput: MirrorOutput = aiResult.output;

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

  // SJG-ALGO-11/12 — the canonical hash stamped here is re-derived and
  // compared against this same snapshot inside validateReading() below
  // (and again on every load), so snapshot↔hash drift fails closed as a
  // typed validation_failed:reading_inputs_summary_feature_snapshot_hash_mismatch.

  const uncertainty: UncertaintyAnnotation = deriveUncertainty({
    feature_snapshot: featureSnapshot,
    ai_parse_failed: aiParseFailed,
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
    output: finalOutput,
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

  // SJG-ASTRO-10 — final freshness check (defence-in-depth). The
  // captured_at on InputsSummary was just stamped from input.created_at,
  // so this normally passes; if the caller passed a stale created_at,
  // we surface stale_inputs.
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
