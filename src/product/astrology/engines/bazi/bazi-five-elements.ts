// SJG-ALGO-16 — 五行分布 for the 命镜 natal projection.
//
// Counts the chart's elemental makeup across all present pillars: each visible
// 天干 and every 藏干, with a raw occurrence count and a position-weighted score
// (月令 dominant, then 日支; 本/中/余气 graded). Unlike 旺衰 (wangshuai.ts) the day
// stem IS counted here, because this is the whole-chart distribution, not the
// support/drain split. Display-only, tendency-neutral (SJG-ALGO-15).

import type { EightChar, HeavenStem as TyHeavenStem } from 'tyme4ts';
import {
  HEAVENLY_STEMS,
  type FiveElement,
  type HeavenlyStem,
  type HiddenStemWeightClass,
  type NatalChartSnapshot,
  type PillarPosition,
} from '../../../../domain/algorithm.ts';
import { FIVE_ELEMENTS, STEM_TO_ELEMENT } from '../../element-relations.ts';
import type { FiveElementDistribution, FiveElementTally } from '../../../../domain/mingjing.ts';

const WEIGHT_CLASS: Readonly<Record<number, HiddenStemWeightClass>> = {
  2: 'primary',
  1: 'middle',
  0: 'residual',
};
const CLASS_WEIGHT: Readonly<Record<HiddenStemWeightClass, number>> = {
  primary: 1.0,
  middle: 0.5,
  residual: 0.3,
};
// 月令 dominates the chart's elemental balance; then 日支; then 年/时.
const BRANCH_POS_WEIGHT: Readonly<Record<PillarPosition, number>> = { month: 3, day: 2, year: 1, hour: 1 };
// All four stems are part of the makeup (including the day master).
const STEM_POS_WEIGHT: Readonly<Record<PillarPosition, number>> = { month: 2, day: 2, year: 1.5, hour: 1.5 };

function stemToDomain(s: TyHeavenStem): HeavenlyStem {
  return HEAVENLY_STEMS[s.getIndex()]!;
}

function emptyTally(): Record<FiveElement, number> {
  return { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
}

function pillarOf(ec: EightChar, pos: PillarPosition) {
  return pos === 'year' ? ec.getYear() : pos === 'month' ? ec.getMonth() : pos === 'day' ? ec.getDay() : ec.getHour();
}

function presentPositions(natal: NatalChartSnapshot): PillarPosition[] {
  const present: PillarPosition[] = [];
  if (natal.year_pillar) present.push('year');
  if (natal.month_pillar) present.push('month');
  if (natal.day_pillar) present.push('day');
  if (natal.hour_pillar) present.push('hour');
  return present;
}

export function computeFiveElementDistribution(
  ec: EightChar,
  natal: NatalChartSnapshot,
): FiveElementDistribution {
  const weighted = emptyTally();
  const count = emptyTally();

  for (const pos of presentPositions(natal)) {
    const pillar = pillarOf(ec, pos);
    const stemEl = STEM_TO_ELEMENT[stemToDomain(pillar.getHeavenStem())];
    weighted[stemEl] += STEM_POS_WEIGHT[pos];
    count[stemEl] += 1;

    for (const hidden of pillar.getEarthBranch().getHideHeavenStems()) {
      const el = STEM_TO_ELEMENT[stemToDomain(hidden.getHeavenStem())];
      const cls = WEIGHT_CLASS[hidden.getType()] ?? 'residual';
      weighted[el] += BRANCH_POS_WEIGHT[pos] * CLASS_WEIGHT[cls];
      count[el] += 1;
    }
  }

  const round = (n: number) => Number(n.toFixed(2));
  const weightedTally: FiveElementTally = {
    wood: round(weighted.wood),
    fire: round(weighted.fire),
    earth: round(weighted.earth),
    metal: round(weighted.metal),
    water: round(weighted.water),
  };

  let dominant: FiveElement = 'wood';
  let weakest: FiveElement = 'wood';
  for (const el of FIVE_ELEMENTS) {
    if (weightedTally[el] > weightedTally[dominant]) dominant = el;
    if (weightedTally[el] < weightedTally[weakest]) weakest = el;
  }
  const absent = FIVE_ELEMENTS.filter((el) => count[el] === 0);

  return { weighted: weightedTally, count, dominant, weakest, absent };
}
