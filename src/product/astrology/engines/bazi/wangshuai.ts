// SJG-ALGO-15 — 日主旺衰 (day-master strength) quantification, 扶抑 basis.
// Position-agnostic: callers (bazi-features) build the weighted element items
// (stems + 藏干, weighted by position and 本/中/余气); this module sums them into
// a bounded support_ratio and a band. The ratio is ordinal evidence, never a
// luck score.

import type { BaziStrength, FiveElement, StrengthBand } from '../../../../domain/algorithm.ts';
import { elementGenerates } from '../../element-relations.ts';

export interface ScoredElement {
  readonly element: FiveElement;
  readonly weight: number;
  readonly label: string;
}

// 同我 (比劫) or 生我 (印) support the day master; everything else drains it.
function isSupport(el: FiveElement, dayMaster: FiveElement): boolean {
  return el === dayMaster || elementGenerates(el, dayMaster);
}

const BAND_THRESHOLDS: ReadonlyArray<readonly [number, StrengthBand]> = [
  [0.60, '极强'],
  [0.515, '偏强'],
  [0.45, '中和'],
  [0.35, '偏弱'],
];

function bandFromRatio(ratio: number): StrengthBand {
  for (const [threshold, band] of BAND_THRESHOLDS) {
    if (ratio >= threshold) return band;
  }
  return '极弱';
}

export function computeStrength(dayMaster: FiveElement, items: readonly ScoredElement[]): BaziStrength {
  let support = 0;
  let drain = 0;
  const supportLabels: string[] = [];
  const drainLabels: string[] = [];
  for (const item of items) {
    if (isSupport(item.element, dayMaster)) {
      support += item.weight;
      supportLabels.push(item.label);
    } else {
      drain += item.weight;
      drainLabels.push(item.label);
    }
  }
  const total = support + drain;
  const ratio = total > 0 ? support / total : 0.5;
  return {
    band: bandFromRatio(ratio),
    support_ratio: Number(ratio.toFixed(3)),
    basis: [
      `support=${support.toFixed(1)} drain=${drain.toFixed(1)}`,
      `助身: ${supportLabels.join(' ') || '—'}`,
      `耗身: ${drainLabels.join(' ') || '—'}`,
    ],
  };
}
