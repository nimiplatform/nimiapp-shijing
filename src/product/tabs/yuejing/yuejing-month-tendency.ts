import type { YueJingCell, TendencyClass } from '../../../domain/mirror-output.ts';
import type { YueJingTendencyCounts } from './yuejing-month-types.ts';

export const YUEJING_MONTH_TENDENCY_CLASSES: readonly TendencyClass[] = [
  'supportive',
  'steady',
  'watch',
  'turning',
  'blocked',
] as const;

export const YUEJING_TENDENCY_SEVERITY: Record<TendencyClass, number> = {
  blocked: 4,
  turning: 3,
  watch: 2,
  supportive: 1,
  steady: 0,
};

export function emptyYueJingTendencyCounts(): YueJingTendencyCounts {
  return {
    supportive: 0,
    steady: 0,
    watch: 0,
    blocked: 0,
    turning: 0,
  };
}

export function countYueJingTendencies(cells: readonly YueJingCell[]): YueJingTendencyCounts {
  const counts = emptyYueJingTendencyCounts();
  for (const cell of cells) counts[cell.tendency_class] += 1;
  return counts;
}

export function primaryYueJingTendencyFromCounts(counts: YueJingTendencyCounts): TendencyClass {
  let best: TendencyClass = 'steady';
  let bestCount = -1;
  for (const tendency of YUEJING_MONTH_TENDENCY_CLASSES) {
    const count = counts[tendency];
    if (
      count > bestCount ||
      (count === bestCount && YUEJING_TENDENCY_SEVERITY[tendency] > YUEJING_TENDENCY_SEVERITY[best])
    ) {
      best = tendency;
      bestCount = count;
    }
  }
  return best;
}
