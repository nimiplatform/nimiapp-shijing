// SJG-ASTRO-07 — ShiJing consultation flow.
//
// Builds the consultation MirrorScope grounded in cited
// source_reading_ids and routes the request through the generator.
// The actual structured output is produced by `shijing-generator.ts`
// (or refined by Runtime AI under the orchestrator).

import type {
  ConsultationMirrorScope,
  ConsultationQuestionWindow,
} from '../../domain/mirror-scope.ts';
import type { Reading } from '../../domain/reading.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';

export type ConsultationHorizonParseResult =
  | { readonly ok: true; readonly days: number }
  | { readonly ok: false; readonly reason: 'empty' | 'not_integer' | 'not_positive'; readonly detail: string };

export function parseConsultationHorizonDays(value: string): ConsultationHorizonParseResult {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { ok: false, reason: 'empty', detail: 'consultation_horizon_days_empty' };
  }
  const n = Number(trimmed);
  if (!Number.isInteger(n)) {
    return { ok: false, reason: 'not_integer', detail: `consultation_horizon_days_not_integer: ${trimmed}` };
  }
  if (n <= 0) {
    return { ok: false, reason: 'not_positive', detail: `consultation_horizon_days_not_positive: ${trimmed}` };
  }
  return { ok: true, days: n };
}

export interface BuildConsultationScopeInput {
  readonly source_reading_ids: readonly string[];
  readonly basis_time_zone: string;
  readonly question_window_days?: number;
  readonly now?: Date;
}

export type BuildConsultationScopeResult =
  | { ok: true; scope: ConsultationMirrorScope }
  | { ok: false; reason: 'source_readings_empty' | 'question_window_out_of_bounds' };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatLocalDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function buildConsultationScope(
  input: BuildConsultationScopeInput,
): BuildConsultationScopeResult {
  if (input.source_reading_ids.length === 0) {
    return { ok: false, reason: 'source_readings_empty' };
  }
  let question_window: ConsultationQuestionWindow | undefined;
  if (input.question_window_days !== undefined) {
    if (input.question_window_days < 1 || input.question_window_days > 365) {
      return { ok: false, reason: 'question_window_out_of_bounds' };
    }
    const now = input.now ?? new Date();
    const startMs = now.getTime();
    const endMs = startMs + (input.question_window_days - 1) * MS_PER_DAY;
    question_window = {
      start_date: formatLocalDate(new Date(startMs)),
      end_date: formatLocalDate(new Date(endMs)),
    };
  }
  return {
    ok: true,
    scope: {
      kind: 'consultation',
      source_reading_ids: [...input.source_reading_ids],
      basis_time_zone: input.basis_time_zone,
      ...(question_window ? { question_window } : {}),
    },
  };
}

export function resolveSourceReadings(
  ids: readonly string[],
  space: ShiJingSpace,
): { ok: true; readings: Reading[] } | { ok: false; missing: string } {
  const readings: Reading[] = [];
  for (const id of ids) {
    const r = space.readings.find((entry) => entry.id === id);
    if (!r) return { ok: false, missing: id };
    readings.push(r);
  }
  return { ok: true, readings };
}
