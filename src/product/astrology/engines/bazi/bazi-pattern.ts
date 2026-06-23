// SJG-ALGO-16 — 格局 (月令取格) for the 命镜 natal projection.
//
// Classical 子平 月令取格:
//   1. Take the month-branch 本气 (primary hidden stem) ten-god.
//   2. 本气为比劫 → 禄刃格: 建禄格 (比肩/临官) or 阳刃格 (劫财/帝旺).
//   3. Otherwise an 八正格. Prefer the 本气 ten-god; if the 本气 does NOT 透干 but
//      a 中/余气 does, take the transparent (透出) one instead (中气优先于余气).
//   4. disposition (成格/假成/破格) from a deterministic 透干 + 通根 + 月令逢冲
//      heuristic.
//
// Display-only, tendency-neutral (SJG-ALGO-15): 格局 never drives a tendency
// class. See [[mingjing-projection]].

import type { EightChar, HeavenStem as TyHeavenStem, HideHeavenStem } from 'tyme4ts';
import {
  HEAVENLY_STEMS,
  type FiveElement,
  type HeavenlyStem,
  type NatalChartSnapshot,
  type PillarPosition,
} from '../../../../domain/algorithm.ts';
import { STEM_TO_ELEMENT } from '../../element-relations.ts';
import { isClashPair } from '../../branch-relations.ts';
import type { BaziPattern, BaziPatternName } from '../../../../domain/mingjing.ts';

const PATTERN_BY_TEN_GOD: Readonly<Record<string, BaziPatternName>> = {
  正官: '正官格',
  七杀: '七杀格',
  正印: '正印格',
  偏印: '偏印格',
  正财: '正财格',
  偏财: '偏财格',
  食神: '食神格',
  伤官: '伤官格',
};

function stemToDomain(s: TyHeavenStem): HeavenlyStem {
  return HEAVENLY_STEMS[s.getIndex()]!;
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

// Heaven stems visible in 年/月/时 (the day stem is the day master itself and is
// never the 格神 of an 八正格), as stem indices for 透干 testing.
function transparentStemIndexes(ec: EightChar, natal: NatalChartSnapshot): Set<number> {
  const out = new Set<number>();
  for (const pos of ['year', 'month', 'hour'] as const) {
    if (natal[`${pos}_pillar`]) out.add(pillarOf(ec, pos).getHeavenStem().getIndex());
  }
  return out;
}

// Elements rooted as a branch 本气 across the present pillars (用于通根判定).
function rootElements(ec: EightChar, natal: NatalChartSnapshot): Set<FiveElement> {
  const out = new Set<FiveElement>();
  for (const pos of presentPositions(natal)) {
    out.add(STEM_TO_ELEMENT[stemToDomain(pillarOf(ec, pos).getEarthBranch().getHideHeavenStemMain())]);
  }
  return out;
}

function isMonthBranchClashed(natal: NatalChartSnapshot): boolean {
  const month = natal.month_pillar?.branch;
  if (!month) return false;
  const others = [natal.year_pillar?.branch, natal.day_pillar?.branch, natal.hour_pillar?.branch];
  return others.some((b) => b !== undefined && isClashPair(month, b));
}

export function computeBaziPattern(ec: EightChar, natal: NatalChartSnapshot): BaziPattern {
  const dayMaster = ec.getDay().getHeavenStem();
  const monthBranch = ec.getMonth().getEarthBranch();
  const monthBranchName = monthBranch.getName();
  const tenGodName = (stem: TyHeavenStem): string => dayMaster.getTenStar(stem).getName();

  const benQiStem = monthBranch.getHideHeavenStemMain();
  const benQiTenGod = tenGodName(benQiStem);
  const monthClashed = isMonthBranchClashed(natal);
  const clashNote = monthClashed ? '提纲逢冲' : '提纲无损';

  // ── 禄刃格: 月令本气为比劫 ──
  if (benQiTenGod === '比肩' || benQiTenGod === '劫财') {
    const terrain = dayMaster.getTerrain(monthBranch).getName(); // 临官 / 帝旺
    const name: BaziPatternName = benQiTenGod === '比肩' ? '建禄格' : '阳刃格';
    return {
      name,
      ten_god: '',
      source: '禄刃',
      transparent: false,
      rooted: true,
      disposition: monthClashed ? '假成' : '成格',
      basis: [
        `月令${monthBranchName}本气${benQiStem.getName()}(${benQiTenGod})`,
        `日主十二长生:${terrain}`,
        `禄刃以月令为根,不论透干`,
        clashNote,
      ],
    };
  }

  // ── 八正格: 月令取格, 透干优先 ──
  const transparent = transparentStemIndexes(ec, natal);
  const benQiTransparent = transparent.has(benQiStem.getIndex());

  let chosenStem: TyHeavenStem = benQiStem;
  let chosenTenGod = benQiTenGod;
  let source: BaziPattern['source'] = '本气';
  let isTransparent = benQiTransparent;

  if (!benQiTransparent) {
    // 本气不透 → 取透出的中/余气 (中气优先于余气).
    const middleResidual = monthBranch
      .getHideHeavenStems()
      .filter((h: HideHeavenStem) => h.getType() < 2)
      .sort((a: HideHeavenStem, b: HideHeavenStem) => b.getType() - a.getType()); // 中气(1) before 余气(0)
    const surfaced = middleResidual.find((h: HideHeavenStem) => transparent.has(h.getHeavenStem().getIndex()));
    if (surfaced) {
      chosenStem = surfaced.getHeavenStem();
      chosenTenGod = tenGodName(chosenStem);
      source = '透干';
      isTransparent = true;
    }
  }

  const name = PATTERN_BY_TEN_GOD[chosenTenGod];
  if (!name) {
    // The ten-god enum is closed (tyme4ts TenStar); an unmapped value is engine
    // drift, not a user condition — fail closed so it surfaces immediately.
    throw new Error(`computeBaziPattern: unmapped 格 ten-god ${chosenTenGod} for month ${monthBranchName}`);
  }

  const chosenElement = STEM_TO_ELEMENT[stemToDomain(chosenStem)];
  const rooted = rootElements(ec, natal).has(chosenElement);

  let disposition: BaziPattern['disposition'];
  if (isTransparent && rooted && !monthClashed) {
    disposition = '成格';
  } else if ((!isTransparent && !rooted) || (monthClashed && !isTransparent)) {
    disposition = '破格';
  } else {
    disposition = '假成';
  }

  return {
    name,
    ten_god: chosenTenGod,
    source,
    transparent: isTransparent,
    rooted,
    disposition,
    basis: [
      `月令${monthBranchName}本气${benQiStem.getName()}(${benQiTenGod})`,
      source === '透干'
        ? `本气不透,取透出之${chosenStem.getName()}(${chosenTenGod})为格`
        : `以本气${chosenTenGod}为格`,
      isTransparent ? '格神透干' : '格神藏而不透',
      rooted ? '格神通根' : '格神无根',
      clashNote,
    ],
  };
}
