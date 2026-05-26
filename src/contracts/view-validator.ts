// SJG-DATA-06 — View validator.

import { DISPLAY_STATES, type View, TIME_SCOPES } from '../domain/view.ts';
import { subjectRefEquals } from '../domain/subject-ref.ts';
import { parseIsoUtcInstant } from './time-window-validation.ts';

export type ViewValidationError =
  | { code: 'view_subjects_empty' }
  | { code: 'view_anchor_not_in_subjects' }
  | { code: 'view_time_scope_invalid'; received: unknown }
  | { code: 'view_bounded_range_missing_for_bounded_scope' }
  | { code: 'view_bounded_range_present_for_non_bounded_scope' }
  | { code: 'view_bounded_range_endpoint_not_iso_utc'; field: 'start' | 'end' }
  | { code: 'view_bounded_range_start_after_end' }
  | { code: 'view_rolling_window_missing_for_rolling_scope' }
  | { code: 'view_rolling_window_present_for_non_rolling_scope' }
  | { code: 'view_rolling_window_not_positive_integer' }
  | { code: 'view_display_state_invalid'; received: unknown };

export type ViewValidationResult = { ok: true } | { ok: false; error: ViewValidationError };

export function validateView(view: View): ViewValidationResult {
  if (view.subjects.length === 0) {
    return { ok: false, error: { code: 'view_subjects_empty' } };
  }
  const anchorPresent = view.subjects.some((subject) => subjectRefEquals(subject, view.anchor_subject));
  if (!anchorPresent) {
    return { ok: false, error: { code: 'view_anchor_not_in_subjects' } };
  }
  if (!TIME_SCOPES.includes(view.time_scope)) {
    return { ok: false, error: { code: 'view_time_scope_invalid', received: view.time_scope } };
  }
  if (view.time_scope === 'bounded') {
    if (!view.bounded_range) {
      return { ok: false, error: { code: 'view_bounded_range_missing_for_bounded_scope' } };
    }
    if (view.rolling_window_days !== undefined) {
      return { ok: false, error: { code: 'view_rolling_window_present_for_non_rolling_scope' } };
    }
    const start = parseIsoUtcInstant(view.bounded_range.start);
    if (!start) {
      return { ok: false, error: { code: 'view_bounded_range_endpoint_not_iso_utc', field: 'start' } };
    }
    const end = parseIsoUtcInstant(view.bounded_range.end);
    if (!end) {
      return { ok: false, error: { code: 'view_bounded_range_endpoint_not_iso_utc', field: 'end' } };
    }
    if (start.ms > end.ms) {
      return { ok: false, error: { code: 'view_bounded_range_start_after_end' } };
    }
  } else if (view.time_scope === 'rolling') {
    if (view.rolling_window_days === undefined) {
      return { ok: false, error: { code: 'view_rolling_window_missing_for_rolling_scope' } };
    }
    if (view.bounded_range !== undefined) {
      return { ok: false, error: { code: 'view_bounded_range_present_for_non_bounded_scope' } };
    }
    if (!Number.isInteger(view.rolling_window_days) || view.rolling_window_days <= 0) {
      return { ok: false, error: { code: 'view_rolling_window_not_positive_integer' } };
    }
  } else {
    if (view.bounded_range !== undefined) {
      return { ok: false, error: { code: 'view_bounded_range_present_for_non_bounded_scope' } };
    }
    if (view.rolling_window_days !== undefined) {
      return { ok: false, error: { code: 'view_rolling_window_present_for_non_rolling_scope' } };
    }
  }
  if (!DISPLAY_STATES.includes(view.display_state)) {
    return { ok: false, error: { code: 'view_display_state_invalid', received: view.display_state } };
  }
  return { ok: true };
}
