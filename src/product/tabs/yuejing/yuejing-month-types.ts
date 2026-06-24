import type { ConcernTag } from '../../../domain/concern-tag.ts';
import type { TendencyClass } from '../../../domain/mirror-output.ts';

export type YueJingTendencyCounts = Record<TendencyClass, number>;

export interface YueJingMonthAdvice {
  readonly window: string;
  readonly suitable: string;
  readonly unsuitable: string;
}

// One local date's dominant tendency, used to paint the rhythm strip in
// the monthly mainline. `tendency` is null for dates without generated cells.
export interface YueJingDayTendency {
  readonly date: string;
  readonly tendency: TendencyClass | null;
}

export interface YueJingMonthPhase extends YueJingMonthAdvice {
  readonly title: string;
  readonly name: string;
  readonly theme: string;
  readonly tendency: TendencyClass;
}

export interface YueJingMonthKeyWindow extends YueJingMonthAdvice {
  readonly title: string;
  readonly brief: string;
  readonly tendency?: TendencyClass;
}

export interface YueJingMonthConcernInterpretation {
  readonly tag: ConcernTag;
  readonly tag_label: string;
  readonly has_cells: boolean;
  readonly primary: TendencyClass;
  readonly generated_days: number;
  readonly axis: string;
  readonly summary: string;
  readonly action: YueJingMonthAdvice;
  readonly key_windows: readonly YueJingMonthKeyWindow[];
  readonly checklist: readonly string[];
  readonly counts: YueJingTendencyCounts;
  readonly detail_examples: readonly string[];
}

export interface YueJingMonthMainline {
  readonly title: string;
  readonly window: string;
  readonly tagline: string;
  readonly body: string;
}

export interface YueJingMonthInterpretation {
  readonly range_label: string;
  readonly start_label: string;
  readonly end_label: string;
  readonly generated_day_count: number;
  readonly active_tag_count: number;
  readonly primary: TendencyClass;
  readonly counts: YueJingTendencyCounts;
  readonly day_series: readonly YueJingDayTendency[];
  readonly day_counts: YueJingTendencyCounts;
  readonly mainline: YueJingMonthMainline;
  readonly phases: readonly YueJingMonthPhase[];
  readonly key_windows: readonly YueJingMonthKeyWindow[];
  readonly context_windows: readonly YueJingMonthKeyWindow[];
  readonly closing_avoid: readonly string[];
  readonly review_prompts: readonly string[];
  readonly concern_interpretations: readonly YueJingMonthConcernInterpretation[];
  readonly basis_items: readonly string[];
}
