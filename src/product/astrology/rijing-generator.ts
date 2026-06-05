// SJG-ASTRO-04 — RiJing daily mirror generator.
//
// Consumes the algorithm-agnostic common driver surface (dated tendency drivers
// + stage drivers) and the active concern tags, emitting a RiJingMirrorOutput.
// It never reads method_evidence; the engine projects per-concern daily tendency
// into common.yuejing_tendency_drivers. Runtime AI may refine prose downstream.

import type { AstrologyFeatureSnapshot } from '../../domain/algorithm.ts';
import type { ConcernTag } from '../../domain/concern-tag.ts';
import type {
  RiJingConcernProjection,
  RiJingMirrorOutput,
  TendencyClass,
} from '../../domain/mirror-output.ts';
import { type StageResult } from './stage-result.ts';

export interface RiJingGenerateInput {
  readonly feature_snapshot: AstrologyFeatureSnapshot;
  readonly active_concern_tags: readonly ConcernTag[];
  readonly cited_event_memory_refs: readonly string[];
  readonly cited_plan_item_refs: readonly string[];
}

export function generateRiJingOutput(
  input: RiJingGenerateInput,
): StageResult<RiJingMirrorOutput> {
  if (input.active_concern_tags.length === 0) {
    return {
      ok: false,
      error: {
        stage: 'rijing_generate',
        kind: 'stage_invalid_input',
        detail: 'RiJing requires at least one active concern tag',
      },
    };
  }
  const common = input.feature_snapshot.common;
  const tendencyByConcern = new Map<string, TendencyClass>(
    common.yuejing_tendency_drivers.map((d) => [d.concern_tag_ref, d.tendency_class]),
  );
  const stageLabels = common.stage_drivers.map((d) => d.stage_label);
  const stageBlurb = stageLabels.length > 0 ? `${stageLabels.join('/')} 时段` : '守时 时段';

  const projections: RiJingConcernProjection[] = input.active_concern_tags.map((tag) => {
    const tendency = tendencyByConcern.get(tag.id) ?? 'steady';
    return {
      concern_tag_ref: tag.id,
      tendency_class: tendency,
      summary: `${tag.label} 今日 ${tendency} (${stageBlurb})`,
      recommendations: [`关注 ${tag.label} 的当下信号`],
    };
  });
  const overall = projections[0]?.tendency_class ?? 'steady';

  const output: RiJingMirrorOutput = {
    mirror_kind: 'rijing',
    summary: `今日总体 ${overall} (${stageBlurb})`,
    daily_overview: `今日处于 ${stageBlurb}`,
    concern_projections: projections,
    cited_event_memory_refs: [...input.cited_event_memory_refs],
    cited_plan_item_refs: [...input.cited_plan_item_refs],
    citations: [
      { method: input.feature_snapshot.method_profile.id, reference: 'rijing.daily_tendency_classification' },
    ],
  };
  return { ok: true, value: output };
}
