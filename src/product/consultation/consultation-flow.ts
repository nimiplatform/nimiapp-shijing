import type { ReadingTimeWindow } from '../../domain/reading.ts';
import type { View } from '../../domain/view.ts';

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

export function consultationTimeWindowFromDays(
  basisTimeZone: string,
  days: number,
  now: Date = new Date(),
): ReadingTimeWindow {
  const startMs = now.getTime();
  return {
    mode: 'bounded',
    start_utc: now.toISOString(),
    end_utc: new Date(startMs + days * 24 * 60 * 60 * 1000).toISOString(),
    basis_time_zone: basisTimeZone,
    source: 'ad_hoc_question',
  };
}

export interface BuildConsultationContextTextInput {
  readonly question: string;
  readonly view?: View;
}

export function buildConsultationContextText(input: BuildConsultationContextTextInput): string {
  const question = input.question.trim();
  if (!input.view) return question;
  const view = input.view;
  const lines = [`问题：${question}`, `借用关注：${view.title}`];
  if (view.instructions.trim().length > 0) {
    lines.push(`关注指示：${view.instructions.trim()}`);
  }
  if (view.view_memory.summary.trim().length > 0) {
    lines.push(`关注记忆：${view.view_memory.summary.trim()}`);
  }
  for (const item of view.context_items) {
    if (item.body.trim().length > 0) {
      lines.push(`上下文/${item.kind}：${item.body.trim()}`);
    }
  }
  return lines.join('\n');
}
