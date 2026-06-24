// SJG-DATA-11 — Settings, ResponsePreferences.

import type { MethodProfileId } from './algorithm.ts';

export type UiLanguage = 'zh' | 'en';

export const UI_LANGUAGES: readonly UiLanguage[] = ['zh', 'en'] as const;

export function isUiLanguage(value: unknown): value is UiLanguage {
  return (UI_LANGUAGES as readonly unknown[]).includes(value);
}

export type ResponseTone = 'neutral' | 'warm' | 'concise';

export const RESPONSE_TONES: readonly ResponseTone[] = ['neutral', 'warm', 'concise'] as const;

export type ResponseLength = 'short' | 'standard' | 'long';

export const RESPONSE_LENGTHS: readonly ResponseLength[] = ['short', 'standard', 'long'] as const;

export type ResponseLanguage = 'zh-Hans' | 'zh-Hant' | 'en';

export const RESPONSE_LANGUAGES: readonly ResponseLanguage[] = [
  'zh-Hans',
  'zh-Hant',
  'en',
] as const;

export function isResponseLanguage(value: unknown): value is ResponseLanguage {
  return (RESPONSE_LANGUAGES as readonly unknown[]).includes(value);
}

export interface ResponsePreferences {
  readonly tone: ResponseTone;
  readonly length: ResponseLength;
  readonly language: string;
  readonly extra_instructions?: string;
}

export interface Settings {
  readonly ui_language: UiLanguage;
  readonly response_preferences: ResponsePreferences;
  // Active 命理 method profile for generation (SJG-ALGO-01/02). Absent ⇒ the
  // default profile (bazi_ziping_v1). Not a wording preference.
  readonly method_profile_id?: MethodProfileId;
}
