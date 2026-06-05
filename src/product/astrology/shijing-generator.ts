// SJG-ASTRO-07 — ShiJing consultation generator.
//
// Grounds the consultation answer in the cited source readings. May NOT
// create a new astrology output entity, mutate deterministic facts, or
// pretend uncited memory influenced the answer.

import type { Reading } from '../../domain/reading.ts';
import type { ConsultationMirrorScope } from '../../domain/mirror-scope.ts';
import type { ShiJingMirrorOutput } from '../../domain/mirror-output.ts';
import { BAZI_ZIPING_V1 } from '../../domain/algorithm.ts';
import { type StageResult } from './stage-result.ts';

export interface ShiJingGenerateInput {
  readonly mirror_scope: ConsultationMirrorScope;
  readonly source_readings: readonly Reading[];
  readonly question: string;
  readonly cited_event_memory_refs: readonly string[];
  readonly cited_plan_item_refs: readonly string[];
}

export function generateShiJingOutput(
  input: ShiJingGenerateInput,
): StageResult<ShiJingMirrorOutput> {
  if (input.mirror_scope.source_reading_ids.length === 0) {
    return {
      ok: false,
      error: {
        stage: 'shijing_generate',
        kind: 'stage_invalid_input',
        detail: 'ShiJing consultation requires non-empty source_reading_ids',
      },
    };
  }
  const sourceIds = new Set(input.mirror_scope.source_reading_ids);
  for (const reading of input.source_readings) {
    if (!sourceIds.has(reading.id)) {
      return {
        ok: false,
        error: {
          stage: 'shijing_generate',
          kind: 'stage_invalid_input',
          detail: `cited reading ${reading.id} not in mirror_scope.source_reading_ids`,
        },
      };
    }
  }
  if (input.source_readings.length === 0) {
    return {
      ok: false,
      error: {
        stage: 'shijing_generate',
        kind: 'stage_invalid_input',
        detail: 'ShiJing consultation requires at least one resolved source reading',
      },
    };
  }
  const referenced = input.source_readings.map((r) => `${r.mirror_kind}:${r.id}`).join('; ');
  const output: ShiJingMirrorOutput = {
    mirror_kind: 'shijing',
    summary: `咨询基于 ${input.source_readings.length} 份既有解读`,
    answer: `结合 ${referenced} 中的确定性结构,问 "${input.question.slice(0, 80)}" 的稳态方向是:观察被引用解读中提及的关键窗口,优先回应已被记录的事件记忆与计划。`,
    cited_reading_ids: [...input.mirror_scope.source_reading_ids],
    cited_event_memory_refs: [...input.cited_event_memory_refs],
    cited_plan_item_refs: [...input.cited_plan_item_refs],
    citations: [
      { method: input.source_readings[0]?.inputs_summary.method_profile.id ?? BAZI_ZIPING_V1, reference: 'shijing.consultation_grounding' },
    ],
  };
  return { ok: true, value: output };
}
