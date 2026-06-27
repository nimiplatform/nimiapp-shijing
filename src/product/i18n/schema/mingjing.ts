// MingJing product-copy schema.

import type {
  FiveElement,
  LabelMap,
  NatalReadinessReason,
  PeriodFavor,
} from './shared.ts';

export interface MingJingCopy {
  readonly title: string;
  readonly eyebrow: string;
  readonly subtitle: string;
  readonly loadingStatus: string;
  readonly failureTitle: string;
  readonly hero: {
    readonly eyebrow: string;
    readonly fixedNote: string;
    readonly favorableTitle: string;
    readonly adverseTitle: string;
    readonly currentStage: string;
    readonly dayunWord: string;
    readonly notStarted: string;
    readonly seeStages: string;
  };
  readonly readiness: {
    readonly title: string;
    readonly button: string;
    readonly fallback: string;
    readonly reasons: Record<NatalReadinessReason, string>;
  };
  readonly paipan: {
    readonly title: string;
    readonly intro: string;
    readonly explanation: string;
    readonly sectionTitle: string;
    readonly sectionIntro: string;
    readonly roles: { readonly year: string; readonly month: string; readonly day: string; readonly hour: string };
    readonly dayBadge: string;
    readonly expand: string;
    readonly collapse: string;
    readonly detailTitle: string;
    readonly pillarLabels: {
      readonly year: string;
      readonly month: string;
      readonly day: string;
      readonly hour: string;
    };
    readonly rows: {
      readonly stem: string;
      readonly branch: string;
      readonly hidden: string;
      readonly tenGod: string;
      readonly nayin: string;
      readonly terrain: string;
      readonly voidRow: string;
    };
    readonly dayMaster: string;
    readonly self: string;
    readonly voidMark: string;
    readonly voidEmpty: string;
  };
  readonly fiveElements: {
    readonly title: string;
    readonly explanation: string;
    readonly labels: LabelMap<FiveElement>;
    readonly dominant: string;
    readonly weakest: string;
    readonly absentLabel: string;
    readonly absentNone: string;
  };
  readonly geju: {
    readonly title: string;
    readonly explanation: string;
    readonly strengthLabel: string;
    readonly supportRatioLabel: string;
    readonly patternLabel: string;
    readonly sourceLabel: string;
    readonly transparent: string;
    readonly notTransparent: string;
    readonly rooted: string;
    readonly notRooted: string;
    readonly yong: string;
    readonly xi: string;
    readonly ji: string;
    readonly tiaohou: string;
    readonly relationsLabel: string;
    readonly relationsEmpty: string;
    readonly basisLabel: string;
  };
  readonly dayun: {
    readonly title: string;
    readonly explanation: string;
    readonly sectionTitle: string;
    readonly sectionIntro: string;
    readonly introSegments: (input: {
      readonly currentNatureLabel: string | null;
      readonly highlightAge: number | null;
    }) => readonly { readonly text: string; readonly tone?: 'current' | 'highlight' }[];
    readonly highlightLabel: string;
    readonly directionLabels: { readonly forward: string; readonly reverse: string };
    readonly startAge: (age: string) => string;
    readonly current: string;
    readonly currentPrefix: string;
    readonly inflection: string;
    readonly distantTitle: string;
    readonly distantDescription: string;
    readonly phaseTitle: (index: number, current: boolean) => string;
    readonly periodExplanation: (input: {
      readonly tenGod: string;
      readonly nature: string;
      readonly favor: PeriodFavor;
      readonly terrain: string;
      readonly current: boolean;
      readonly nextStartAge?: number;
      readonly relationText?: string;
    }) => string;
    readonly terrainLabel: (terrain: string) => string;
    readonly cols: {
      readonly age: string;
      readonly years: string;
      readonly pillar: string;
      readonly tenGod: string;
      readonly terrain: string;
      readonly nature: string;
    };
    readonly ageRange: (start: number, end: number) => string;
    readonly yearRange: (start: number, end: number) => string;
  };
  readonly liunian: {
    readonly title: string;
    readonly intro: string;
    readonly explanation: string;
    readonly sectionTitle: string;
    readonly sectionIntro: string;
    readonly detailToggle: string;
    readonly horizon: (start: number, end: number) => string;
    readonly salienceLabels: { readonly high: string; readonly medium: string };
    readonly favorLabels: LabelMap<PeriodFavor>;
    readonly windowRange: (start: number, end: number) => string;
    readonly singleYear: (year: number) => string;
    readonly yearsLabel: string;
    readonly evidenceLabel: string;
    readonly dayunLabel: string;
    readonly relationMore: (count: number) => string;
    readonly basisMore: (count: number) => string;
    readonly empty: string;
  };
  readonly reading: {
    readonly eyebrow: string;
    readonly coreTitle: string;
    readonly explanation: string;
    readonly coreLabels: {
      readonly personality: string;
      readonly strengths: string;
      readonly long_term_themes: string;
      readonly relationship_pattern: string;
      readonly career_inclination: string;
    };
    readonly strategiesTitle: string;
    readonly strategyTheme: string;
    readonly strategyStrategy: string;
    readonly generate: string;
    readonly regenerate: string;
    readonly generating: string;
    readonly empty: string;
    readonly stale: string;
    readonly failureTitle: string;
  };
  readonly ziweiRoute: {
    readonly chartAria: string;
    readonly eyebrow: string;
    readonly chartTitle: string;
    readonly soulPalace: string;
    readonly bodyPalace: string;
    readonly fiveElementsClass: string;
    readonly soulBodyStar: string;
    readonly palaces: string;
    readonly anchorPalace: string;
    readonly astrolabeAria: string;
  };
  readonly ziweiReading: {
    readonly aria: string;
    readonly eyebrow: string;
    readonly title: string;
    readonly profileLabels: {
      readonly life_pattern: string;
      readonly strengths: string;
      readonly long_term_theme: string;
      readonly relationship_pattern: string;
      readonly career_inclination: string;
    };
  };
  readonly qizhengRoute: {
    readonly chartAria: string;
    readonly eyebrow: string;
    readonly chartTitle: string;
    readonly ascendant: string;
    readonly dayNight: string;
    readonly houseModel: string;
    readonly mansionModel: string;
    readonly siyuModel: string;
    readonly houseModelValues: {
      readonly equalHouseFromAscendantV1: string;
    };
    readonly mansionModelValues: {
      readonly equalMansionV1: string;
    };
    readonly siyuModelValues: {
      readonly nodeAxisVirtualPointAndApogee: string;
    };
    readonly bodiesTitle: string;
    readonly housesTitle: string;
    readonly emptyHouse: string;
    readonly bodyColumns: {
      readonly body: string;
      readonly house: string;
      readonly mansion: string;
      readonly position: string;
      readonly longitude: string;
    };
    readonly dayNightLabels: {
      readonly day: string;
      readonly night: string;
    };
  };
  readonly qizhengReading: {
    readonly aria: string;
    readonly eyebrow: string;
    readonly title: string;
    readonly starGuidanceTitle: string;
    readonly profileLabels: {
      readonly life_pattern: string;
      readonly strengths: string;
      readonly long_term_theme: string;
      readonly relationship_pattern: string;
      readonly career_inclination: string;
    };
  };
  readonly qizhengExplore: {
    readonly methodChip: string;
    readonly heroEyebrow: string;
    readonly favorableTitle: string;
    readonly watchTitle: string;
    readonly basisTitle: string;
    readonly viewIntro: string;
    readonly viewPlain: string;
    readonly viewData: string;
    readonly viewToggleAria: string;
    readonly explainerTitle: string;
    readonly explainerBody: string;
    readonly qizhengCardTitle: string;
    readonly qizhengCardBody: string;
    readonly siyuCardTitle: string;
    readonly siyuCardBody: string;
    readonly explainerHint: string;
    readonly chartTitle: string;
    readonly chartHint: string;
    readonly wheelCenterEyebrow: string;
    readonly deepTitle: string;
    readonly starsTitle: string;
    readonly starsHint: string;
    readonly starGoPalace: string;
    readonly patternsTitle: string;
    readonly patternsHint: string;
    readonly basisSectionTitle: string;
    readonly basisSectionHint: string;
    readonly ctaEyebrow: string;
    readonly ctaTitle: string;
    readonly ctaBody: string;
    readonly ctaButton: string;
    readonly readingTitleSuffix: string;
    readonly emptyDetail: string;
    readonly terms: {
      readonly mingZhu: string;
      readonly qizheng: string;
      readonly siyu: string;
      readonly emptyHouse: string;
    };
  };
  readonly events: {
    readonly title: string;
    readonly intro: string;
    readonly explanation: string;
    readonly dateLabel: string;
    readonly datePlaceholder: string;
    readonly bodyLabel: string;
    readonly bodyPlaceholder: string;
    readonly add: string;
    readonly invalidHint: string;
    readonly empty: string;
    readonly delete: string;
    readonly dayunColumn: string;
    readonly liunianColumn: string;
    readonly preGenHint: string;
  };
  readonly rectify: {
    readonly title: string;
    readonly intro: string;
    readonly howItWorks: string;
    readonly needMoreEvents: string;
    readonly unsupportedCalendar: string;
    readonly sexRequired: string;
    readonly confidenceLabel: string;
    readonly confidenceValues: { readonly high: string; readonly medium: string; readonly low: string };
    readonly lowConfidenceCaveat: string;
    readonly recommended: string;
    readonly fitLabel: string;
    readonly startAge: (age: string) => string;
    readonly hourPillarLabel: string;
    readonly alignedLabel: string;
    readonly adopt: string;
    readonly entryLive: string;
    readonly entryBlocked: string;
    readonly earlyZi: string;
    readonly lateZi: string;
    readonly shichenSuffix: string;
    readonly close: string;
  };
}
