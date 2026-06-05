// SJG-ASTRO-06 + SJG-ALGO-11 — NianJing phase-band and inflection-point
// generator.
//
// Consumes nianjing_phase_drivers and nianjing_inflection_drivers from
// the AstrologyFeatureSnapshot. Emits phase bands per concern tag plus
// inflection points keyed to deterministic markers. No curves, K-line,
// luck scores, or rankable numeric series may appear in the output.

import type { AstrologyFeatureSnapshot } from '../../domain/algorithm.ts';
import type { ConcernTag } from '../../domain/concern-tag.ts';
import type { LongHorizonMirrorScope } from '../../domain/mirror-scope.ts';
import type {
  NianJingInflectionPoint,
  NianJingMirrorOutput,
  NianJingPhaseBand,
} from '../../domain/mirror-output.ts';
import { type StageResult } from './stage-result.ts';
import {
  NIANJING_INFLECTION_KIND_LABELS,
  TENDENCY_CLASS_LABELS,
} from '../i18n/copy.ts';

export interface NianJingGenerateInput {
  readonly feature_snapshot: AstrologyFeatureSnapshot;
  readonly mirror_scope: LongHorizonMirrorScope;
  readonly active_concern_tags: readonly ConcernTag[];
  readonly cited_event_memory_refs: readonly string[];
  readonly cited_plan_item_refs: readonly string[];
}

export function generateNianJingOutput(
  input: NianJingGenerateInput,
): StageResult<NianJingMirrorOutput> {
  if (input.active_concern_tags.length === 0) {
    return {
      ok: false,
      error: {
        stage: 'nianjing_generate',
        kind: 'stage_invalid_input',
        detail: 'NianJing requires at least one active concern tag',
      },
    };
  }
  const phaseDrivers = input.feature_snapshot.nianjing_phase_drivers;
  const inflectionDrivers = input.feature_snapshot.nianjing_inflection_drivers;
  if (phaseDrivers.length === 0) {
    return {
      ok: false,
      error: {
        stage: 'nianjing_generate',
        kind: 'stage_invalid_input',
        detail: 'feature snapshot missing nianjing phase drivers',
      },
    };
  }
  const phaseBands: NianJingPhaseBand[] = phaseDrivers.map((driver) => ({
    concern_tag_ref: driver.concern_tag_ref,
    start_date: driver.start_date,
    end_date: driver.end_date,
    nature: driver.nature,
    driver_refs: [...driver.driver_refs],
    // Human-facing stage name (e.g.「平稳期」「建设期」) so the 年镜
    // hero rows + lane labels read in Chinese.
    // Must NOT be the raw English `nature` enum.
    summary: `${TENDENCY_CLASS_LABELS[driver.nature]}期`,
  }));
  const inflectionPoints: NianJingInflectionPoint[] = inflectionDrivers.map((driver) => ({
    concern_tag_ref: driver.concern_tag_ref,
    date: driver.date,
    ...(driver.date_window ? { date_window: { ...driver.date_window } } : {}),
    kind: driver.kind,
    driver_refs: [...driver.driver_refs],
    // Chinese kind label (e.g.「流年切换」) — not the raw enum.
    summary: `${NIANJING_INFLECTION_KIND_LABELS[driver.kind]} · ${driver.date}`,
  }));
  const output: NianJingMirrorOutput = {
    mirror_kind: 'nianjing',
    summary: `长程相位窗 (${input.mirror_scope.start_date} → ${input.mirror_scope.end_date})`,
    horizon: { start_date: input.mirror_scope.start_date, end_date: input.mirror_scope.end_date },
    phase_bands: phaseBands,
    inflection_points: inflectionPoints,
    cited_event_memory_refs: [...input.cited_event_memory_refs],
    cited_plan_item_refs: [...input.cited_plan_item_refs],
    citations: [
      { method: 'bazi_ganzhi_jieqi_dayun_v1', reference: 'nianjing.phase_inflection_derivation' },
    ],
  };
  return { ok: true, value: output };
}
