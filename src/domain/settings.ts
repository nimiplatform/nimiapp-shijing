// SJG-DATA-09 — Settings, ResponsePreferences.

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
  readonly response_preferences: ResponsePreferences;
}
