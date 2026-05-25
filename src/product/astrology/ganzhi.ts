// Wave-10 — sexagenary stem/branch helpers used across the pipeline.

import type { EarthlyBranch, GanzhiPillar, HeavenlyStem } from '../../domain/algorithm.ts';
import { EARTHLY_BRANCHES, HEAVENLY_STEMS } from '../../domain/algorithm.ts';
import { EPHEMERIS_VERSION } from './solar-terms.ts';

export function stemFromIndex(index: number): HeavenlyStem {
  return HEAVENLY_STEMS[((index % 10) + 10) % 10]!;
}

export function branchFromIndex(index: number): EarthlyBranch {
  return EARTHLY_BRANCHES[((index % 12) + 12) % 12]!;
}

export function stemIndex(stem: HeavenlyStem): number {
  return HEAVENLY_STEMS.indexOf(stem);
}

export function branchIndex(branch: EarthlyBranch): number {
  return EARTHLY_BRANCHES.indexOf(branch);
}

export function isStemYang(stem: HeavenlyStem): boolean {
  return stemIndex(stem) % 2 === 0; // jia/bing/wu/geng/ren are yang
}

// Day-pillar reference: 1900-01-31 UTC midnight is jia-zi (stem 0 / branch 0).
// dayIndex(date) returns sexagenary day index where 0 = jia-zi.
const DAY_REFERENCE_UTC_MS = Date.UTC(1900, 0, 31, 0, 0, 0);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function dayPillarFromInstant(utcMs: number): GanzhiPillar {
  const daysSinceReference = Math.floor((utcMs - DAY_REFERENCE_UTC_MS) / MS_PER_DAY);
  return {
    stem: stemFromIndex(daysSinceReference),
    branch: branchFromIndex(daysSinceReference + 0),
    ephemeris_version: EPHEMERIS_VERSION,
  };
}

// Hour-pillar branch: zi covers 23:00-01:00 true solar time, etc.
// branchIndex 0 = zi.
export function hourBranchFromTrueSolarHour(hour: number): EarthlyBranch {
  const normalized = ((hour % 24) + 24) % 24;
  // zi: 23-1 → index 0
  // chou: 1-3 → index 1
  // yin: 3-5 → index 2 ...
  const shifted = normalized < 1 ? normalized + 24 : normalized;
  const idx = Math.floor((shifted - 1 + 24) / 2) % 12;
  return branchFromIndex(idx);
}

// Hour stem derives from day stem via the standard pairing table.
// dayStem index 0 (jia) or 5 (ji) → zi-hour stem index 0 (jia)
// dayStem index 1 (yi) or 6 (geng) → zi-hour stem index 2 (bing)
// dayStem index 2 (bing) or 7 (xin) → zi-hour stem index 4 (wu)
// dayStem index 3 (ding) or 8 (ren) → zi-hour stem index 6 (geng)
// dayStem index 4 (wu) or 9 (gui) → zi-hour stem index 8 (ren)
// Then add hour branch index (0=zi, 1=chou, ...) to get final hour stem.
export function hourStemFromDayStemAndBranch(dayStem: HeavenlyStem, hourBranch: EarthlyBranch): HeavenlyStem {
  const dayIdx = stemIndex(dayStem);
  const zhuStartTable = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8];
  const zhuStart = zhuStartTable[dayIdx]!;
  const hourBranchIdx = branchIndex(hourBranch);
  return stemFromIndex(zhuStart + hourBranchIdx);
}
