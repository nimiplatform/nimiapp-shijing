// 生时校正 — birth-time rectification result types.
//
// When the birth HOUR is uncertain, rectification searches the candidate 时辰 and
// scores each by how well its deterministic 起运/大运 timeline aligns with the
// user's recorded life events. It makes the chart more accurate by correcting the
// uncertain INPUT (the hour) — never by altering the engine. The user confirms
// the proposed 生时; see [[project-mingjing-waves]].

import type { BaziBranchRelationKind, EarthlyBranch, GanzhiPillar } from './algorithm.ts';

export interface RectificationAlignedEvent {
  readonly event_memory_ref: string;
  readonly year: number;
  // How the event-year 流年支 interacts with THIS candidate's 时支 — the
  // hour-discriminating signal. `null` = no interaction that year.
  readonly hour_interaction: BaziBranchRelationKind | null;
}

export interface RectificationCandidate {
  readonly hour_branch: EarthlyBranch; // 时支 of the resulting hour pillar
  readonly is_late_zi: boolean; // 晚子时 (23:00) — distinguishes it from 早子时 (00:00)
  readonly representative_time: string; // 'HH:MM' local wall clock used for this 时辰
  readonly hour_pillar: GanzhiPillar;
  readonly day_pillar: GanzhiPillar; // may differ for 晚子 (day-pillar roll)
  readonly start_age_years: number; // 起运
  readonly boundary_years: readonly number[]; // 大运 start years
  readonly fit_score: number; // 0..1 — alignment with the event timeline
  readonly aligned_events: readonly RectificationAlignedEvent[];
}

export type RectificationConfidence = 'high' | 'medium' | 'low';

export const RECTIFICATION_CONFIDENCES: readonly RectificationConfidence[] = [
  'high',
  'medium',
  'low',
] as const;

export interface RectificationResult {
  // Ranked descending by fit_score.
  readonly candidates: readonly RectificationCandidate[];
  // The top candidate when confidence is medium/high; absent when the events do
  // not separate the 时辰 well enough to recommend one.
  readonly recommended?: RectificationCandidate;
  readonly confidence: RectificationConfidence;
  readonly event_years: readonly number[];
}

export type RectificationUnavailableReason =
  | 'calendar_not_gregorian'
  | 'missing_birth_date'
  | 'calculation_sex_unspecified'
  | 'not_enough_events';

export type RectificationOutcome =
  | { readonly ok: true; readonly result: RectificationResult }
  | { readonly ok: false; readonly reason: RectificationUnavailableReason };

// At least this many in-life events are required before a recommendation is
// meaningful (one event aligns with almost any candidate).
export const RECTIFICATION_MIN_EVENTS = 2 as const;
