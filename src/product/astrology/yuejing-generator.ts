// SJG-ASTRO-05 — YueJing day-cell mirror generator.
//
// Consumes deterministic yuejing_tendency_drivers for the scope start date
// (one per active concern tag) and folds them into a YueJingMirrorOutput.

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

const TENDENCY_WORDING: Record<YueJingCell['tendency_class'], string> = {
  supportive: '助力窗口',
  steady: '平稳守成',
  watch: '需要观察',
  blocked: '阻滞偏重',
  turning: '变化转折',
};

function labelForConcern(tag: ConcernTag | undefined, fallback: string): string {
  return tag?.label || fallback;
}

function deterministicCellSummary(
  driver: AstrologyFeatureSnapshot['yuejing_tendency_drivers'][number],
  tag: ConcernTag | undefined,
): string {
  const label = labelForConcern(tag, driver.concern_tag_ref);
  const domainRef = driver.driver_refs.find((ref) => ref.startsWith('domain.')) ?? 'domain.general';
  const relationRef =
    driver.driver_refs.find((ref) => ref.startsWith('daily_relation.')) ??
    driver.driver_refs.find((ref) => ref.startsWith('branch_relation.')) ??
    driver.driver_refs[0] ??
    'cycle_baseline';
  return `${label}: ${TENDENCY_WORDING[driver.tendency_class]}, 依据 ${domainRef} / ${relationRef}`;
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
  const targetDate = input.mirror_scope.start_date;
  const tagById = new Map(input.active_concern_tags.map((tag) => [tag.id, tag]));
  const cells: YueJingCell[] = drivers
    .filter((driver) => driver.date === targetDate)
    .map((driver) => ({
    date: driver.date,
    concern_tag_ref: driver.concern_tag_ref,
    tendency_class: driver.tendency_class,
    summary: deterministicCellSummary(driver, tagById.get(driver.concern_tag_ref)),
  }));
  if (cells.length === 0) {
    return {
      ok: false,
      error: {
        stage: 'yuejing_generate',
        kind: 'stage_invalid_input',
        detail: `feature snapshot missing yuejing tendency drivers for ${targetDate}`,
      },
    };
  }
  const output: YueJingMirrorOutput = {
    mirror_kind: 'yuejing',
    summary: `月镜单日: ${targetDate}`,
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
