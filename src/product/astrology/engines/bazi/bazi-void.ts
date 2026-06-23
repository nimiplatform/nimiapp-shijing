// SJG-ALGO-16 — 空亡 (旬空) for the 命镜 natal projection.
//
// The day pillar belongs to one of the six 旬 (甲子旬, 甲戌旬, …); each 旬 leaves
// two 地支 unpaired with a 天干 — those are its 旬空 branches. A natal pillar is
// 空亡 when its branch is one of the day pillar's two void branches. Day-pillar
// 旬空 is the mainstream 子平 convention. Display-only, tendency-neutral
// (SJG-ALGO-15).

import type { EightChar, EarthBranch as TyEarthBranch } from 'tyme4ts';
import {
  EARTHLY_BRANCHES,
  type EarthlyBranch,
  type GanzhiPillar,
  type NatalChartSnapshot,
  type PillarPosition,
} from '../../../../domain/algorithm.ts';
import type { BaziVoid } from '../../../../domain/mingjing.ts';

function branchToDomain(b: TyEarthBranch): EarthlyBranch {
  return EARTHLY_BRANCHES[b.getIndex()]!;
}

export function computeBaziVoid(ec: EightChar, natal: NatalChartSnapshot): BaziVoid {
  const dayCycle = ec.getDay();
  const voidBranches = dayCycle.getExtraEarthBranches().map(branchToDomain);
  const voidSet = new Set<EarthlyBranch>(voidBranches);

  const pillarsByPosition: ReadonlyArray<readonly [PillarPosition, GanzhiPillar | undefined]> = [
    ['year', natal.year_pillar],
    ['month', natal.month_pillar],
    ['day', natal.day_pillar],
    ['hour', natal.hour_pillar],
  ];
  const voidPositions: PillarPosition[] = [];
  for (const [position, pillar] of pillarsByPosition) {
    if (pillar && voidSet.has(pillar.branch)) voidPositions.push(position);
  }

  return {
    xun: dayCycle.getTen().getName(),
    void_branches: voidBranches,
    void_positions: voidPositions,
  };
}
