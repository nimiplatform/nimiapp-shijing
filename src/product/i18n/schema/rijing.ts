// RiJing product-copy schema.

import type {
  FiveElement,
  LabelMap,
  NatalReadinessReason,
  RiJingEmptyStateCopyKind,
  RiJingHeroEmptyCopy,
  RiJingReadinessCopy,
  ShijingStageLabel,
} from './shared.ts';

export interface RiJingCopy {
  readonly stageHeadlines: LabelMap<string>;
  readonly stageHeadlineFallback: string;
  readonly headlineFallback: string;
  readonly leaningFallback: string;
  readonly eyebrow: string;
  readonly defaultReminder: string;
  readonly defaultConfidenceNote: string;
  readonly confidenceLabels: LabelMap<'high' | 'medium' | 'low'>;
  readonly emptyHero: Record<RiJingEmptyStateCopyKind, RiJingHeroEmptyCopy>;
  readonly emptyActions: Record<Exclude<RiJingEmptyStateCopyKind, 'persistence_pending'>, string>;
  readonly failureActions: {
    readonly runtimeAi: string;
  };
  readonly refreshAria: {
    readonly loading: string;
    readonly persistenceFailed: string;
    readonly persistencePending: string;
    readonly profileIncomplete: string;
    readonly missingFocus: string;
    readonly regenerate: string;
    readonly refresh: string;
  };
  readonly emptyTagsTitle: string;
  readonly emptyTagsStatus: string;
  readonly emptyTagsAction: string;
  readonly loadingStatus: string;
  readonly date: {
    readonly locale: string;
    readonly localTime: string;
    readonly timeZoneLabels: LabelMap<string>;
    readonly timeZoneWithOffset: (tail: string, offset: string) => string;
  };
  readonly hero: {
    readonly focusAria: string;
    readonly focusLabel: string;
    readonly focusEmpty: string;
    readonly manageFocus: string;
    readonly leaningsAria: string;
    readonly confidenceLabel: string;
    readonly themeLabel: string;
    readonly perspectivesLabel: string;
    readonly eventInsightLabel: string;
    readonly eventActionLead: string;
    readonly eventFallbackBody: string;
    readonly eventFallbackGuidance: string;
    readonly closingLabel: string;
    readonly closingWish: string;
  };
  readonly heroMemories: {
    readonly ariaLabel: string;
    readonly title: string;
    readonly intro: string;
    readonly editBodyAria: string;
    readonly actionsAria: string;
    readonly editAction: string;
    readonly deleteAction: string;
    readonly emptyBody: string;
    readonly deleteFailed: string;
    readonly deleteTitle: string;
    readonly deleteMessage: (body: string) => string;
  };
  readonly eventInput: {
    readonly ariaLabel: string;
    readonly title: string;
    readonly intro: string;
    readonly placeholder: string;
    readonly emptyHint: string;
    readonly invalidHint: (reason: string) => string;
    readonly successHint: string;
    readonly submit: string;
    readonly refsAria: string;
    readonly refsBadge: string;
  };
  readonly readiness: {
    readonly ariaLabel: string;
    readonly button: string;
    readonly fallback: RiJingReadinessCopy;
    readonly reasons: Record<NatalReadinessReason, RiJingReadinessCopy>;
  };
  readonly actions: {
    readonly ariaLabel: string;
    readonly title: string;
    readonly slots: Record<'do' | 'say' | 'avoid', string>;
    readonly sourceLead: string;
  };
  readonly projections: {
    readonly ariaLabel: string;
    readonly title: string;
    readonly allLabel: string;
    readonly filterAria: string;
    readonly manage: string;
    readonly editorSubtitle: string;
    readonly actionsLabel: string;
    readonly expandAria: (name: string) => string;
  };
  readonly evidence: {
    readonly title: string;
    readonly emptyChipGroup: string;
    readonly emptyChipValue: string;
    readonly ariaLabel: string;
    readonly toggleAria: string;
    readonly strengthLabel: string;
    readonly yongLabel: string;
    readonly pillarsLabel: string;
    readonly completenessLabel: string;
    readonly completenessFull: string;
    readonly completenessKnown: (filled: number, total: number) => string;
    readonly stageDriverLabel: string;
    readonly completeProfile: string;
    readonly elementNatures: Record<FiveElement, string>;
    readonly pillarPositions: Record<'year' | 'month' | 'day' | 'hour', string>;
  };
  readonly overview: {
    readonly meterAxisStart: string;
    readonly meterAxisEnd: string;
    readonly meterAria: string;
    readonly meterStrengthLabel: string;
    readonly meterStageConnector: string;
    readonly meterStageSuffix: string;
    readonly stageGuidance: Record<ShijingStageLabel, string>;
    readonly confidencePrefix: string;
    readonly expandLabel: string;
    readonly collapseLabel: string;
  };
}
