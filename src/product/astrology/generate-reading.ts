// SJG-ALGO-02 — Reading generation orchestrator under the Mirror
// Architecture v1.
//
//   ShiJingSpace
//     -> buildAstrologyFeatureSnapshot       (deterministic)
//     -> per-kind generator                  (deterministic structural)
//     -> Runtime AI wording                  (optional refinement)
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
  Rolling30DayMirrorScope,
} from '../../domain/mirror-scope.ts';
import type { MirrorOutput } from '../../domain/mirror-output.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import { isPersonRef, type SubjectRef } from '../../domain/subject-ref.ts';
import { validateReading } from '../../contracts/reading-validator.ts';
import {
  ASTROLOGY_METHOD_PROFILE_ID,
  SJG_ALGO_CONTRACT_VERSION,
  SJG_ASTRO_CONTRACT_VERSION,
} from '../../domain/algorithm.ts';
import { buildAstrologyFeatureSnapshot } from './build-feature-snapshot.ts';
import { canonicalizeNatalInputs } from './canonicalize-natal-inputs.ts';
import { computeCanonicalHash } from './canonical-hash.ts';
import { generateRiJingOutput } from './rijing-generator.ts';
import { generateYueJingOutput } from './yuejing-generator.ts';
import { generateNianJingOutput } from './nianjing-generator.ts';
import { generateShiJingOutput } from './shijing-generator.ts';
import { validateMirrorOutput } from '../../contracts/mirror-output-validator.ts';
import {
  buildRuntimeAiPromptRequest,
} from './runtime-ai-prompt.ts';
import type {
  RuntimeAiClient,
  RuntimeAiResult,
} from './runtime-ai-client.ts';
import type { StageFailure } from './stage-result.ts';
import { deriveUncertainty } from './uncertainty-decision.ts';
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

async function refineWithRuntimeAi(
  client: RuntimeAiClient | undefined,
  mirrorKind: MirrorKind,
  promptRequest: ReturnType<typeof buildRuntimeAiPromptRequest>,
): Promise<RuntimeAiResult | null> {
  if (!client) return null;
  return client.generate(mirrorKind, promptRequest);
}

export async function generateReading(
  input: GenerateReadingInput,
  deps: GenerateReadingDependencies = {},
): Promise<GenerateReadingResult> {
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

  // Optional runtime AI refinement (replaces structural output with
  // refined output IF it parses and validates per mirror_kind contract).
  let finalOutput: MirrorOutput = structuralOutput;
  const aiParseFailed = false;
  if (deps.runtime_ai_client) {
    const promptRequest = buildRuntimeAiPromptRequest({
      mirror_kind: input.mirror_kind,
      feature_snapshot: featureSnapshot,
      mirror_context: mirrorContext,
      response_preferences: input.space.settings.response_preferences,
      ...(input.question ? { question: input.question } : {}),
    });
    const aiResult = await refineWithRuntimeAi(
      deps.runtime_ai_client,
      input.mirror_kind,
      promptRequest,
    );
    if (aiResult && !aiResult.ok) {
      // SJG-PROD-11 - parse failure must surface typed runtime_ai_failed,
      // not be silently replaced by structural output.
      return {
        ok: false,
        failure: {
          kind: 'runtime_ai_failed',
          mirror_kind: input.mirror_kind,
          mirror_scope: input.mirror_scope,
          detail: aiResult.failure.kind === 'parse_failure'
            ? `parse_failure:${aiResult.failure.failure.kind}`
            : aiResult.failure.detail,
        },
      };
    }
    if (aiResult && aiResult.ok) {
      // Defence-in-depth: validate the AI-provided MirrorOutput shape
      // BEFORE accepting it as final output. Forbidden fields,
      // mirror_kind mismatch, or schema violations surface a typed
      // `runtime_ai_failed` instead of silently producing a Reading.
      const validation = validateMirrorOutput(aiResult.output);
      if (!validation.ok) {
        return {
          ok: false,
          failure: {
            kind: 'runtime_ai_failed',
            mirror_kind: input.mirror_kind,
            mirror_scope: input.mirror_scope,
            detail: `runtime_output_validation_failed:${validation.error.code}`,
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
      finalOutput = aiResult.output;
    }
  }

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

  // SJG-ALGO-12 — recompute hashes from the about-to-persist objects
  // and detect any drift between snapshot and hash. Drift returns a
  // typed hash_mismatch failure.
  if (
    featureSnapshotHash !== computeCanonicalHash(featureSnapshot)
  ) {
    return {
      ok: false,
      failure: {
        kind: 'hash_mismatch',
        mirror_kind: input.mirror_kind,
        mirror_scope: input.mirror_scope,
        detail: 'feature_snapshot_hash drift',
      },
    };
  }

  const canonicalizations = [input.space.self_subject.natal_inputs, ...input.related_person_refs.map((r) => {
    if (!isPersonRef(r)) return undefined;
    const person = input.space.persons.find((p) => p.id === r.id);
    return person?.natal_inputs;
  })].map((natal) => (natal ? canonicalizeNatalInputs(natal) : null)).map((r) => {
    if (!r) return undefined;
    return r.ok ? r.value : undefined;
  });

  const uncertainty: UncertaintyAnnotation = deriveUncertainty({
    feature_snapshot: featureSnapshot,
    canonicalizations,
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

  if (candidateReading.inputs_summary.method_profile.id !== ASTROLOGY_METHOD_PROFILE_ID) {
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
