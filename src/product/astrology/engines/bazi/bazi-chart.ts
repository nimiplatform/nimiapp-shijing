// SJG-ALGO-06/07/08 — per-subject BaZi chart: natal four pillars, DaYun (real
// sequence + current period), and the cycle snapshot (流年/流月/流日 transit
// pillars + 合冲/生克 markers). Replaces the retired dayun.ts stub and
// build-cycle-snapshot.ts approximation; relation tables (branch-relations,
// element-relations) are correct and reused.

import type {
  BaziSubjectChart,
  CycleMarker,
  CycleSnapshot,
  DayunSnapshot,
  GanzhiPillar,
  NatalChartSnapshot,
  TimedPillar,
  CanonicalMirrorWindow,
  NatalCanonicalization,
} from '../../../../domain/algorithm.ts';
import type { CalculationSex } from '../../../../domain/person.ts';
import type { SubjectRef } from '../../../../domain/subject-ref.ts';
import { type StageResult } from '../../stage-result.ts';
import { classifyBranchPair, isClashPair, isSixCombinationPair } from '../../branch-relations.ts';
import { classifyTransitToDayStem, transitRelationToMarkerKind } from '../../element-relations.ts';
import { buildBaziNatalChart, wallClockFromTrueSolarIso } from './bazi-natal.ts';
import { buildBaziInterpretation } from './bazi-features.ts';
import {
  computeDayunSequence,
  dayunPeriodForYear,
  eightCharOf,
  transitPillarsForCivilDate,
  type DayunSequence,
} from './bazi-calendar.ts';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_DAILY_PILLARS = 366; // stored daily detail cap (rijing/yuejing windows)
const MAX_WINDOW_SCAN_DAYS = 3700; // boundary scan cap (~10y long-horizon)

interface CivilDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

// Civil date of a window instant. The window convention (mirror-window.ts) stores
// local civil dates as UTC-midnight instants, so UTC fields are the civil date.
function civilDateOf(utcMs: number): CivilDate {
  const d = new Date(utcMs);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function buildDayun(
  natal: NatalChartSnapshot,
  canonicalization: NatalCanonicalization,
  calculation_sex: CalculationSex,
  required: boolean,
  referenceYear: number,
  subject_ref: SubjectRef,
): StageResult<{ snapshot: DayunSnapshot; sequence?: DayunSequence }> {
  if (!required) return { ok: true, value: { snapshot: { required: false } } };
  if (calculation_sex === 'unspecified') {
    return {
      ok: false,
      error: {
        stage: 'build_feature_snapshot',
        kind: 'stage_dayun_calculation_sex_unspecified',
        subject_ref,
        detail: 'SJG-ALGO-07: calculation_sex required when DaYun is required',
      },
    };
  }
  const wall = canonicalization.true_solar_time_utc
    ? wallClockFromTrueSolarIso(canonicalization.true_solar_time_utc)
    : null;
  if (!natal.year_pillar || !wall) {
    return {
      ok: false,
      error: {
        stage: 'build_feature_snapshot',
        kind: 'stage_invalid_input',
        subject_ref,
        detail: 'DaYun requires a year pillar (insufficient birth precision)',
      },
    };
  }
  const sequence = computeDayunSequence(wall, calculation_sex);
  const current = dayunPeriodForYear(sequence, referenceYear) ?? sequence.periods[0]!;
  const startUtc = Date.UTC(current.start_lunar_year, 0, 1);
  const endUtc = Date.UTC(current.end_lunar_year + 1, 0, 1);
  return {
    ok: true,
    value: {
      snapshot: {
        required: true,
        direction: sequence.direction,
        start_age_years: sequence.start_age_years,
        current_period_start_utc: new Date(startUtc).toISOString(),
        current_period_end_utc: new Date(endUtc).toISOString(),
        current_pillar: current.pillar,
      },
      sequence,
    },
  };
}

function dailyMarkersAgainstNatal(
  subject_ref: SubjectRef,
  natalDayPillar: GanzhiPillar | undefined,
  dailyPillars: readonly TimedPillar[],
): CycleMarker[] {
  const markers: CycleMarker[] = [];
  if (!natalDayPillar) return markers;
  const seen = new Set<string>();
  for (const dp of dailyPillars) {
    const transit = dp.pillar;
    const branchKind = classifyBranchPair(transit.branch, natalDayPillar.branch);
    if (branchKind === '相冲' || isClashPair(transit.branch, natalDayPillar.branch)) {
      const key = `clash:${dp.start_utc}`;
      if (!seen.has(key)) {
        seen.add(key);
        markers.push({ kind: 'clash', strength: 'high', start_utc: dp.start_utc, end_utc: dp.end_utc, subject_refs: [subject_ref], source: 'daily' });
      }
    } else if (branchKind === '六合' || isSixCombinationPair(transit.branch, natalDayPillar.branch)) {
      const key = `combination:${dp.start_utc}`;
      if (!seen.has(key)) {
        seen.add(key);
        markers.push({ kind: 'combination', strength: 'medium', start_utc: dp.start_utc, end_utc: dp.end_utc, subject_refs: [subject_ref], source: 'daily' });
      }
    }
    const relation = classifyTransitToDayStem(transit.stem, natalDayPillar.stem);
    const markerKind = transitRelationToMarkerKind(relation);
    if (markerKind !== null) {
      const key = `${markerKind}:${dp.start_utc}`;
      if (!seen.has(key)) {
        seen.add(key);
        markers.push({ kind: markerKind, strength: 'medium', start_utc: dp.start_utc, end_utc: dp.end_utc, subject_refs: [subject_ref], source: 'daily' });
      }
    }
  }
  return markers;
}

function buildCycleSnapshot(
  subject_ref: SubjectRef,
  natal: NatalChartSnapshot,
  window: CanonicalMirrorWindow,
  sequence: DayunSequence | undefined,
): StageResult<CycleSnapshot> {
  const startMs = Date.parse(window.start_utc);
  const endMs = Date.parse(window.end_utc);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || startMs >= endMs) {
    return {
      ok: false,
      error: { stage: 'build_cycle_snapshot', kind: 'stage_invalid_input', subject_ref, detail: 'canonical window has invalid start_utc / end_utc' },
    };
  }

  const scanDays = Math.min(MAX_WINDOW_SCAN_DAYS, Math.ceil((endMs - startMs) / MS_PER_DAY));
  const dailyPillars: TimedPillar[] = [];
  const monthlyPillars: TimedPillar[] = [];
  const markers: CycleMarker[] = [];

  const startDate = civilDateOf(startMs);
  const annualPillar = transitPillarsForCivilDate(startDate.year, startDate.month, startDate.day).year;

  let prevYearKey = '';
  let prevMonthKey = '';
  let monthRunStartMs = startMs;
  let monthRunPillar: GanzhiPillar | undefined;

  for (let i = 0; i < scanDays; i += 1) {
    const t = startMs + i * MS_PER_DAY;
    const tEnd = Math.min(t + MS_PER_DAY, endMs);
    const cd = civilDateOf(t);
    const transit = transitPillarsForCivilDate(cd.year, cd.month, cd.day);

    if (i < MAX_DAILY_PILLARS) {
      dailyPillars.push({ start_utc: new Date(t).toISOString(), end_utc: new Date(tEnd).toISOString(), pillar: transit.day });
    }

    const yearKey = `${transit.year.stem}${transit.year.branch}`;
    const monthKey = `${transit.month.stem}${transit.month.branch}`;

    if (prevYearKey !== '' && yearKey !== prevYearKey) {
      markers.push({ kind: 'annual_transition', strength: 'high', start_utc: new Date(t).toISOString(), end_utc: new Date(t + MS_PER_DAY).toISOString(), subject_refs: [subject_ref], source: 'annual', pillar: transit.year });
    }
    if (prevMonthKey !== '' && monthKey !== prevMonthKey) {
      markers.push({ kind: 'monthly_transition', strength: 'medium', start_utc: new Date(t).toISOString(), end_utc: new Date(t + MS_PER_DAY).toISOString(), subject_refs: [subject_ref], source: 'monthly' });
      if (monthRunPillar) {
        monthlyPillars.push({ start_utc: new Date(monthRunStartMs).toISOString(), end_utc: new Date(t).toISOString(), pillar: monthRunPillar });
      }
      monthRunStartMs = t;
    }
    prevYearKey = yearKey;
    prevMonthKey = monthKey;
    monthRunPillar = transit.month;
  }
  monthlyPillars.push({ start_utc: new Date(monthRunStartMs).toISOString(), end_utc: new Date(Math.min(startMs + scanDays * MS_PER_DAY, endMs)).toISOString(), pillar: monthRunPillar ?? annualPillar });

  // 大运 boundaries within the window (real, not the retired stub).
  if (sequence) {
    for (const period of sequence.periods) {
      const boundaryMs = Date.UTC(period.start_lunar_year, 0, 1);
      if (boundaryMs >= startMs && boundaryMs <= endMs) {
        markers.push({ kind: 'dayun_boundary', strength: 'high', start_utc: new Date(boundaryMs).toISOString(), end_utc: new Date(boundaryMs + MS_PER_DAY).toISOString(), subject_refs: [subject_ref], source: 'dayun', pillar: period.pillar });
      }
    }
  }

  markers.push(...dailyMarkersAgainstNatal(subject_ref, natal.day_pillar, dailyPillars));

  return {
    ok: true,
    value: {
      window_start_utc: window.start_utc,
      window_end_utc: window.end_utc,
      annual_pillar: annualPillar,
      monthly_pillars: monthlyPillars,
      daily_pillars: dailyPillars,
      markers,
    },
  };
}

export interface BuildBaziSubjectChartInput {
  readonly subject_ref: SubjectRef;
  readonly canonicalization: NatalCanonicalization;
  readonly calculation_sex: CalculationSex;
  readonly canonical_window: CanonicalMirrorWindow;
  readonly dayun_required: boolean;
}

export function buildBaziSubjectChart(input: BuildBaziSubjectChartInput): StageResult<BaziSubjectChart> {
  const natalResult = buildBaziNatalChart(input.subject_ref, input.canonicalization);
  if (!natalResult.ok) return natalResult;
  const natal = natalResult.value;

  const referenceYear = civilDateOf(Date.parse(input.canonical_window.start_utc)).year;
  const dayunResult = buildDayun(
    natal,
    input.canonicalization,
    input.calculation_sex,
    input.dayun_required,
    referenceYear,
    input.subject_ref,
  );
  if (!dayunResult.ok) return dayunResult;

  const cycleResult = buildCycleSnapshot(input.subject_ref, natal, input.canonical_window, dayunResult.value.sequence);
  if (!cycleResult.ok) return cycleResult;

  const wall = input.canonicalization.true_solar_time_utc
    ? wallClockFromTrueSolarIso(input.canonicalization.true_solar_time_utc)
    : null;
  const interpretation = wall ? buildBaziInterpretation(eightCharOf(wall), natal) : undefined;

  return {
    ok: true,
    value: {
      subject_ref: input.subject_ref,
      natal_chart: natal,
      dayun: dayunResult.value.snapshot,
      cycle_snapshot: cycleResult.value,
      ...(interpretation ? { interpretation } : {}),
    },
  };
}
