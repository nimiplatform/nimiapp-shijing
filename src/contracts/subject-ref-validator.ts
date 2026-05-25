// SJG-DATA-01 — SubjectRef validator.

import type { SubjectRef } from '../domain/subject-ref.ts';

export type SubjectRefValidationError =
  | { code: 'subject_ref_null_or_undefined' }
  | { code: 'subject_ref_invalid_self_string'; value: string }
  | { code: 'subject_ref_invalid_kind'; received: unknown }
  | { code: 'subject_ref_invalid_person_id'; received: unknown }
  | { code: 'subject_ref_extra_property'; property: string };

export type SubjectRefValidationResult =
  | { ok: true; ref: SubjectRef }
  | { ok: false; error: SubjectRefValidationError };

const ALLOWED_PERSON_PROPERTIES = new Set(['kind', 'id']);

export function validateSubjectRef(input: unknown): SubjectRefValidationResult {
  if (input === null || input === undefined) {
    return { ok: false, error: { code: 'subject_ref_null_or_undefined' } };
  }
  if (typeof input === 'string') {
    if (input !== 'self') {
      return { ok: false, error: { code: 'subject_ref_invalid_self_string', value: input } };
    }
    return { ok: true, ref: 'self' };
  }
  if (typeof input !== 'object') {
    return { ok: false, error: { code: 'subject_ref_invalid_kind', received: input } };
  }
  const record = input as Record<string, unknown>;
  if (record.kind !== 'person') {
    return { ok: false, error: { code: 'subject_ref_invalid_kind', received: record.kind } };
  }
  if (typeof record.id !== 'string' || record.id.length === 0) {
    return { ok: false, error: { code: 'subject_ref_invalid_person_id', received: record.id } };
  }
  for (const property of Object.keys(record)) {
    if (!ALLOWED_PERSON_PROPERTIES.has(property)) {
      return { ok: false, error: { code: 'subject_ref_extra_property', property } };
    }
  }
  return { ok: true, ref: { kind: 'person', id: record.id } };
}
