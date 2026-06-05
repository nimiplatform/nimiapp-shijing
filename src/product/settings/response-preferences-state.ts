// W-c03 Settings > Response Preferences — pure-state editor helpers.

import {
  RESPONSE_LENGTHS,
  RESPONSE_TONES,
  isResponseLanguage,
  type ResponseLength,
  type ResponsePreferences,
  type ResponseTone,
} from '../../domain/settings.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';

export type ResponsePreferencesError =
  | { code: 'tone_invalid'; received: unknown }
  | { code: 'length_invalid'; received: unknown }
  | { code: 'language_empty' }
  | { code: 'language_invalid'; received: unknown };

export type ResponsePreferencesCommitOutcome =
  | { ok: true; next_space: ShiJingSpace }
  | { ok: false; error: ResponsePreferencesError };

export function commitResponsePreferences(
  space: ShiJingSpace,
  draft: ResponsePreferences,
): ResponsePreferencesCommitOutcome {
  if (!(RESPONSE_TONES as readonly ResponseTone[]).includes(draft.tone)) {
    return { ok: false, error: { code: 'tone_invalid', received: draft.tone } };
  }
  if (!(RESPONSE_LENGTHS as readonly ResponseLength[]).includes(draft.length)) {
    return { ok: false, error: { code: 'length_invalid', received: draft.length } };
  }
  if (typeof draft.language !== 'string' || draft.language.trim().length === 0) {
    return { ok: false, error: { code: 'language_empty' } };
  }
  const language = draft.language.trim();
  if (!isResponseLanguage(language)) {
    return { ok: false, error: { code: 'language_invalid', received: draft.language } };
  }
  const next_space: ShiJingSpace = {
    ...space,
    settings: {
      ...space.settings,
      response_preferences: {
        tone: draft.tone,
        length: draft.length,
        language,
        ...(draft.extra_instructions && draft.extra_instructions.length > 0
          ? { extra_instructions: draft.extra_instructions }
          : {}),
      },
    },
  };
  return { ok: true, next_space };
}
