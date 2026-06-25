// ShiJing consultation product-copy schema.

export interface ShiJingConsultationCopy {
  readonly composerPlaceholder: string;
  readonly suggestedQuestions: readonly string[];
  readonly unrecordedQuestion: string;
  readonly sessionGroups: {
    readonly today: string;
    readonly week: string;
    readonly earlier: string;
  };
  readonly sessionDateLabel: (month: number, day: number) => string;
  readonly sourceMissing: string;
  readonly title: string;
  readonly railAria: string;
  readonly newQuestion: string;
  readonly newQuestionAria: string;
  readonly searchPlaceholder: string;
  readonly searchAria: string;
  readonly emptyHistory: string;
  readonly emptySearch: string;
  readonly emptyHistoryDescription: string;
  readonly composerAria: string;
  readonly composerTitle: string;
  readonly seedAria: string;
  readonly seedLabel: string;
  readonly seedKindPlan: string;
  readonly seedKindMemory: string;
  readonly seedRemoveAria: string;
  readonly questionAria: string;
  readonly generateTitle: string;
  readonly generating: string;
  readonly generate: string;
  readonly sendTitle: string;
  readonly sending: string;
  readonly send: string;
  readonly thinking: string;
  readonly suggestLabel: string;
  readonly resultAria: string;
  readonly archive: {
    readonly aria: string;
    readonly addPrefix: string;
    readonly removeAria: (label: string) => string;
    readonly filterButton: string;
    readonly filterButtonActive: (count: number) => string;
    readonly filterMenuAria: string;
    readonly filterAll: string;
    readonly filterEmpty: string;
    readonly recallAria: string;
    readonly recallTitle: string;
    readonly recallOpenAria: (question: string) => string;
  };
  readonly context: {
    readonly aria: string;
    readonly title: string;
    readonly description: string;
    readonly empty: string;
    readonly manage: string;
    readonly editorSubtitle: string;
  };
  readonly citedReadings: (count: number) => string;
}
