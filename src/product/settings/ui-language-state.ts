// Settings > UI language — pure-state commit helper.

import { isUiLanguage, type UiLanguage } from '../../domain/settings.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';

export type UiLanguageError = { code: 'ui_language_invalid'; received: unknown };

export type UiLanguageCommitOutcome =
  | { ok: true; next_space: ShiJingSpace }
  | { ok: false; error: UiLanguageError };

export function commitUiLanguage(
  space: ShiJingSpace,
  uiLanguage: unknown,
): UiLanguageCommitOutcome {
  if (!isUiLanguage(uiLanguage)) {
    return { ok: false, error: { code: 'ui_language_invalid', received: uiLanguage } };
  }
  const language: UiLanguage = uiLanguage;
  return {
    ok: true,
    next_space: {
      ...space,
      settings: {
        ...space.settings,
        ui_language: language,
      },
    },
  };
}
