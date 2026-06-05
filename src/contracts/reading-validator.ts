// SJG-DATA-07 + SJG-DATA-09 + SJG-ASTRO-* + SJG-ALGO-* — Reading validator.

import type { ConcernTagSnapshot } from '../domain/concern-tag.ts';
import type { MirrorScope } from '../domain/mirror-scope.ts';
import type { MirrorOutput } from '../domain/mirror-output.ts';
import type { Reading } from '../domain/reading.ts';
import {
  isAdmittedMethodProfileId,
  SJG_ALGO_CONTRACT_VERSION,
  SJG_ASTRO_CONTRACT_VERSION,
} from '../domain/algorithm.ts';
import { isSelfRef, subjectRefEquals } from '../domain/subject-ref.ts';
import {
  evaluateMirrorKindScope,
  validateMirrorScope,
} from './mirror-scope-validator.ts';
import { validateMirrorOutput } from './mirror-output-validator.ts';
import { READING_OWNER_SCOPED_REMOVED_FIELDS } from './removed-surfaces.ts';
import { computeCanonicalHash } from '../product/astrology/canonical-hash.ts';

const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export type ReadingValidationError =
  | { code: 'reading_id_empty' }
  | { code: 'reading_created_at_not_iso_utc' }
  | { code: 'reading_mirror_kind_invalid'; received: unknown }
  | { code: 'reading_mirror_scope_invalid'; reason: string }
  | { code: 'reading_mirror_kind_scope_forbidden'; kind: string; scope: string }
  | { code: 'reading_primary_subject_ref_must_be_self' }
  | { code: 'reading_related_person_ref_must_be_person'; index: number }
  | { code: 'reading_concern_tag_ref_empty'; index: number }
  | { code: 'reading_cited_reading_id_empty'; index: number }
  | { code: 'reading_cited_event_memory_ref_empty'; index: number }
  | { code: 'reading_cited_plan_item_ref_empty'; index: number }
  | { code: 'reading_inputs_summary_captured_at_not_iso_utc' }
  | { code: 'reading_inputs_summary_contract_version_mismatch'; received: unknown }
  | { code: 'reading_inputs_summary_algorithm_contract_version_mismatch'; received: unknown }
  | { code: 'reading_inputs_summary_method_profile_id_mismatch'; received: unknown }
  | { code: 'reading_inputs_summary_input_hash_invalid' }
  | { code: 'reading_inputs_summary_feature_snapshot_hash_invalid' }
  | { code: 'reading_inputs_summary_feature_snapshot_hash_mismatch' }
  | { code: 'reading_inputs_summary_feature_snapshot_mirror_kind_mismatch' }
  | { code: 'reading_inputs_summary_feature_snapshot_canonical_window_mismatch' }
  | { code: 'reading_inputs_summary_mirror_context_mirror_kind_mismatch' }
  | { code: 'reading_inputs_summary_mirror_context_mirror_scope_mismatch' }
  | { code: 'reading_inputs_summary_mirror_context_response_preferences_hash_invalid' }
  | { code: 'reading_inputs_summary_mirror_context_concern_tag_snapshot_invalid'; index: number; reason: string }
  | { code: 'reading_output_mirror_kind_mismatch'; received: string }
  | { code: 'reading_output_invalid'; reason: string }
  | { code: 'reading_output_cited_event_memory_must_be_in_reading_citations'; ref: string }
  | { code: 'reading_output_cited_plan_item_must_be_in_reading_citations'; ref: string }
  | { code: 'reading_output_uncited_memory_influence' }
  | { code: 'reading_output_uncited_plan_influence' }
  | { code: 'reading_yuejing_cell_date_must_match_scope_start_date'; index: number; expected: string; received: string }
  | { code: 'reading_shijing_cited_reading_ids_must_match_scope_source_reading_ids' }
  | { code: 'reading_non_shijing_cited_reading_ids_must_be_empty' }
  | { code: 'reading_uncertainty_confidence_invalid'; received: unknown }
  | { code: 'reading_removed_field_present'; field: string };

export type ReadingValidationResult =
  | { ok: true }
  | { ok: false; error: ReadingValidationError };

const MIRROR_KINDS_RUNTIME = new Set<string>(['rijing', 'yuejing', 'nianjing', 'shijing']);
const CONFIDENCE_LEVELS_RUNTIME = new Set<string>(['low', 'medium', 'high']);

function mirrorScopesEqual(a: MirrorScope, b: MirrorScope): boolean {
  if (a.kind !== b.kind) return false;
  if (a.basis_time_zone !== b.basis_time_zone) return false;
  if (a.kind === 'daily' && b.kind === 'daily') {
    return a.date === b.date;
  }
  if (
    (a.kind === 'rolling_30_day' && b.kind === 'rolling_30_day') ||
    (a.kind === 'long_horizon' && b.kind === 'long_horizon')
  ) {
    return a.start_date === b.start_date && a.end_date === b.end_date;
  }
  if (a.kind === 'consultation' && b.kind === 'consultation') {
    if (a.source_reading_ids.length !== b.source_reading_ids.length) return false;
    for (let i = 0; i < a.source_reading_ids.length; i += 1) {
      if (a.source_reading_ids[i] !== b.source_reading_ids[i]) return false;
    }
    const aHasWindow = a.question_window !== undefined;
    const bHasWindow = b.question_window !== undefined;
    if (aHasWindow !== bHasWindow) return false;
    if (a.question_window && b.question_window) {
      return (
        a.question_window.start_date === b.question_window.start_date &&
        a.question_window.end_date === b.question_window.end_date
      );
    }
    return true;
  }
  return false;
}

function arraysEqual<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function validateConcernTagSnapshot(snap: ConcernTagSnapshot): string | null {
  if (typeof snap.id !== 'string' || snap.id.length === 0) return 'id_empty';
  if (typeof snap.label !== 'string' || snap.label.length === 0) return 'label_empty';
  if (snap.status !== 'active' && snap.status !== 'archived') return 'status_invalid';
  if (typeof snap.prompt_text_hash !== 'string' || snap.prompt_text_hash.length === 0) {
    return 'prompt_text_hash_empty';
  }
  if (!ISO_UTC_PATTERN.test(snap.captured_at)) return 'captured_at_not_iso_utc';
  return null;
}

function findRemovedReadingField(reading: Reading): string | null {
  const record = reading as unknown as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (READING_OWNER_SCOPED_REMOVED_FIELDS.has(key)) return key;
  }
  return null;
}

export function validateReading(reading: Reading): ReadingValidationResult {
  if (typeof reading.id !== 'string' || reading.id.length === 0) {
    return { ok: false, error: { code: 'reading_id_empty' } };
  }
  if (!ISO_UTC_PATTERN.test(reading.created_at)) {
    return { ok: false, error: { code: 'reading_created_at_not_iso_utc' } };
  }
  const removedField = findRemovedReadingField(reading);
  if (removedField) {
    return { ok: false, error: { code: 'reading_removed_field_present', field: removedField } };
  }
  if (!MIRROR_KINDS_RUNTIME.has(reading.mirror_kind)) {
    return {
      ok: false,
      error: { code: 'reading_mirror_kind_invalid', received: reading.mirror_kind },
    };
  }
  const scopeCheck = validateMirrorScope(reading.mirror_scope);
  if (!scopeCheck.ok) {
    return { ok: false, error: { code: 'reading_mirror_scope_invalid', reason: scopeCheck.error.code } };
  }
  if (evaluateMirrorKindScope(reading.mirror_kind, reading.mirror_scope) === 'forbidden') {
    return {
      ok: false,
      error: {
        code: 'reading_mirror_kind_scope_forbidden',
        kind: reading.mirror_kind,
        scope: reading.mirror_scope.kind,
      },
    };
  }
  if (!isSelfRef(reading.primary_subject_ref)) {
    return { ok: false, error: { code: 'reading_primary_subject_ref_must_be_self' } };
  }
  for (let i = 0; i < reading.related_person_refs.length; i += 1) {
    const ref = reading.related_person_refs[i]!;
    if (typeof ref !== 'object' || ref === null || ref.kind !== 'person') {
      return { ok: false, error: { code: 'reading_related_person_ref_must_be_person', index: i } };
    }
  }
  for (let i = 0; i < reading.concern_tag_refs.length; i += 1) {
    const ref = reading.concern_tag_refs[i]!;
    if (typeof ref !== 'string' || ref.length === 0) {
      return { ok: false, error: { code: 'reading_concern_tag_ref_empty', index: i } };
    }
  }
  for (let i = 0; i < reading.cited_reading_ids.length; i += 1) {
    const ref = reading.cited_reading_ids[i]!;
    if (typeof ref !== 'string' || ref.length === 0) {
      return { ok: false, error: { code: 'reading_cited_reading_id_empty', index: i } };
    }
  }
  for (let i = 0; i < reading.cited_event_memory_refs.length; i += 1) {
    const ref = reading.cited_event_memory_refs[i]!;
    if (typeof ref !== 'string' || ref.length === 0) {
      return { ok: false, error: { code: 'reading_cited_event_memory_ref_empty', index: i } };
    }
  }
  for (let i = 0; i < reading.cited_plan_item_refs.length; i += 1) {
    const ref = reading.cited_plan_item_refs[i]!;
    if (typeof ref !== 'string' || ref.length === 0) {
      return { ok: false, error: { code: 'reading_cited_plan_item_ref_empty', index: i } };
    }
  }
  if (reading.mirror_kind === 'shijing') {
    if (
      reading.mirror_scope.kind !== 'consultation' ||
      !arraysEqual(reading.cited_reading_ids, reading.mirror_scope.source_reading_ids)
    ) {
      return {
        ok: false,
        error: { code: 'reading_shijing_cited_reading_ids_must_match_scope_source_reading_ids' },
      };
    }
  } else if (reading.cited_reading_ids.length > 0) {
    return { ok: false, error: { code: 'reading_non_shijing_cited_reading_ids_must_be_empty' } };
  }
  const summary = reading.inputs_summary;
  if (!ISO_UTC_PATTERN.test(summary.captured_at)) {
    return { ok: false, error: { code: 'reading_inputs_summary_captured_at_not_iso_utc' } };
  }
  if (summary.contract_version !== SJG_ASTRO_CONTRACT_VERSION) {
    return {
      ok: false,
      error: {
        code: 'reading_inputs_summary_contract_version_mismatch',
        received: summary.contract_version,
      },
    };
  }
  if (summary.algorithm_contract_version !== SJG_ALGO_CONTRACT_VERSION) {
    return {
      ok: false,
      error: {
        code: 'reading_inputs_summary_algorithm_contract_version_mismatch',
        received: summary.algorithm_contract_version,
      },
    };
  }
  if (!isAdmittedMethodProfileId(summary.method_profile.id)) {
    return {
      ok: false,
      error: {
        code: 'reading_inputs_summary_method_profile_id_mismatch',
        received: summary.method_profile.id,
      },
    };
  }
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
  // SJG-ALGO-11/12 — integrity: recompute the canonical hash from the persisted
  // feature_snapshot and fail closed on drift. Catches tampering/corruption of a
  // stored Reading where snapshot and recorded hash no longer agree. Runs at
  // generation (consistent → passes) and on load (the real guard).
  if (computeCanonicalHash(summary.feature_snapshot) !== summary.feature_snapshot_hash) {
    return { ok: false, error: { code: 'reading_inputs_summary_feature_snapshot_hash_mismatch' } };
  }
  if (summary.feature_snapshot.mirror_kind !== reading.mirror_kind) {
    return {
      ok: false,
      error: { code: 'reading_inputs_summary_feature_snapshot_mirror_kind_mismatch' },
    };
  }
  if (summary.feature_snapshot.canonical_window.basis_time_zone !== reading.mirror_scope.basis_time_zone) {
    return {
      ok: false,
      error: { code: 'reading_inputs_summary_feature_snapshot_canonical_window_mismatch' },
    };
  }
  if (summary.feature_snapshot.canonical_window.scope_kind !== reading.mirror_scope.kind) {
    return {
      ok: false,
      error: { code: 'reading_inputs_summary_feature_snapshot_canonical_window_mismatch' },
    };
  }
  if (summary.mirror_context_snapshot.mirror_kind !== reading.mirror_kind) {
    return { ok: false, error: { code: 'reading_inputs_summary_mirror_context_mirror_kind_mismatch' } };
  }
  if (!mirrorScopesEqual(summary.mirror_context_snapshot.mirror_scope, reading.mirror_scope)) {
    return { ok: false, error: { code: 'reading_inputs_summary_mirror_context_mirror_scope_mismatch' } };
  }
  if (
    typeof summary.mirror_context_snapshot.response_preferences_hash !== 'string' ||
    summary.mirror_context_snapshot.response_preferences_hash.length === 0
  ) {
    return {
      ok: false,
      error: { code: 'reading_inputs_summary_mirror_context_response_preferences_hash_invalid' },
    };
  }
  for (let i = 0; i < summary.mirror_context_snapshot.active_concern_tags.length; i += 1) {
    const snapshot = summary.mirror_context_snapshot.active_concern_tags[i]!;
    const reason = validateConcernTagSnapshot(snapshot);
    if (reason) {
      return {
        ok: false,
        error: {
          code: 'reading_inputs_summary_mirror_context_concern_tag_snapshot_invalid',
          index: i,
          reason,
        },
      };
    }
  }
  if (reading.output.mirror_kind !== reading.mirror_kind) {
    return {
      ok: false,
      error: { code: 'reading_output_mirror_kind_mismatch', received: reading.output.mirror_kind },
    };
  }
  const outputCheck = validateMirrorOutput(reading.output);
  if (!outputCheck.ok) {
    return { ok: false, error: { code: 'reading_output_invalid', reason: outputCheck.error.code } };
  }
  if (
    reading.mirror_kind === 'yuejing' &&
    reading.mirror_scope.kind === 'rolling_30_day' &&
    reading.output.mirror_kind === 'yuejing'
  ) {
    for (let i = 0; i < reading.output.cells.length; i += 1) {
      const cell = reading.output.cells[i]!;
      if (cell.date !== reading.mirror_scope.start_date) {
        return {
          ok: false,
          error: {
            code: 'reading_yuejing_cell_date_must_match_scope_start_date',
            index: i,
            expected: reading.mirror_scope.start_date,
            received: cell.date,
          },
        };
      }
    }
  }
  const readingMemoryRefs = new Set(reading.cited_event_memory_refs);
  const readingPlanRefs = new Set(reading.cited_plan_item_refs);
  const outputMemoryRefs: readonly string[] = (reading.output as Extract<MirrorOutput, { cited_event_memory_refs: readonly string[] }>).cited_event_memory_refs;
  const outputPlanRefs: readonly string[] = (reading.output as Extract<MirrorOutput, { cited_plan_item_refs: readonly string[] }>).cited_plan_item_refs;
  for (const ref of outputMemoryRefs) {
    if (!readingMemoryRefs.has(ref)) {
      return {
        ok: false,
        error: { code: 'reading_output_cited_event_memory_must_be_in_reading_citations', ref },
      };
    }
  }
  for (const ref of outputPlanRefs) {
    if (!readingPlanRefs.has(ref)) {
      return {
        ok: false,
        error: { code: 'reading_output_cited_plan_item_must_be_in_reading_citations', ref },
      };
    }
  }
  if (reading.cited_event_memory_refs.length > 0 && outputMemoryRefs.length === 0) {
    return { ok: false, error: { code: 'reading_output_uncited_memory_influence' } };
  }
  if (reading.cited_plan_item_refs.length > 0 && outputPlanRefs.length === 0) {
    return { ok: false, error: { code: 'reading_output_uncited_plan_influence' } };
  }
  if (!CONFIDENCE_LEVELS_RUNTIME.has(reading.uncertainty.confidence)) {
    return {
      ok: false,
      error: {
        code: 'reading_uncertainty_confidence_invalid',
        received: reading.uncertainty.confidence,
      },
    };
  }
  // Force shape check on related person refs to subject_ref helpers (no-op
  // unless they collapse to 'self' which is forbidden above).
  for (const ref of reading.related_person_refs) {
    if (subjectRefEquals(ref, 'self')) {
      return { ok: false, error: { code: 'reading_related_person_ref_must_be_person', index: 0 } };
    }
  }
  return { ok: true };
}
