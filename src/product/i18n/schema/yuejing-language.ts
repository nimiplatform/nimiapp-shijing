import type { TendencyClass } from '../../../domain/mirror-output.ts';

export interface TendencyLanguage {
  readonly tagline: string;
  readonly body: string;
  readonly mainline: string;
  readonly best_for: readonly string[];
  readonly avoid_tags: readonly string[];
  readonly suitable: string;
  readonly unsuitable: string;
  readonly review: string;
  readonly avoid: readonly string[];
}

export interface PhaseArcRole {
  readonly name: string;
  readonly theme: string;
  readonly suitable: string;
  readonly unsuitable: string;
}

export interface ConcernLanguage {
  readonly supportive: string;
  readonly steady: string;
  readonly watch: string;
  readonly turning: string;
  readonly blocked: string;
}

export interface ConcernAction {
  readonly axis: string;
  readonly summary: string;
  readonly actions: readonly {
    readonly source:
      | 'primary'
      | 'supportive'
      | 'caution'
      | 'turning'
      | 'after_opening'
      | 'first_supportive'
      | 'middle_watch'
      | 'middle_turning';
    readonly label: string;
  }[];
  readonly reminders: readonly string[];
}

export interface YueJingMonthLanguageCopy {
  readonly tendency: Record<TendencyClass, TendencyLanguage>;
  readonly phases: readonly PhaseArcRole[];
  readonly brief: Record<'push' | 'slow' | 'turn', string>;
  readonly genericConcern: ConcernLanguage;
  readonly concernByLabel: Record<string, ConcernLanguage>;
  readonly genericAction: ConcernAction;
  readonly actionByLabel: Record<string, ConcernAction>;
  readonly date: (month: number, day: number) => string;
  readonly labels: {
    readonly phase: string; readonly phaseNumber: (n: number) => string; readonly currentWindow: string; readonly mainline: string;
    readonly push: string; readonly watch: string; readonly turn: string; readonly pushWindow: string; readonly watchWindow: string; readonly turnWindow: string;
    readonly pushCaution: string; readonly watchCaution: string; readonly turnCaution: string; readonly missingConcern: string;
    readonly blockedRange: (text: string, range: string) => string;
    readonly rangeList: (ranges: readonly string[], hasMore: boolean) => string;
    readonly basis: (range: string, days: number, tags: number, cells: number) => readonly string[];
  };
}
