// SJG-ASTRO-04 — RiJing daily mirror generator.
//
// Consumes the deterministic AstrologyFeatureSnapshot and the active
// concern tags and emits a RiJingMirrorOutput. Runtime AI may refine
// prose fields downstream; this module owns deterministic structure.

import type { AstrologyFeatureSnapshot } from '../../domain/algorithm.ts';
import type { ConcernTag } from '../../domain/concern-tag.ts';
import type {
  RiJingConcernProjection,
  RiJingMirrorOutput,
  TendencyClass,
} from '../../domain/mirror-output.ts';
import { type StageResult } from './stage-result.ts';

function dailyTendencyForConcern(snapshot: AstrologyFeatureSnapshot): TendencyClass {
  const markers = snapshot.self_subject.cycle_snapshot.markers;
  if (markers.some((m) => m.kind === 'clash' || m.kind === 'annual_transition')) {
    return 'turning';
  }
  if (markers.some((m) => m.kind === 'combination' || m.kind === 'resource')) {
    return 'supportive';
  }
  if (markers.some((m) => m.kind === 'constraint' || m.kind === 'storage')) {
    return 'watch';
  }
  if (markers.some((m) => m.kind === 'output' || m.kind === 'wealth')) {
    return 'supportive';
  }
  return 'steady';
}

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
  const tendency = dailyTendencyForConcern(input.feature_snapshot);
  const stageLabels = input.feature_snapshot.stage_drivers.map((d) => d.stage_label);
  const stageBlurb = stageLabels.length > 0 ? `${stageLabels.join('/')} 时段` : '守时 时段';
  const projections: RiJingConcernProjection[] = input.active_concern_tags.map((tag) => ({
    concern_tag_ref: tag.id,
    tendency_class: tendency,
    summary: `${tag.label} 今日 ${tendency} (${stageBlurb})`,
    recommendations: [`关注 ${tag.label} 的当下信号`],
  }));
  const output: RiJingMirrorOutput = {
    mirror_kind: 'rijing',
    summary: `今日总体 ${tendency} (${stageBlurb})`,
    daily_overview: `日柱 ${input.feature_snapshot.self_subject.natal_chart.day_pillar?.stem ?? '?'}/${input.feature_snapshot.self_subject.natal_chart.day_pillar?.branch ?? '?'} 与当日柱共振`,
    concern_projections: projections,
    cited_event_memory_refs: [...input.cited_event_memory_refs],
    cited_plan_item_refs: [...input.cited_plan_item_refs],
    citations: [
      { method: 'bazi_ganzhi_jieqi_dayun_v1', reference: 'rijing.daily_tendency_classification' },
    ],
  };
  return { ok: true, value: output };
}
