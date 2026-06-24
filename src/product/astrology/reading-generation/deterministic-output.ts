import type { AstrologyFeatureSnapshot } from '../../../domain/algorithm.ts';
import type { ConcernTag } from '../../../domain/concern-tag.ts';
import type { EventMemory } from '../../../domain/event-memory.ts';
import type {
  ConsultationMirrorScope,
  LongHorizonMirrorScope,
  NatalMirrorScope,
  RelationshipNatalMirrorScope,
  Rolling30DayMirrorScope,
} from '../../../domain/mirror-scope.ts';
import type { MirrorOutput } from '../../../domain/mirror-output.ts';
import type { ReadingGenerationFailure } from '../../../domain/reading.ts';
import { generateMingJingOutput } from '../mingjing-reading-generator.ts';
import { generateMingJingRelationshipOutput } from '../mingjing-relationship-generator.ts';
import { buildMingJingProjection } from '../mingjing-projection.ts';
import { generateMingJingZiweiNatalOutput } from '../mingjing-ziwei-reading-generator.ts';
import { generateNianJingOutput } from '../nianjing-generator.ts';
import { generateRiJingOutput } from '../rijing-generator.ts';
import { generateShiJingOutput } from '../shijing-generator.ts';
import type { StageFailure, StageResult } from '../stage-result.ts';
import { generateYueJingOutput } from '../yuejing-generator.ts';
import { resolveSourceReadings } from './context.ts';
import type { GenerateReadingInput } from './types.ts';

type DeterministicOutputFailure = {
  readonly ok: false;
  readonly failure: ReadingGenerationFailure;
  readonly stage_failure?: StageFailure;
};

type DeterministicOutputResult =
  | { readonly ok: true; readonly output: MirrorOutput }
  | DeterministicOutputFailure;

interface BuildDeterministicMirrorOutputInput {
  readonly input: GenerateReadingInput;
  readonly feature_snapshot: AstrologyFeatureSnapshot;
  readonly active_concern_tags: readonly ConcernTag[];
  readonly event_memories: readonly EventMemory[];
}

function stageFailure(
  input: GenerateReadingInput,
  error: StageFailure,
): DeterministicOutputFailure {
  return {
    ok: false,
    stage_failure: error,
    failure: {
      kind: 'pipeline_stage_failed',
      mirror_kind: input.mirror_kind,
      mirror_scope: input.mirror_scope,
      stage: error.stage,
      detail: error.detail,
    },
  };
}

function fromStageResult(
  input: GenerateReadingInput,
  result: StageResult<MirrorOutput>,
): DeterministicOutputResult {
  if (result.ok) return { ok: true, output: result.value };
  return stageFailure(input, result.error);
}

function generateMingJingDeterministicOutput(
  build: BuildDeterministicMirrorOutputInput,
): DeterministicOutputResult {
  const { input, feature_snapshot: featureSnapshot } = build;
  const out =
    input.mirror_scope.kind === 'relationship_natal'
      ? generateMingJingRelationshipOutput({
          feature_snapshot: featureSnapshot,
          mirror_scope: input.mirror_scope as RelationshipNatalMirrorScope,
          method_profile_id: featureSnapshot.method_profile.id,
          cited_event_memory_refs: input.cited_event_memory_refs,
          cited_plan_item_refs: input.cited_plan_item_refs,
        })
      : featureSnapshot.method_evidence.method_id === 'ziwei_sanhe_v1'
        ? generateMingJingZiweiNatalOutput({
            feature_snapshot: featureSnapshot,
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
            events: build.event_memories,
            cited_event_memory_refs: input.cited_event_memory_refs,
            cited_plan_item_refs: input.cited_plan_item_refs,
          });
        })();
  return fromStageResult(input, out);
}

function generateShiJingDeterministicOutput(
  build: BuildDeterministicMirrorOutputInput,
): DeterministicOutputResult {
  const { input } = build;
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
  return fromStageResult(
    input,
    generateShiJingOutput({
      mirror_scope: scope,
      source_readings: sourceResult.readings,
      question: input.question ?? '',
      cited_event_memory_refs: input.cited_event_memory_refs,
      cited_plan_item_refs: input.cited_plan_item_refs,
    }),
  );
}

export function buildDeterministicMirrorOutput(
  build: BuildDeterministicMirrorOutputInput,
): DeterministicOutputResult {
  const { input, feature_snapshot: featureSnapshot, active_concern_tags: activeTags } = build;
  if (input.mirror_kind === 'rijing') {
    return fromStageResult(
      input,
      generateRiJingOutput({
        feature_snapshot: featureSnapshot,
        active_concern_tags: activeTags,
        cited_event_memory_refs: input.cited_event_memory_refs,
        cited_plan_item_refs: input.cited_plan_item_refs,
      }),
    );
  }
  if (input.mirror_kind === 'yuejing') {
    return fromStageResult(
      input,
      generateYueJingOutput({
        feature_snapshot: featureSnapshot,
        mirror_scope: input.mirror_scope as Rolling30DayMirrorScope,
        active_concern_tags: activeTags,
        cited_event_memory_refs: input.cited_event_memory_refs,
        cited_plan_item_refs: input.cited_plan_item_refs,
      }),
    );
  }
  if (input.mirror_kind === 'nianjing') {
    return fromStageResult(
      input,
      generateNianJingOutput({
        feature_snapshot: featureSnapshot,
        mirror_scope: input.mirror_scope as LongHorizonMirrorScope,
        active_concern_tags: activeTags,
        cited_event_memory_refs: input.cited_event_memory_refs,
        cited_plan_item_refs: input.cited_plan_item_refs,
      }),
    );
  }
  if (input.mirror_kind === 'mingjing') return generateMingJingDeterministicOutput(build);
  return generateShiJingDeterministicOutput(build);
}
