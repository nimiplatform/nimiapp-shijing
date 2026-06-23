// SJG-ALGO-16 — 流年关键窗口 for the 命镜 natal projection.
//
// Walks a bounded future horizon (anchor year … anchor + N), scores each 流年 for
// salience (strong 用神 喜/忌 of the year element, 流年支 冲/合/三合/刑 with the 日支
// or 月令, or a 大运 boundary year), drops the non-salient years, and groups
// contiguous salient years of the same nature into windows. This is the
// deliberate "提炼几年" surface — never a year-by-year ledger (SJG-ALGO-16,
// mirroring SJG-ALGO-11's forbidden K-line/ledger constraint).

import {
  type NatalChartSnapshot,
  type GanzhiPillar,
  type YongShen,
  type BaziBranchRelation,
} from '../../../../domain/algorithm.ts';
import type { TendencyClass } from '../../../../domain/mirror-output.ts';
import type {
  LiuNianProjection,
  LiuNianSalience,
  LiuNianWindow,
  LiuNianYearPillar,
  PeriodFavor,
} from '../../../../domain/mingjing.ts';
import { isClashPair, isSixCombinationPair, isThreeHarmonyPair, isXingPair } from '../../branch-relations.ts';
import {
  transitPillarsForCivilDate,
  dayunPeriodForYear,
  type DayunSequence,
} from './bazi-calendar.ts';
import { baziPeriodNature } from './bazi-tendency.ts';
import { branchRelationsAgainstNatal } from './bazi-transit-relations.ts';

export const LIUNIAN_DEFAULT_HORIZON_YEARS = 12 as const;

export interface LiuNianInput {
  readonly natal: NatalChartSnapshot;
  readonly yong: YongShen;
  readonly sequence: DayunSequence;
  readonly anchor_year: number;
  readonly horizon_years?: number;
}

interface ScoredYear {
  readonly year: number;
  readonly pillar: GanzhiPillar;
  readonly nature: TendencyClass;
  readonly favor: PeriodFavor;
  readonly relations: readonly BaziBranchRelation[];
  readonly dayun_pillar?: GanzhiPillar;
  readonly salience: LiuNianSalience;
  readonly reasons: readonly string[];
}

function scoreYear(input: LiuNianInput, year: number): ScoredYear | null {
  const { natal, yong, sequence } = input;
  // Mid-year (after 立春) so the civil year maps to its dominant 流年干支.
  const pillar = transitPillarsForCivilDate(year, 6, 1).year;
  const { nature, favor } = baziPeriodNature(pillar.stem, yong);

  const dayBranch = natal.day_pillar?.branch;
  const monthBranch = natal.month_pillar?.branch;
  const reasons: string[] = [];
  let high = false;

  if (dayBranch && isClashPair(pillar.branch, dayBranch)) {
    reasons.push('冲日支');
    high = true;
  }
  if (monthBranch && isClashPair(pillar.branch, monthBranch)) {
    reasons.push('冲提纲');
    high = true;
  }
  if (favor === '忌' && nature === 'blocked') {
    reasons.push('忌神当值');
    high = true;
  } else if (favor === '忌') {
    reasons.push('忌神');
  }
  if (favor === '喜') {
    reasons.push('喜用得力');
  }
  if (dayBranch && (isSixCombinationPair(pillar.branch, dayBranch) || isThreeHarmonyPair(pillar.branch, dayBranch))) {
    reasons.push('合日支');
    if (favor === '喜') high = true; // 喜神逢合日支 → 强化
  }
  if ((dayBranch && isXingPair(pillar.branch, dayBranch)) || (monthBranch && isXingPair(pillar.branch, monthBranch))) {
    reasons.push('逢刑');
  }
  const isDayunBoundary = sequence.periods.some((p) => p.start_lunar_year === year);
  if (isDayunBoundary) reasons.push('交大运');

  if (reasons.length === 0) return null;

  return {
    year,
    pillar,
    nature,
    favor,
    relations: branchRelationsAgainstNatal(pillar.branch, natal, ['day', 'month']),
    dayun_pillar: dayunPeriodForYear(sequence, year)?.pillar,
    salience: high ? 'high' : 'medium',
    reasons,
  };
}

function dedupeRelations(relations: readonly BaziBranchRelation[]): BaziBranchRelation[] {
  const seen = new Set<string>();
  const out: BaziBranchRelation[] = [];
  for (const rel of relations) {
    const key = `${rel.kind}:${rel.positions.join(',')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(rel);
  }
  return out;
}

// Group contiguous salient years that share a nature into one window.
function groupWindows(scored: readonly ScoredYear[]): LiuNianWindow[] {
  const windows: LiuNianWindow[] = [];
  let run: ScoredYear[] = [];

  const flush = () => {
    if (run.length === 0) return;
    const first = run[0]!;
    const pillars: LiuNianYearPillar[] = run.map((y) => ({ year: y.year, pillar: y.pillar }));
    const salience: LiuNianSalience = run.some((y) => y.salience === 'high') ? 'high' : 'medium';
    windows.push({
      start_year: first.year,
      end_year: run[run.length - 1]!.year,
      pillars,
      nature: first.nature,
      favor: first.favor,
      salience,
      natal_branch_relations: dedupeRelations(run.flatMap((y) => y.relations)),
      ...(first.dayun_pillar ? { dayun_pillar: first.dayun_pillar } : {}),
      basis: [...new Set(run.flatMap((y) => y.reasons))],
    });
    run = [];
  };

  for (const year of scored) {
    const prev = run[run.length - 1];
    const contiguous = prev && year.year === prev.year + 1 && year.nature === prev.nature;
    if (!contiguous) flush();
    run.push(year);
  }
  flush();
  return windows;
}

export function buildLiuNianProjection(input: LiuNianInput): LiuNianProjection {
  const horizonYears = input.horizon_years ?? LIUNIAN_DEFAULT_HORIZON_YEARS;
  const startYear = input.anchor_year;
  const endYear = input.anchor_year + horizonYears;

  const scored: ScoredYear[] = [];
  for (let year = startYear; year <= endYear; year += 1) {
    const result = scoreYear(input, year);
    if (result) scored.push(result);
  }

  return {
    horizon: { start_year: startYear, end_year: endYear },
    windows: groupWindows(scored),
  };
}
