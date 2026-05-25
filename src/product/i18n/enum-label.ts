// Single entry point for translating a canonical domain enum value
// into a user-facing Chinese label. Falls back to the original value
// if a mapping is missing (defensive — should never happen in practice).

import {
  BIRTH_PRECISION_LABELS,
  CALCULATION_SEX_LABELS,
  CALENDAR_SYSTEM_LABELS,
  CONSENT_STATE_LABELS,
  CONVERSATION_ROLE_LABELS,
  CULTURAL_MARKER_LABELS,
  DISPLAY_STATE_LABELS,
  READING_KIND_LABELS,
  READING_SCOPE_LABELS,
  RESPONSE_LENGTH_LABELS,
  RESPONSE_TONE_LABELS,
  TIME_SCOPE_LABELS,
  type ConversationRole,
} from './copy.ts';

import type { BirthPrecision, CalculationSex, CalendarSystem, ConsentState, CulturalMarker } from '../../domain/person.ts';
import type { ReadingKind, ReadingScope } from '../../domain/reading-matrix.ts';
import type { ResponseLength, ResponseTone } from '../../domain/settings.ts';
import type { DisplayState, TimeScope } from '../../domain/view.ts';

export type EnumDomain =
  | 'calendar_system'
  | 'birth_precision'
  | 'calculation_sex'
  | 'cultural_marker'
  | 'consent_state'
  | 'time_scope'
  | 'display_state'
  | 'response_tone'
  | 'response_length'
  | 'reading_kind'
  | 'reading_scope'
  | 'conversation_role';

export function enumLabel(domain: EnumDomain, value: string): string {
  switch (domain) {
    case 'calendar_system':
      return CALENDAR_SYSTEM_LABELS[value as CalendarSystem] ?? value;
    case 'birth_precision':
      return BIRTH_PRECISION_LABELS[value as BirthPrecision] ?? value;
    case 'calculation_sex':
      return CALCULATION_SEX_LABELS[value as CalculationSex] ?? value;
    case 'cultural_marker':
      return CULTURAL_MARKER_LABELS[value as CulturalMarker] ?? value;
    case 'consent_state':
      return CONSENT_STATE_LABELS[value as ConsentState] ?? value;
    case 'time_scope':
      return TIME_SCOPE_LABELS[value as TimeScope] ?? value;
    case 'display_state':
      return DISPLAY_STATE_LABELS[value as DisplayState] ?? value;
    case 'response_tone':
      return RESPONSE_TONE_LABELS[value as ResponseTone] ?? value;
    case 'response_length':
      return RESPONSE_LENGTH_LABELS[value as ResponseLength] ?? value;
    case 'reading_kind':
      return READING_KIND_LABELS[value as ReadingKind] ?? value;
    case 'reading_scope':
      return READING_SCOPE_LABELS[value as ReadingScope] ?? value;
    case 'conversation_role':
      return CONVERSATION_ROLE_LABELS[value as ConversationRole] ?? value;
    default: {
      const exhaustive: never = domain;
      void exhaustive;
      return value;
    }
  }
}
