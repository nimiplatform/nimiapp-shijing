// SJG-ALGO-16 — 大运结构 for the 命镜 natal projection.
//
// Projects the FULL DaYun sequence (computeDayunSequence, bazi-calendar.ts) into
// per-step features: the 大运 stem's 十神 vs the day master, the day master's
// 十二长生 at the 大运 branch, the period's 用神 favourability (baziPeriodNature),
// the 大运支 ↔ natal-branch 合冲刑害破, and 转折 flags (冲提纲 / 冲日支). Period
// nature is 用神-driven, never a blanket 转折 (SJG-ALGO-16).

import { EarthBranch, HeavenStem } from 'tyme4ts';
import {
  EARTHLY_BRANCHES,
  HEAVENLY_STEMS,
  type NatalChartSnapshot,
  type YongShen,
} from '../../../../domain/algorithm.ts';
import type { DayunPeriodFeature, DayunStructure } from '../../../../domain/mingjing.ts';
import { isClashPair } from '../../branch-relations.ts';
import type { DayunSequence } from './bazi-calendar.ts';
import { baziPeriodNature } from './bazi-tendency.ts';
import { branchRelationsAgainstNatal } from './bazi-transit-relations.ts';

export interface DayunFeaturesInput {
  readonly sequence: DayunSequence;
  readonly natal: NatalChartSnapshot;
  readonly yong: YongShen;
  readonly reference_year: number;
}

export function buildDayunStructure(input: DayunFeaturesInput): DayunStructure {
  const { sequence, natal, yong, reference_year } = input;
  const dayMaster = natal.day_pillar?.stem;
  if (!dayMaster) {
    // 命镜 requires an exact chart (day pillar present); guard so a degraded
    // chart fails closed upstream rather than producing a bogus 大运 surface.
    throw new Error('buildDayunStructure: missing day pillar');
  }
  const dayMasterTy = HeavenStem.fromIndex(HEAVENLY_STEMS.indexOf(dayMaster));
  const monthBranch = natal.month_pillar?.branch;
  const dayBranch = natal.day_pillar?.branch;

  const periods: DayunPeriodFeature[] = sequence.periods.map((period) => {
    const stemTy = HeavenStem.fromIndex(HEAVENLY_STEMS.indexOf(period.pillar.stem));
    const branchTy = EarthBranch.fromIndex(EARTHLY_BRANCHES.indexOf(period.pillar.branch));
    const periodNature = baziPeriodNature(period.pillar.stem, yong);
    const clashesMonth = monthBranch ? isClashPair(period.pillar.branch, monthBranch) : false;
    const clashesDay = dayBranch ? isClashPair(period.pillar.branch, dayBranch) : false;
    return {
      pillar: period.pillar,
      start_age: period.start_age,
      end_age: period.end_age,
      start_year: period.start_lunar_year,
      end_year: period.end_lunar_year,
      stem_ten_god: dayMasterTy.getTenStar(stemTy).getName(),
      terrain: dayMasterTy.getTerrain(branchTy).getName(),
      nature: periodNature.nature,
      favor: periodNature.favor,
      natal_branch_relations: branchRelationsAgainstNatal(period.pillar.branch, natal),
      is_inflection: clashesMonth || clashesDay,
      is_current: reference_year >= period.start_lunar_year && reference_year <= period.end_lunar_year,
    };
  });

  return {
    required: true,
    direction: sequence.direction,
    start_age_years: sequence.start_age_years,
    periods,
  };
}
