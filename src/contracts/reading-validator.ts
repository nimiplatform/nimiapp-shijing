// SJG-DATA-07 + SJG-ASTRO-03 + SJG-ASTRO-04 + SJG-ASTRO-07 + SJG-ASTRO-08 +
// SJG-ALGO-03 + SJG-ALGO-08 — Reading validator.
//
// Enforces matrix + anchor + Astrology Contract v1 fail-close invariants
// PLUS the Algorithm Contract v1 ReadingTimeWindow + InputsSummary mirror
// rules.

import { READING_KIND_SCOPE_MATRIX, type MatrixCell } from '../domain/reading-matrix.ts';
import type { Reading } from '../domain/reading.ts';
import { isSelfRef, subjectRefEquals, subjectRefKey } from '../domain/subject-ref.ts';
import {
  ASTROLOGY_METHOD_PROFILE_ID,
  READING_TIME_WINDOW_MODES,
  READING_TIME_WINDOW_SOURCES,
  SJG_ALGO_CONTRACT_VERSION,
  SJG_ASTRO_CONTRACT_VERSION,
  type ReadingTimeWindow,
} from '../domain/algorithm.ts';

export type ReadingValidationError =
  | { code: 'reading_kind_scope_forbidden'; kind: string; scope: string }
  | { code: 'reading_sign_must_be_self_only' }
  | { code: 'reading_view_scope_requires_view_id' }
  | { code: 'reading_non_view_scope_must_omit_view_id' }
  | { code: 'reading_subjects_empty' }
  | { code: 'reading_anchor_not_in_subjects' }
  | { code: 'reading_today_must_be_single_subject_and_anchor' }
  | { code: 'reading_consultation_anchor_not_in_subjects' }
  | { code: 'reading_output_summary_empty' }
  | { code: 'reading_highlight_subject_ref_not_in_subjects'; index: number }
  | { code: 'reading_recommendation_subject_ref_not_in_subjects'; index: number }
  | { code: 'reading_time_window_mode_invalid'; received: unknown }
  | { code: 'reading_time_window_source_invalid'; received: unknown }
  | { code: 'reading_time_window_basis_time_zone_invalid' }
  | { code: 'reading_time_window_sign_must_be_natal' }
  | { code: 'reading_time_window_non_sign_must_be_bounded' }
  | { code: 'reading_time_window_bounded_missing_endpoints' }
  | { code: 'reading_time_window_bounded_start_not_before_end' }
  | { code: 'reading_time_window_natal_must_not_carry_endpoints' }
  | { code: 'reading_inputs_summary_contract_version_mismatch'; received: unknown }
  | { code: 'reading_inputs_summary_algorithm_contract_version_mismatch'; received: unknown }
  | { code: 'reading_inputs_summary_method_profile_id_mismatch'; received: unknown }
  | { code: 'reading_inputs_summary_time_window_mismatch' }
  | { code: 'reading_inputs_summary_feature_snapshot_method_profile_mismatch'; received: unknown }
  | { code: 'reading_inputs_summary_feature_snapshot_time_window_mismatch' }
  | { code: 'reading_inputs_summary_view_snapshot_required_for_view_scope' }
  | { code: 'reading_inputs_summary_view_snapshot_forbidden_for_non_view_scope' }
  | { code: 'reading_inputs_summary_view_snapshot_view_id_mismatch' }
  | { code: 'reading_inputs_summary_view_snapshot_hash_missing'; field: string }
  | { code: 'reading_inputs_summary_input_hash_invalid' }
  | { code: 'reading_inputs_summary_feature_snapshot_hash_invalid' }
  | { code: 'reading_inputs_summary_ad_hoc_context_required_for_ad_hoc_scope' }
  | { code: 'reading_inputs_summary_ad_hoc_context_forbidden_for_non_ad_hoc_scope' };

export type ReadingValidationResult =
  | { ok: true }
  | { ok: false; error: ReadingValidationError };

export function evaluateReadingKindScope(
  kind: keyof typeof READING_KIND_SCOPE_MATRIX,
  scope: 'subject' | 'view' | 'ad_hoc',
): MatrixCell {
  return READING_KIND_SCOPE_MATRIX[kind][scope];
}

function validateTimeWindowShape(window: ReadingTimeWindow): ReadingValidationResult {
  if (!READING_TIME_WINDOW_MODES.includes(window.mode)) {
    return { ok: false, error: { code: 'reading_time_window_mode_invalid', received: window.mode } };
  }
  if (!READING_TIME_WINDOW_SOURCES.includes(window.source)) {
    return { ok: false, error: { code: 'reading_time_window_source_invalid', received: window.source } };
  }
  if (typeof window.basis_time_zone !== 'string' || window.basis_time_zone.length === 0) {
    return { ok: false, error: { code: 'reading_time_window_basis_time_zone_invalid' } };
  }
  return { ok: true };
}

function timeWindowsEqual(a: ReadingTimeWindow, b: ReadingTimeWindow): boolean {
  return (
    a.mode === b.mode &&
    a.start_utc === b.start_utc &&
    a.end_utc === b.end_utc &&
    a.basis_time_zone === b.basis_time_zone &&
    a.source === b.source
  );
}

export function validateReading(reading: Reading): ReadingValidationResult {
  if (reading.subjects.length === 0) {
    return { ok: false, error: { code: 'reading_subjects_empty' } };
  }
  const anchorPresent = reading.subjects.some((subject) =>
    subjectRefEquals(subject, reading.anchor_subject),
  );
  if (!anchorPresent) {
    return { ok: false, error: { code: 'reading_anchor_not_in_subjects' } };
  }
  if (reading.scope === 'view') {
    if (!reading.view_id || reading.view_id.length === 0) {
      return { ok: false, error: { code: 'reading_view_scope_requires_view_id' } };
    }
  } else if (reading.view_id !== undefined) {
    return { ok: false, error: { code: 'reading_non_view_scope_must_omit_view_id' } };
  }
  const cell = evaluateReadingKindScope(reading.kind, reading.scope);
  if (cell === 'forbidden') {
    return {
      ok: false,
      error: { code: 'reading_kind_scope_forbidden', kind: reading.kind, scope: reading.scope },
    };
  }
  if (cell === 'self_only') {
    const isSelfOnly =
      isSelfRef(reading.anchor_subject) &&
      reading.subjects.length === 1 &&
      isSelfRef(reading.subjects[0]!);
    if (!isSelfOnly) {
      return { ok: false, error: { code: 'reading_sign_must_be_self_only' } };
    }
  }
  if (reading.kind === 'today') {
    const singleSubject = reading.subjects.length === 1;
    const anchorMatches = singleSubject && subjectRefEquals(reading.subjects[0]!, reading.anchor_subject);
    if (!singleSubject || !anchorMatches) {
      return { ok: false, error: { code: 'reading_today_must_be_single_subject_and_anchor' } };
    }
  }
  if (reading.kind === 'consultation') {
    if (!anchorPresent) {
      return { ok: false, error: { code: 'reading_consultation_anchor_not_in_subjects' } };
    }
  }
  const timeWindowShape = validateTimeWindowShape(reading.time_window);
  if (!timeWindowShape.ok) return timeWindowShape;
  if (reading.kind === 'sign') {
    if (reading.time_window.mode !== 'natal') {
      return { ok: false, error: { code: 'reading_time_window_sign_must_be_natal' } };
    }
    if (reading.time_window.start_utc !== undefined || reading.time_window.end_utc !== undefined) {
      return { ok: false, error: { code: 'reading_time_window_natal_must_not_carry_endpoints' } };
    }
  } else {
    if (reading.time_window.mode !== 'bounded') {
      return { ok: false, error: { code: 'reading_time_window_non_sign_must_be_bounded' } };
    }
    if (!reading.time_window.start_utc || !reading.time_window.end_utc) {
      return { ok: false, error: { code: 'reading_time_window_bounded_missing_endpoints' } };
    }
    if (reading.time_window.start_utc >= reading.time_window.end_utc) {
      return { ok: false, error: { code: 'reading_time_window_bounded_start_not_before_end' } };
    }
  }
  if (!reading.output.summary || reading.output.summary.trim().length === 0) {
    return { ok: false, error: { code: 'reading_output_summary_empty' } };
  }
  const subjectKeys = new Set(reading.subjects.map(subjectRefKey));
  for (let i = 0; i < reading.output.highlights.length; i += 1) {
    const highlight = reading.output.highlights[i]!;
    if (!subjectKeys.has(subjectRefKey(highlight.subject_ref))) {
      return { ok: false, error: { code: 'reading_highlight_subject_ref_not_in_subjects', index: i } };
    }
  }
  for (let i = 0; i < reading.output.recommendations.length; i += 1) {
    const recommendation = reading.output.recommendations[i]!;
    if (!subjectKeys.has(subjectRefKey(recommendation.subject_ref))) {
      return { ok: false, error: { code: 'reading_recommendation_subject_ref_not_in_subjects', index: i } };
    }
  }
  const summary = reading.inputs_summary;
  if (summary.contract_version !== SJG_ASTRO_CONTRACT_VERSION) {
    return {
      ok: false,
      error: { code: 'reading_inputs_summary_contract_version_mismatch', received: summary.contract_version },
    };
  }
  if (summary.algorithm_contract_version !== SJG_ALGO_CONTRACT_VERSION) {
    return {
      ok: false,
      error: { code: 'reading_inputs_summary_algorithm_contract_version_mismatch', received: summary.algorithm_contract_version },
    };
  }
  if (summary.method_profile.id !== ASTROLOGY_METHOD_PROFILE_ID) {
    return {
      ok: false,
      error: { code: 'reading_inputs_summary_method_profile_id_mismatch', received: summary.method_profile.id },
    };
  }
  // SJG-ALGO-11 — input_hash / feature_snapshot_hash must be real
  // canonical SHA-256 digests, NOT the wave-5 placeholder literal
  // 'unset' and NOT the empty string. The deterministic pipeline
  // populates them via computeCanonicalHash, so any persisted Reading
  // missing them is a contract violation.
  if (
    typeof summary.input_hash !== 'string' ||
    summary.input_hash.length === 0 ||
    summary.input_hash === 'unset'
  ) {
    return { ok: false, error: { code: 'reading_inputs_summary_input_hash_invalid' } };
  }
  if (
    typeof summary.feature_snapshot_hash !== 'string' ||
    summary.feature_snapshot_hash.length === 0 ||
    summary.feature_snapshot_hash === 'unset'
  ) {
    return { ok: false, error: { code: 'reading_inputs_summary_feature_snapshot_hash_invalid' } };
  }
  if (!timeWindowsEqual(summary.time_window, reading.time_window)) {
    return { ok: false, error: { code: 'reading_inputs_summary_time_window_mismatch' } };
  }
  if (summary.feature_snapshot.method_profile.id !== ASTROLOGY_METHOD_PROFILE_ID) {
    return {
      ok: false,
      error: {
        code: 'reading_inputs_summary_feature_snapshot_method_profile_mismatch',
        received: summary.feature_snapshot.method_profile.id,
      },
    };
  }
  if (!timeWindowsEqual(summary.feature_snapshot.time_window, reading.time_window)) {
    return { ok: false, error: { code: 'reading_inputs_summary_feature_snapshot_time_window_mismatch' } };
  }
  if (reading.scope === 'view') {
    if (!summary.view_snapshot) {
      return { ok: false, error: { code: 'reading_inputs_summary_view_snapshot_required_for_view_scope' } };
    }
    if (summary.view_snapshot.view_id !== reading.view_id) {
      return { ok: false, error: { code: 'reading_inputs_summary_view_snapshot_view_id_mismatch' } };
    }
    const hashFields: ('instructions_hash' | 'context_items_hash' | 'memory_summary_hash')[] = [
      'instructions_hash',
      'context_items_hash',
      'memory_summary_hash',
    ];
    for (const field of hashFields) {
      const value = summary.view_snapshot[field];
      if (typeof value !== 'string' || value.length === 0 || value === 'unset') {
        return { ok: false, error: { code: 'reading_inputs_summary_view_snapshot_hash_missing', field } };
      }
    }
  } else if (summary.view_snapshot !== undefined) {
    return { ok: false, error: { code: 'reading_inputs_summary_view_snapshot_forbidden_for_non_view_scope' } };
  }
  if (reading.scope === 'ad_hoc') {
    if (summary.ad_hoc_context === undefined || summary.ad_hoc_context.length === 0) {
      return { ok: false, error: { code: 'reading_inputs_summary_ad_hoc_context_required_for_ad_hoc_scope' } };
    }
  } else if (summary.ad_hoc_context !== undefined) {
    return { ok: false, error: { code: 'reading_inputs_summary_ad_hoc_context_forbidden_for_non_ad_hoc_scope' } };
  }
  return { ok: true };
}
