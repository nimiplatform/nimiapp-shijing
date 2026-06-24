// Shared primitive types for ShiJing product-copy schema.

export type {
  BirthPrecision,
  CalculationSex,
  CalendarSystem,
  ConsentState,
} from '../../../domain/person.ts';
export type { MirrorKind } from '../../../domain/mirror-scope.ts';
export type {
  NianJingInflectionKind,
  TendencyClass,
} from '../../../domain/mirror-output.ts';
export type { ConversationRole } from '../../../domain/conversation.ts';
export type {
  ResponseLanguage,
  ResponseLength,
  ResponseTone,
  UiLanguage,
} from '../../../domain/settings.ts';
export type { ReadingGenerationFailure } from '../../../domain/reading.ts';
export type { ShijingSettingsPageId, ShijingTabId } from '../../../contracts/ia-contract.ts';
export type { NatalReadinessReason } from '../../subjects/natal-readiness.ts';
export type { FiveElement, ShijingStageLabel } from '../../../domain/algorithm.ts';
export type { PeriodFavor } from '../../../domain/mingjing.ts';

export type LabelMap<K extends string> = Record<K, string>;

export type RiJingEmptyStateCopyKind =
  | 'ready_to_generate'
  | 'profile_incomplete'
  | 'missing_focus'
  | 'runtime_ai_failed'
  | 'persistence_pending'
  | 'persistence_failed';

export type RiJingHeroEmptyCopy = {
  readonly description: string;
  readonly confidence_note: string;
  readonly reminder: string;
};

export type RiJingReadinessCopy = {
  readonly title: string;
  readonly body: string;
};
