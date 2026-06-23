// Deterministic live display for NianJing.
//
// This deliberately returns only NianJingMirrorOutput, not a Reading. The
// timeline can render immediately from SJG-ALGO-08/11 deterministic drivers,
// while the explicit generate action remains the boundary for persisted,
// importable Runtime-AI-worded Readings.

import type { ConcernTag } from '../../../domain/concern-tag.ts';
import type { LongHorizonMirrorScope } from '../../../domain/mirror-scope.ts';
import type { NianJingMirrorOutput } from '../../../domain/mirror-output.ts';
import type { ReadingGenerationFailure } from '../../../domain/reading.ts';
import type { ShiJingSpace } from '../../../domain/shijing-space.ts';
import { buildAstrologyFeatureSnapshot } from '../../astrology/build-feature-snapshot.ts';
import { generateNianJingOutput } from '../../astrology/nianjing-generator.ts';
import type { StageFailure } from '../../astrology/stage-result.ts';
import { evaluateFailClose } from '../../astrology/uncertainty-decision.ts';

export interface BuildNianJingDirectDisplayOutputInput {
  readonly space: ShiJingSpace;
  readonly mirror_scope: LongHorizonMirrorScope;
  readonly active_concern_tags: readonly ConcernTag[];
}

export type BuildNianJingDirectDisplayOutputResult =
  | { ok: true; output: NianJingMirrorOutput }
  | { ok: false; failure: ReadingGenerationFailure };

function failureFromStage(
  scope: LongHorizonMirrorScope,
  stageFailure: StageFailure,
): ReadingGenerationFailure {
  return {
    kind: 'pipeline_stage_failed',
    mirror_kind: 'nianjing',
    mirror_scope: scope,
    stage: stageFailure.stage,
    detail: stageFailure.detail,
  };
}

export function buildNianJingDirectDisplayOutput(
  input: BuildNianJingDirectDisplayOutputInput,
): BuildNianJingDirectDisplayOutputResult {
  const featureResult = buildAstrologyFeatureSnapshot({
    mirror_kind: 'nianjing',
    mirror_scope: input.mirror_scope,
    space: input.space,
    related_person_refs: [],
    active_concern_tags: input.active_concern_tags,
    method_profile_id: input.space.settings.method_profile_id,
  });
  if (!featureResult.ok) {
    return { ok: false, failure: failureFromStage(input.mirror_scope, featureResult.error) };
  }

  const failClose = evaluateFailClose(featureResult.value);
  if (failClose.failed) {
    return {
      ok: false,
      failure: {
        kind: 'algorithm_fail_closed',
        mirror_kind: 'nianjing',
        mirror_scope: input.mirror_scope,
        stage: 'uncertainty_decision',
        detail: `SJG-ALGO-10 fail-closed: ${failClose.codes.join(',')}`,
      },
    };
  }

  const outputResult = generateNianJingOutput({
    feature_snapshot: featureResult.value,
    mirror_scope: input.mirror_scope,
    active_concern_tags: input.active_concern_tags,
    cited_event_memory_refs: [],
    cited_plan_item_refs: [],
  });
  if (!outputResult.ok) {
    return { ok: false, failure: failureFromStage(input.mirror_scope, outputResult.error) };
  }

  return { ok: true, output: outputResult.value };
}
