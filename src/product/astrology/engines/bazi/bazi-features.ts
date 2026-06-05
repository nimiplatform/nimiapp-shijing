// SJG-ALGO-15 — BaZi interpretive feature assembler. Extracts per-pillar 十神 /
// 藏干 / 纳音 / 十二长生 from the tyme4ts EightChar, scores 日主旺衰, derives
// 用神/喜忌, and classifies natal 合冲刑害破 — producing BaziInterpretation.

import type { EightChar, EarthBranch as TyEarthBranch, HeavenStem as TyHeavenStem } from 'tyme4ts';
import {
  EARTHLY_BRANCHES,
  HEAVENLY_STEMS,
  type BaziBranchRelation,
  type BaziBranchRelationKind,
  type BaziInterpretation,
  type BaziPillarFeatures,
  type EarthlyBranch,
  type HeavenlyStem,
  type HiddenStem,
  type HiddenStemWeightClass,
  type NatalChartSnapshot,
  type PillarPosition,
} from '../../../../domain/algorithm.ts';
import { STEM_TO_ELEMENT } from '../../element-relations.ts';
import {
  isClashPair,
  isHarmPair,
  isPoPair,
  isSixCombinationPair,
  isThreeHarmonyPair,
  isXingPair,
} from '../../branch-relations.ts';
import { computeStrength, type ScoredElement } from './wangshuai.ts';
import { computeYongShen } from './yongshen.ts';

function stemToDomain(s: TyHeavenStem): HeavenlyStem {
  return HEAVENLY_STEMS[s.getIndex()]!;
}
function branchToDomain(b: TyEarthBranch): EarthlyBranch {
  return EARTHLY_BRANCHES[b.getIndex()]!;
}

const WEIGHT_CLASS: Readonly<Record<number, HiddenStemWeightClass>> = { 2: 'primary', 1: 'middle', 0: 'residual' };
const CLASS_WEIGHT: Readonly<Record<HiddenStemWeightClass, number>> = { primary: 1.0, middle: 0.5, residual: 0.3 };
// 月令 dominates strength; then 日支; then 年/时.
const BRANCH_POS_WEIGHT: Readonly<Record<PillarPosition, number>> = { month: 3, day: 2, year: 1, hour: 1 };
// The day stem is the day master reference and is not scored as support/drain.
const STEM_POS_WEIGHT: Readonly<Record<PillarPosition, number>> = { month: 2, year: 1.5, hour: 1.5, day: 0 };

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

function pillarFeatures(ec: EightChar, pos: PillarPosition, dayMaster: TyHeavenStem): BaziPillarFeatures {
  const p = pillarOf(ec, pos);
  const branch = p.getEarthBranch();
  const hidden: HiddenStem[] = branch.getHideHeavenStems().map((h) => ({
    stem: stemToDomain(h.getHeavenStem()),
    weight_class: WEIGHT_CLASS[h.getType()] ?? 'residual',
  }));
  return {
    position: pos,
    ten_god: dayMaster.getTenStar(p.getHeavenStem()).getName(),
    hidden_stems: hidden,
    nayin: p.getSound().getName(),
    terrain: dayMaster.getTerrain(branch).getName(),
  };
}

function scoredItems(ec: EightChar, positions: readonly PillarPosition[]): ScoredElement[] {
  const items: ScoredElement[] = [];
  for (const pos of positions) {
    const p = pillarOf(ec, pos);
    const stemWeight = STEM_POS_WEIGHT[pos];
    if (stemWeight > 0) {
      items.push({ element: STEM_TO_ELEMENT[stemToDomain(p.getHeavenStem())], weight: stemWeight, label: `${pos}干` });
    }
    const branchWeight = BRANCH_POS_WEIGHT[pos];
    for (const h of p.getEarthBranch().getHideHeavenStems()) {
      const cls = WEIGHT_CLASS[h.getType()] ?? 'residual';
      items.push({
        element: STEM_TO_ELEMENT[stemToDomain(h.getHeavenStem())],
        weight: branchWeight * CLASS_WEIGHT[cls],
        label: `${pos}支${h.getHeavenStem().getName()}`,
      });
    }
  }
  return items;
}

function classifyNatalPair(a: EarthlyBranch, b: EarthlyBranch): BaziBranchRelationKind | null {
  if (isClashPair(a, b)) return '相冲';
  if (isXingPair(a, b)) return '相刑';
  if (isHarmPair(a, b)) return '相害';
  if (isPoPair(a, b)) return '相破';
  if (isSixCombinationPair(a, b)) return '六合';
  if (isThreeHarmonyPair(a, b)) return '三合';
  return null;
}

function natalBranchRelations(ec: EightChar, positions: readonly PillarPosition[]): BaziBranchRelation[] {
  const branches = positions.map((pos) => ({ pos, branch: branchToDomain(pillarOf(ec, pos).getEarthBranch()) }));
  const relations: BaziBranchRelation[] = [];
  for (let i = 0; i < branches.length; i += 1) {
    for (let j = i + 1; j < branches.length; j += 1) {
      const bi = branches[i]!;
      const bj = branches[j]!;
      const kind = classifyNatalPair(bi.branch, bj.branch);
      if (kind) relations.push({ kind, positions: [bi.pos, bj.pos] });
    }
  }
  return relations;
}

// Returns undefined when the chart lacks a day master or month令 (rough precision):
// 十神/旺衰/用神 are not defined without them.
export function buildBaziInterpretation(ec: EightChar, natal: NatalChartSnapshot): BaziInterpretation | undefined {
  if (!natal.day_pillar || !natal.month_pillar) return undefined;
  const dayMaster = ec.getDay().getHeavenStem();
  const dayMasterEl = STEM_TO_ELEMENT[stemToDomain(dayMaster)];
  const positions = presentPositions(natal);
  const strength = computeStrength(dayMasterEl, scoredItems(ec, positions));
  const yong_shen = computeYongShen(strength, dayMasterEl, branchToDomain(ec.getMonth().getEarthBranch()));
  return {
    pillars: positions.map((pos) => pillarFeatures(ec, pos, dayMaster)),
    strength,
    yong_shen,
    natal_branch_relations: natalBranchRelations(ec, positions),
  };
}
