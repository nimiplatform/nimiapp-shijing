// SJG-ALGO-08 + SJG-ALGO-09 — classical earthly-branch interaction tables.
//
// Contains the 三合 (san-he, triple harmony), 六合 (liu-he, six harmony),
// 相冲 (xiang-chong, opposition / clash), and 相害 (xiang-hai, harm) sets
// used to derive `relation_features` on `AstrologyFeatureSnapshot` and
// `clash` / `combination` cycle markers. The branches and groupings are
// the standard ones used by mainstream 八字 / 子平 practice and are
// admitted as part of the `bazi_ganzhi_jieqi_dayun_v1` method profile.
//
// All branches are stored as their pinyin form to align with
// `EARTHLY_BRANCHES` in `src/domain/algorithm.ts`.

import type { EarthlyBranch } from '../../domain/algorithm.ts';

export type BranchRelationKind = '六合' | '三合' | '相冲' | '相害';

export const BRANCH_RELATION_KINDS: readonly BranchRelationKind[] = [
  '六合',
  '三合',
  '相冲',
  '相害',
] as const;

// 六合 — six pairs of branches that "combine".
//   zi  + chou  → 土
//   yin + hai   → 木
//   mao + xu    → 火
//   chen + you  → 金
//   si  + shen  → 水
//   wu  + wei   → 火土
export const SIX_COMBINATION_PAIRS: ReadonlyArray<readonly [EarthlyBranch, EarthlyBranch]> = [
  ['zi', 'chou'],
  ['yin', 'hai'],
  ['mao', 'xu'],
  ['chen', 'you'],
  ['si', 'shen'],
  ['wu', 'wei'],
] as const;

// 三合 — four triples that form a "triple harmony" element bureau.
//   shen-zi-chen   → water bureau
//   hai-mao-wei    → wood bureau
//   yin-wu-xu      → fire bureau
//   si-you-chou    → metal bureau
export const THREE_HARMONY_TRIPLES: ReadonlyArray<readonly EarthlyBranch[]> = [
  ['shen', 'zi', 'chen'],
  ['hai', 'mao', 'wei'],
  ['yin', 'wu', 'xu'],
  ['si', 'you', 'chou'],
] as const;

// 相冲 — six opposition pairs (180° on the branch cycle).
//   zi  ↔ wu
//   chou ↔ wei
//   yin ↔ shen
//   mao ↔ you
//   chen ↔ xu
//   si  ↔ hai
export const SIX_CLASH_PAIRS: ReadonlyArray<readonly [EarthlyBranch, EarthlyBranch]> = [
  ['zi', 'wu'],
  ['chou', 'wei'],
  ['yin', 'shen'],
  ['mao', 'you'],
  ['chen', 'xu'],
  ['si', 'hai'],
] as const;

// 相害 — six "harm" pairs (the classical 六害 table).
//   zi  ↔ wei
//   chou ↔ wu
//   yin ↔ si
//   mao ↔ chen
//   shen ↔ hai
//   you ↔ xu
export const SIX_HARM_PAIRS: ReadonlyArray<readonly [EarthlyBranch, EarthlyBranch]> = [
  ['zi', 'wei'],
  ['chou', 'wu'],
  ['yin', 'si'],
  ['mao', 'chen'],
  ['shen', 'hai'],
  ['you', 'xu'],
] as const;

function pairEquals(
  pair: readonly [EarthlyBranch, EarthlyBranch],
  a: EarthlyBranch,
  b: EarthlyBranch,
): boolean {
  return (pair[0] === a && pair[1] === b) || (pair[0] === b && pair[1] === a);
}

export function isSixCombinationPair(a: EarthlyBranch, b: EarthlyBranch): boolean {
  return SIX_COMBINATION_PAIRS.some((pair) => pairEquals(pair, a, b));
}

export function isThreeHarmonyPair(a: EarthlyBranch, b: EarthlyBranch): boolean {
  if (a === b) return false;
  return THREE_HARMONY_TRIPLES.some((triple) => triple.includes(a) && triple.includes(b));
}

export function isClashPair(a: EarthlyBranch, b: EarthlyBranch): boolean {
  return SIX_CLASH_PAIRS.some((pair) => pairEquals(pair, a, b));
}

export function isHarmPair(a: EarthlyBranch, b: EarthlyBranch): boolean {
  return SIX_HARM_PAIRS.some((pair) => pairEquals(pair, a, b));
}

export function classifyBranchPair(
  a: EarthlyBranch,
  b: EarthlyBranch,
): BranchRelationKind | null {
  if (isClashPair(a, b)) return '相冲';
  if (isSixCombinationPair(a, b)) return '六合';
  if (isThreeHarmonyPair(a, b)) return '三合';
  if (isHarmPair(a, b)) return '相害';
  return null;
}
