// Cross-surface product-copy schema.

import type {
  BirthPrecision,
  CalculationSex,
  CalendarSystem,
  ConsentState,
  ConversationRole,
  LabelMap,
  MirrorKind,
  NianJingInflectionKind,
  ReadingGenerationFailure,
  ResponseLanguage,
  ResponseLength,
  ResponseTone,
  ShijingSettingsPageId,
  ShijingTabId,
  TendencyClass,
  UiLanguage,
} from './shared.ts';

export interface BaseProductCopy {
readonly brandName: string;
readonly brandSub: string;
readonly mirrorKindLabels: LabelMap<MirrorKind>;
// Primary-tab labels keyed by tab id. Distinct from mirrorKindLabels: 命镜 is a
// primary tab (SJG-IA-08) but not a MirrorKind in the natal-projection layer.
readonly tabLabels: LabelMap<ShijingTabId>;
readonly tendencyClassLabels: LabelMap<TendencyClass>;
readonly nianjingInflectionKindLabels: LabelMap<NianJingInflectionKind>;
readonly calendarSystemLabels: LabelMap<CalendarSystem>;
readonly birthPrecisionLabels: LabelMap<BirthPrecision>;
readonly calculationSexLabels: LabelMap<CalculationSex>;
readonly consentStateLabels: LabelMap<ConsentState>;
readonly responseToneLabels: LabelMap<ResponseTone>;
readonly responseLengthLabels: LabelMap<ResponseLength>;
readonly responseLanguageLabels: LabelMap<ResponseLanguage>;
readonly conversationRoleLabels: LabelMap<ConversationRole>;
readonly concernTagStatusLabels: {
  readonly active: string;
  readonly archived: string;
};
readonly recordSourceLabels: {
  readonly manual: string;
  readonly rijing: string;
  readonly yuejing: string;
  readonly nianjing: string;
  readonly shijing: string;
};
readonly memoryUseLabels: {
  readonly record_only: string;
  readonly eligible_for_retrieval: string;
};
readonly settingsSurfaceLabels: {
  readonly self: string;
  readonly people: string;
  readonly concern_tags: string;
  readonly memory_and_plans: string;
  readonly response_preferences: string;
  readonly privacy_local_data: string;
  readonly diagnostics: string;
};
readonly settingsPageLabels: LabelMap<ShijingSettingsPageId>;
readonly readinessBlockerLabels: {
  readonly missing_self_natal_inputs: string;
  readonly invalid_self_natal_inputs: string;
  readonly unresolved_person_mention: string;
  readonly incomplete_related_person_natal_inputs: string;
  readonly stale_reading_inputs: string;
  readonly runtime_ai_failure: string;
  readonly persistence_failure: string;
  readonly hash_mismatch: string;
};
readonly uiLanguageLabels: LabelMap<UiLanguage>;
readonly common: {
  readonly add: string;
  readonly cancel: string;
  readonly close: string;
  readonly delete: string;
  readonly edit: string;
  readonly save: string;
  readonly saving: string;
  readonly optional: string;
  readonly automatic: string;
  readonly saved: string;
  readonly loading: string;
};
readonly shell: {
  readonly navAriaLabel: string;
  readonly accountMenu: string;
  readonly settingsMenu: string;
  readonly languageSwitch: string;
  readonly snapshotInvalid: (code: string) => string;
  readonly persistenceFailed: (detail: string) => string;
  readonly loadingMirror: string;
  readonly loadingSettings: string;
};
readonly settings: {
  readonly back: string;
  readonly subnavAriaLabel: string;
  readonly profileIntro: string;
  readonly concernsIntro: string;
  readonly memoryIntro: string;
  readonly settingsIntro: string;
  readonly localOnlyTag: string;
};
readonly uiLanguage: {
  readonly title: string;
  readonly description: string;
  readonly saved: (languageLabel: string) => string;
  readonly saveFailed: (code: string) => string;
};
readonly responsePreferences: {
  readonly title: string;
  readonly description: string;
  readonly tone: string;
  readonly length: string;
  readonly aiLanguage: string;
  readonly extraInstructions: string;
  readonly extraPlaceholder: string;
  readonly saveButton: string;
  readonly saveFailed: (code: string) => string;
  readonly savedAt: (savedAt: string) => string;
};
readonly self: {
  readonly title: string;
  readonly description: string;
  readonly metaLabel: string;
  readonly locationLabel: string;
  readonly complete: string;
  readonly editDialog: string;
  readonly notes: string;
  readonly notesPlaceholder: string;
  readonly missing: string;
  readonly maskedValue: string;
  readonly revealSensitive: string;
  readonly revealSensitiveHint: string;
  readonly revealSensitivePending: string;
  readonly revealSensitiveFailed: (reason: string) => string;
  readonly lockSensitive: string;
  readonly coreLabels: {
    readonly sex: string;
    readonly birthDate: string;
    readonly birthTime: string;
  };
  readonly reminders: {
    readonly missingBirthDate: string;
    readonly missingBirthTime: string;
    readonly missingPlace: string;
    readonly missingSex: string;
  };
  readonly tags: readonly string[];
  readonly saveIncomplete: (kind: string) => string;
  readonly saveFailed: (detail: string) => string;
  readonly validationFailed: (code: string) => string;
};
readonly people: {
  readonly title: string;
  readonly description: string;
  readonly empty: string;
  readonly addDialog: string;
  readonly editDialog: string;
  readonly displayName: string;
  readonly displayNamePlaceholder: string;
  readonly relation: string;
  readonly relationPlaceholder: string;
  readonly consentSource: string;
  readonly notes: string;
  readonly notesPlaceholder: string;
  readonly addPerson: string;
  readonly editPersonAria: (name: string) => string;
  readonly deletePersonAria: (name: string) => string;
  readonly deleteBlocked: string;
  readonly deleteTitle: string;
  readonly deleteMessage: (name: string) => string;
};
readonly memory: {
  readonly title: string;
  readonly description: string;
  readonly empty: string;
  readonly addDialog: string;
  readonly occurredAt: string;
  readonly source: string;
  readonly body: string;
  readonly bodyPlaceholder: string;
  readonly concernRefs: string;
  readonly noConcernTags: string;
  readonly useForReading: string;
  readonly saveRecord: string;
  readonly deleteRecordAria: string;
  readonly saveFailed: (code: string) => string;
  readonly cascadeReadings: (count: number) => string;
  readonly cascadeConversations: (count: number) => string;
  readonly deleteMessage: (body: string, extra: string) => string;
  readonly deleteTitle: string;
};
readonly natal: {
  readonly calendar: string;
  readonly sex: string;
  readonly birthDate: string;
  readonly birthPlace: string;
  readonly birthPlacePlaceholder: string;
  readonly birthTime: string;
  readonly unknownTime: string;
  readonly dstWarning: string;
  readonly calibration: string;
  readonly calibrationDescription: string;
  readonly latitude: string;
  readonly longitude: string;
  readonly timeZone: string;
  readonly latitudePlaceholder: string;
  readonly longitudePlaceholder: string;
  readonly timeZonePlaceholder: string;
};
readonly onboarding: {
  readonly ariaLabel: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly lede: string;
  readonly enter: string;
  readonly readinessAria: string;
  readonly selfTitle: string;
  readonly selfPending: string;
  readonly done: string;
  readonly concernTitle: string;
  readonly activeCount: (active: number, limit: number) => string;
  readonly concernPending: string;
  readonly profileStageEyebrow: string;
  readonly concernStageEyebrow: string;
  readonly profileStageTitle: string;
  readonly concernStageTitle: string;
};
readonly concerns: {
  readonly title: string;
  readonly description: (limit: number, active: number, atLimit: boolean) => string;
  readonly activeGroup: string;
  readonly addableGroup: string;
  readonly relatedTo: string;
  readonly resolved: string;
  readonly pending: string;
  readonly remove: string;
  readonly noActive: string;
  readonly addLimitTitle: (limit: number) => string;
  readonly addTitle: string;
  readonly customLabel: string;
  readonly customPlaceholder: string;
  readonly deleteAria: (label: string) => string;
  readonly deleteTitle: string;
  readonly deleteMessage: (label: string) => string;
  readonly focusAria: string;
  readonly focusLabel: string;
  readonly activeCountAria: (active: number, limit: number) => string;
  readonly focusEmpty: string;
  readonly toggleOffTitle: string;
  readonly toggleOnTitle: string;
  readonly manage: string;
};
readonly privacy: {
  readonly title: string;
  readonly description: string;
  readonly status: string;
  readonly error: (kind: string) => string;
  readonly clearButton: string;
  readonly clearNoAdapter: string;
  readonly clearing: string;
  readonly cleared: string;
  readonly clearFailed: (kind: string) => string;
};
readonly diagnostics: {
  readonly title: string;
  readonly description: string;
  readonly snapshotStatus: string;
  readonly validationCode: string;
};
readonly methodProfile: {
  readonly title: string;
  readonly description: string;
  readonly algorithm: string;
  readonly note: string;
  readonly switchedAt: (savedAt: string) => string;
  readonly capabilities: {
    readonly title: string;
    readonly description: string;
    readonly current: string;
    readonly algorithmNeutralTitle: string;
    readonly mingjingRouteTitle: string;
    readonly supported: string;
    readonly unavailable: string;
    readonly noRouteFeatures: string;
    readonly failClosePrefix: string;
    readonly featureLabels: {
      readonly 'rijing.daily_reading': string;
      readonly 'yuejing.rolling_30_day_reading': string;
      readonly 'nianjing.long_horizon_reading': string;
      readonly 'shijing.consultation': string;
    };
    readonly routeFeatureLabels: {
      readonly natal_projection: string;
      readonly natal_reading: string;
      readonly relationship_hepan: string;
    };
  };
};
readonly aiConfig: {
  readonly title: string;
  readonly description: string;
  readonly runtimeNotReady: string;
  readonly runtimeUnavailable: string;
  readonly runtimeBootstrapPending: string;
  readonly needsTarget: string;
  readonly missingTarget: string;
  readonly missingTargetDetail: string;
  readonly configured: string;
  readonly modelConfigured: string;
};
readonly readingFailure: {
  readonly headlines: LabelMap<ReadingGenerationFailure['kind']>;
  readonly methodFeatureUnsupported: string;
};
readonly citationDrawer: {
  readonly ariaLabel: string;
  readonly summary: string;
  readonly method: string;
  readonly referenceRange: string;
  readonly consultationBasis: string;
  readonly capturedAt: string;
  readonly localIntegrity: string;
  readonly localIntegrityValue: string;
  readonly scopeDate: (date: string, timeZone: string) => string;
  readonly scopeRange: (startDate: string, endDate: string, timeZone: string) => string;
  readonly natalAnchor: (anchorYear: number, timeZone: string) => string;
  readonly relationshipAnchor: (anchorYear: number, timeZone: string) => string;
  readonly consultationSourceCount: (count: number) => string;
  readonly questionWindow: (startDate: string, endDate: string, timeZone: string) => string;
  readonly citedMemories: string;
  readonly citedPlans: string;
};
readonly importToShijing: {
  readonly label: string;
  readonly pendingLabel: string;
  readonly ariaLabel: string;
};
readonly natalErrors: Record<string, string>;
readonly operationFailed: (code: string) => string;
}
