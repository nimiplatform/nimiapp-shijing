// SJG-DATA-08 + SJG-ASTRO-02 — MirrorScope.

import type { SubjectRef } from './subject-ref.ts';

export type MirrorKind = 'rijing' | 'yuejing' | 'nianjing' | 'mingjing' | 'shijing';

export const MIRROR_KINDS: readonly MirrorKind[] = [
  'rijing',
  'yuejing',
  'nianjing',
  'mingjing',
  'shijing',
] as const;

export type MirrorScopeKind =
  | 'daily'
  | 'rolling_30_day'
  | 'long_horizon'
  | 'natal'
  | 'relationship_natal'
  | 'consultation';

export const MIRROR_SCOPE_KINDS: readonly MirrorScopeKind[] = [
  'daily',
  'rolling_30_day',
  'long_horizon',
  'natal',
  'relationship_natal',
  'consultation',
] as const;

export interface DailyMirrorScope {
  readonly kind: 'daily';
  readonly date: string;
  readonly basis_time_zone: string;
}

export interface Rolling30DayMirrorScope {
  readonly kind: 'rolling_30_day';
  readonly start_date: string;
  readonly end_date: string;
  readonly basis_time_zone: string;
}

export interface LongHorizonMirrorScope {
  readonly kind: 'long_horizon';
  readonly start_date: string;
  readonly end_date: string;
  readonly basis_time_zone: string;
}

// 命镜 (SJG-ASTRO-02): a whole-life natal scope. It is not a transit window —
// `anchor_year` only fixes the "current"/流年-horizon reference for the projection
// and keeps the canonical window deterministic for hashing.
export interface NatalMirrorScope {
  readonly kind: 'natal';
  readonly anchor_year: number;
  readonly basis_time_zone: string;
}

export interface RelationshipNatalMirrorScope {
  readonly kind: 'relationship_natal';
  readonly related_person_ref: Extract<SubjectRef, { kind: 'person' }>;
  readonly anchor_year: number;
  readonly basis_time_zone: string;
}

export interface ConsultationQuestionWindow {
  readonly start_date: string;
  readonly end_date: string;
}

export interface ConsultationMirrorScope {
  readonly kind: 'consultation';
  readonly source_reading_ids: readonly string[];
  readonly basis_time_zone: string;
  readonly question_window?: ConsultationQuestionWindow;
}

export type MirrorScope =
  | DailyMirrorScope
  | Rolling30DayMirrorScope
  | LongHorizonMirrorScope
  | NatalMirrorScope
  | RelationshipNatalMirrorScope
  | ConsultationMirrorScope;

export const MIRROR_KIND_SCOPE_MATRIX: {
  readonly [K in MirrorKind]: { readonly [S in MirrorScopeKind]: 'allowed' | 'forbidden' };
} = {
  rijing: {
    daily: 'allowed',
    rolling_30_day: 'forbidden',
    long_horizon: 'forbidden',
    natal: 'forbidden',
    relationship_natal: 'forbidden',
    consultation: 'forbidden',
  },
  yuejing: {
    daily: 'forbidden',
    rolling_30_day: 'allowed',
    long_horizon: 'forbidden',
    natal: 'forbidden',
    relationship_natal: 'forbidden',
    consultation: 'forbidden',
  },
  nianjing: {
    daily: 'forbidden',
    rolling_30_day: 'forbidden',
    long_horizon: 'allowed',
    natal: 'forbidden',
    relationship_natal: 'forbidden',
    consultation: 'forbidden',
  },
  mingjing: {
    daily: 'forbidden',
    rolling_30_day: 'forbidden',
    long_horizon: 'forbidden',
    natal: 'allowed',
    relationship_natal: 'allowed',
    consultation: 'forbidden',
  },
  shijing: {
    daily: 'forbidden',
    rolling_30_day: 'forbidden',
    long_horizon: 'forbidden',
    natal: 'forbidden',
    relationship_natal: 'forbidden',
    consultation: 'allowed',
  },
};

export const NIANJING_ADMITTED_WINDOW_PRESETS: readonly string[] = [
  'next_3_years_from_anchor_year',
  'next_5_years_from_anchor_year',
  'next_10_years_from_anchor_year',
  'current_dayun_period_when_available',
] as const;

export const NIANJING_MIN_LOCAL_MONTHS = 12 as const;
export const NIANJING_MAX_LOCAL_YEARS = 10 as const;

export const ROLLING_30_DAY_LOCAL_LENGTH = 30 as const;

export const CONSULTATION_QUESTION_WINDOW_MIN_LOCAL_DAYS = 1 as const;
export const CONSULTATION_QUESTION_WINDOW_MAX_LOCAL_DAYS = 365 as const;

// 命镜 natal anchor-year sanity bounds (Gregorian). The anchor is a reference
// year, not a birth year; it must fall within the supported ephemeris era.
export const NATAL_ANCHOR_YEAR_MIN = 1900 as const;
export const NATAL_ANCHOR_YEAR_MAX = 2200 as const;
