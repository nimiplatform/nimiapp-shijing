// SJG-ALGO-16 — structural validator for the 命镜 natal projection.
//
// Defence-in-depth over buildMingJingProjection: the projection is deterministic,
// but a validator keeps its invariants explicit and fails closed on drift
// (unordered DaYun, out-of-set 格局/纳音 labels, malformed 流年 windows). It does
// NOT re-derive astrology — it only checks shape + closed-set membership.

import { FIVE_ELEMENTS, type FiveElement } from '../product/astrology/element-relations.ts';
import { TENDENCY_CLASSES } from '../domain/mirror-output.ts';
import {
  BAZI_PATTERN_DISPOSITIONS,
  BAZI_PATTERN_NAMES,
  BAZI_PATTERN_SOURCES,
  LIUNIAN_SALIENCES,
  PERIOD_FAVORS,
  type MingJingChart,
} from '../domain/mingjing.ts';

export type MingJingChartValidationCode =
  | 'mingjing_subject_ref_not_self'
  | 'mingjing_canonicalization_hash_empty'
  | 'mingjing_missing_core_pillars'
  | 'mingjing_pattern_name_invalid'
  | 'mingjing_pattern_source_invalid'
  | 'mingjing_pattern_disposition_invalid'
  | 'mingjing_void_branch_count_invalid'
  | 'mingjing_five_elements_incomplete'
  | 'mingjing_five_elements_extreme_invalid'
  | 'mingjing_dayun_not_required'
  | 'mingjing_dayun_too_few_periods'
  | 'mingjing_dayun_periods_unordered'
  | 'mingjing_dayun_nature_invalid'
  | 'mingjing_dayun_favor_invalid'
  | 'mingjing_liunian_horizon_invalid'
  | 'mingjing_liunian_window_range_invalid'
  | 'mingjing_liunian_window_nature_invalid'
  | 'mingjing_liunian_salience_invalid';

export interface MingJingChartValidationError {
  readonly code: MingJingChartValidationCode;
  readonly detail?: string;
}

export type MingJingChartValidationResult =
  | { ok: true }
  | { ok: false; error: MingJingChartValidationError };

const MIN_DAYUN_PERIODS = 8;
const TENDENCY_SET = new Set<string>(TENDENCY_CLASSES);
const FAVOR_SET = new Set<string>(PERIOD_FAVORS);
const SALIENCE_SET = new Set<string>(LIUNIAN_SALIENCES);
const PATTERN_NAME_SET = new Set<string>(BAZI_PATTERN_NAMES);
const PATTERN_SOURCE_SET = new Set<string>(BAZI_PATTERN_SOURCES);
const PATTERN_DISPOSITION_SET = new Set<string>(BAZI_PATTERN_DISPOSITIONS);

function fail(code: MingJingChartValidationCode, detail?: string): MingJingChartValidationResult {
  return { ok: false, error: detail === undefined ? { code } : { code, detail } };
}

function tallyComplete(tally: Readonly<Record<FiveElement, number>>): boolean {
  return FIVE_ELEMENTS.every((el) => typeof tally[el] === 'number' && Number.isFinite(tally[el]));
}

export function validateMingJingChart(chart: MingJingChart): MingJingChartValidationResult {
  if (chart.subject_ref !== 'self') return fail('mingjing_subject_ref_not_self');
  if (!chart.canonicalization_hash) return fail('mingjing_canonicalization_hash_empty');
  if (!chart.natal_chart.day_pillar || !chart.natal_chart.month_pillar) {
    return fail('mingjing_missing_core_pillars');
  }

  // 格局
  if (!PATTERN_NAME_SET.has(chart.pattern.name)) {
    return fail('mingjing_pattern_name_invalid', chart.pattern.name);
  }
  if (!PATTERN_SOURCE_SET.has(chart.pattern.source)) {
    return fail('mingjing_pattern_source_invalid', chart.pattern.source);
  }
  if (!PATTERN_DISPOSITION_SET.has(chart.pattern.disposition)) {
    return fail('mingjing_pattern_disposition_invalid', chart.pattern.disposition);
  }

  // 空亡 — a 旬 always has exactly two void branches.
  if (chart.void.void_branches.length !== 2) {
    return fail('mingjing_void_branch_count_invalid', String(chart.void.void_branches.length));
  }

  // 五行分布
  if (!tallyComplete(chart.five_elements.weighted) || !tallyComplete(chart.five_elements.count)) {
    return fail('mingjing_five_elements_incomplete');
  }
  if (
    !FIVE_ELEMENTS.includes(chart.five_elements.dominant) ||
    !FIVE_ELEMENTS.includes(chart.five_elements.weakest)
  ) {
    return fail('mingjing_five_elements_extreme_invalid');
  }

  // 大运结构
  if (!chart.dayun.required) return fail('mingjing_dayun_not_required');
  if (chart.dayun.periods.length < MIN_DAYUN_PERIODS) {
    return fail('mingjing_dayun_too_few_periods', String(chart.dayun.periods.length));
  }
  let prevStartYear = -Infinity;
  for (const period of chart.dayun.periods) {
    if (period.start_year < prevStartYear || period.start_year > period.end_year) {
      return fail('mingjing_dayun_periods_unordered', String(period.start_year));
    }
    prevStartYear = period.start_year;
    if (!TENDENCY_SET.has(period.nature)) return fail('mingjing_dayun_nature_invalid', period.nature);
    if (!FAVOR_SET.has(period.favor)) return fail('mingjing_dayun_favor_invalid', period.favor);
  }

  // 流年关键窗口
  if (chart.liunian.horizon.start_year > chart.liunian.horizon.end_year) {
    return fail('mingjing_liunian_horizon_invalid');
  }
  for (const window of chart.liunian.windows) {
    if (
      window.start_year > window.end_year ||
      window.pillars.length === 0 ||
      window.start_year < chart.liunian.horizon.start_year ||
      window.end_year > chart.liunian.horizon.end_year
    ) {
      return fail('mingjing_liunian_window_range_invalid', `${window.start_year}-${window.end_year}`);
    }
    if (!TENDENCY_SET.has(window.nature)) return fail('mingjing_liunian_window_nature_invalid', window.nature);
    if (!SALIENCE_SET.has(window.salience)) return fail('mingjing_liunian_salience_invalid', window.salience);
  }

  return { ok: true };
}
