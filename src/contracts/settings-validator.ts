// SJG-DATA-09 + SJG-ALGO-01 — Settings validator.
//
// Persistence-time fail-close for Settings. The active method_profile_id must be
// an admitted profile and the response preferences must use admitted enums.
// Without this, a stale or forbidden method_profile_id (e.g. a retired engine
// id left over after a method rename) would persist through load and only
// surface much later as an opaque generation failure.

import { isAdmittedMethodProfileId } from '../domain/algorithm.ts';
import {
  RESPONSE_LENGTHS,
  RESPONSE_TONES,
  isUiLanguage,
  isResponseLanguage,
  type Settings,
} from '../domain/settings.ts';

export type SettingsValidationError =
  | { code: 'settings_ui_language_invalid'; received: unknown }
  | { code: 'settings_response_preferences_missing' }
  | { code: 'settings_response_tone_invalid'; received: unknown }
  | { code: 'settings_response_length_invalid'; received: unknown }
  | { code: 'settings_response_language_invalid'; received: unknown }
  | { code: 'settings_extra_instructions_invalid' }
  | { code: 'settings_method_profile_id_not_admitted'; received: unknown };

export type SettingsValidationResult =
  | { ok: true }
  | { ok: false; error: SettingsValidationError };

export function validateSettings(settings: Settings): SettingsValidationResult {
  if (!isUiLanguage(settings.ui_language)) {
    return { ok: false, error: { code: 'settings_ui_language_invalid', received: settings.ui_language } };
  }
  const prefs = settings.response_preferences;
  if (typeof prefs !== 'object' || prefs === null) {
    return { ok: false, error: { code: 'settings_response_preferences_missing' } };
  }
  if (!(RESPONSE_TONES as readonly unknown[]).includes(prefs.tone)) {
    return { ok: false, error: { code: 'settings_response_tone_invalid', received: prefs.tone } };
  }
  if (!(RESPONSE_LENGTHS as readonly unknown[]).includes(prefs.length)) {
    return { ok: false, error: { code: 'settings_response_length_invalid', received: prefs.length } };
  }
  if (!isResponseLanguage(prefs.language)) {
    return { ok: false, error: { code: 'settings_response_language_invalid', received: prefs.language } };
  }
  if (prefs.extra_instructions !== undefined && typeof prefs.extra_instructions !== 'string') {
    return { ok: false, error: { code: 'settings_extra_instructions_invalid' } };
  }
  // method_profile_id is optional (absent ⇒ default engine); when present it must
  // be a currently-admitted profile, never a reserved/retired id.
  if (settings.method_profile_id !== undefined && !isAdmittedMethodProfileId(settings.method_profile_id)) {
    return {
      ok: false,
      error: { code: 'settings_method_profile_id_not_admitted', received: settings.method_profile_id },
    };
  }
  return { ok: true };
}
