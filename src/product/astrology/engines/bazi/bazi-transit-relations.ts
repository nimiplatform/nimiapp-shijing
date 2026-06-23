// SJG-ALGO-16 — classify a transit branch (大运支 / 流年支) against the natal
// branches, for the 命镜 projection's 大运结构 and 流年关键窗口.
//
// Reuses the classical branch-interaction tables (branch-relations.ts). The
// resulting BaziBranchRelation.positions lists the NATAL pillar position(s) the
// transit branch interacts with (a single-position convention, distinct from the
// two-natal-position convention of natal 合冲刑害破).

import type {
  BaziBranchRelation,
  BaziBranchRelationKind,
  EarthlyBranch,
  NatalChartSnapshot,
  PillarPosition,
} from '../../../../domain/algorithm.ts';
import {
  isClashPair,
  isHarmPair,
  isPoPair,
  isSixCombinationPair,
  isThreeHarmonyPair,
  isXingPair,
} from '../../branch-relations.ts';

// Same precedence as natal 合冲刑害破 classification (bazi-features): the most
// structurally significant relation wins when a pair satisfies several.
export function classifyTransitNatalPair(
  a: EarthlyBranch,
  b: EarthlyBranch,
): BaziBranchRelationKind | null {
  if (isClashPair(a, b)) return '相冲';
  if (isXingPair(a, b)) return '相刑';
  if (isHarmPair(a, b)) return '相害';
  if (isPoPair(a, b)) return '相破';
  if (isSixCombinationPair(a, b)) return '六合';
  if (isThreeHarmonyPair(a, b)) return '三合';
  return null;
}

const ALL_POSITIONS: readonly PillarPosition[] = ['year', 'month', 'day', 'hour'];

export function branchRelationsAgainstNatal(
  branch: EarthlyBranch,
  natal: NatalChartSnapshot,
  positions: readonly PillarPosition[] = ALL_POSITIONS,
): BaziBranchRelation[] {
  const out: BaziBranchRelation[] = [];
  for (const pos of positions) {
    const natalBranch = natal[`${pos}_pillar`]?.branch;
    if (!natalBranch) continue;
    const kind = classifyTransitNatalPair(branch, natalBranch);
    if (kind) out.push({ kind, positions: [pos] });
  }
  return out;
}
