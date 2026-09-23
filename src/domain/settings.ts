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

// rule.shijing.product.r017 — when the in-app daily RiJing run starts. The
// time is a 24-hour HH:MM wall-clock time in the RiJing basis time zone.
export interface DailyRiJingSettings {
  readonly enabled: boolean;
  readonly time: string;
}

export const DAILY_RIJING_TIME_PATTERN = /^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/u;

export const DEFAULT_DAILY_RIJING_TIME = '08:00';

export function isDailyRiJingTime(value: unknown): value is string {
  return typeof value === 'string' && DAILY_RIJING_TIME_PATTERN.test(value);
}

export interface Settings {
  readonly ui_language: UiLanguage;
  readonly response_preferences: ResponsePreferences;
  // Active 命理 method profile for generation (SJG-ALGO-01/02). Absent ⇒ the
  // default profile (bazi_ziping_v1). Not a wording preference.
  readonly method_profile_id?: MethodProfileId;
  // Absent ⇒ no daily run. Never enters calculation, hashing, or provenance.
  readonly daily_rijing?: DailyRiJingSettings;
}
