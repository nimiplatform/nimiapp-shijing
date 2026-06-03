// SJG-ASTRO-05 — YueJing rolling 30-day mirror generator.
//
// Consumes deterministic yuejing_tendency_drivers (one per local date X
// active concern tag) and folds them into a YueJingMirrorOutput.

import type { AstrologyFeatureSnapshot } from '../../domain/algorithm.ts';
import type { ConcernTag } from '../../domain/concern-tag.ts';
import type { Rolling30DayMirrorScope } from '../../domain/mirror-scope.ts';
import type { YueJingCell, YueJingMirrorOutput } from '../../domain/mirror-output.ts';
import { type StageResult } from './stage-result.ts';

export interface YueJingGenerateInput {
  readonly feature_snapshot: AstrologyFeatureSnapshot;
  readonly mirror_scope: Rolling30DayMirrorScope;
  readonly active_concern_tags: readonly ConcernTag[];
  readonly cited_event_memory_refs: readonly string[];
  readonly cited_plan_item_refs: readonly string[];
}

export function generateYueJingOutput(
  input: YueJingGenerateInput,
): StageResult<YueJingMirrorOutput> {
  if (input.active_concern_tags.length === 0) {
    return {
      ok: false,
      error: {
        stage: 'yuejing_generate',
        kind: 'stage_invalid_input',
        detail: 'YueJing requires at least one active concern tag',
      },
    };
  }
  const drivers = input.feature_snapshot.yuejing_tendency_drivers;
  if (drivers.length === 0) {
    return {
      ok: false,
      error: {
        stage: 'yuejing_generate',
        kind: 'stage_invalid_input',
        detail: 'feature snapshot missing yuejing tendency drivers',
      },
    };
  }
  const cells: YueJingCell[] = drivers.map((driver) => ({
    date: driver.date,
    concern_tag_ref: driver.concern_tag_ref,
    tendency_class: driver.tendency_class,
    summary: `${driver.tendency_class} (${driver.driver_refs[0] ?? 'cycle_baseline'})`,
  }));
  const output: YueJingMirrorOutput = {
    mirror_kind: 'yuejing',
    summary: `滚动 30 日: ${input.mirror_scope.start_date} → ${input.mirror_scope.end_date}`,
    range: { start_date: input.mirror_scope.start_date, end_date: input.mirror_scope.end_date },
    cells,
    cited_event_memory_refs: [...input.cited_event_memory_refs],
    cited_plan_item_refs: [...input.cited_plan_item_refs],
    citations: [
      { method: 'bazi_ganzhi_jieqi_dayun_v1', reference: 'yuejing.daily_tendency_drivers' },
    ],
  };
  return { ok: true, value: output };
}
