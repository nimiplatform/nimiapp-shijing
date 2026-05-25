// SJG-DATA-09 — Settings, ResponsePreferences, NotificationPreferences.

export type ResponseTone = 'neutral' | 'warm' | 'concise';

export const RESPONSE_TONES: readonly ResponseTone[] = ['neutral', 'warm', 'concise'] as const;

export type ResponseLength = 'short' | 'standard' | 'long';

export const RESPONSE_LENGTHS: readonly ResponseLength[] = ['short', 'standard', 'long'] as const;

export interface ResponsePreferences {
  readonly tone: ResponseTone;
  readonly length: ResponseLength;
  readonly language: string;
  readonly extra_instructions?: string;
}

export interface NotificationPreferences {
  readonly daily_today_card_enabled: boolean;
  readonly daily_today_card_local_time: string;
}

export interface Settings {
  readonly response_preferences: ResponsePreferences;
  readonly notification_preferences: NotificationPreferences;
}
