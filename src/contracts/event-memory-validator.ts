// SJG-DATA-05 — EventMemory validator.

import {
  EVENT_MEMORY_ADMISSIBLE_USES,
  EVENT_MEMORY_SOURCES,
  type EventMemory,
} from '../domain/event-memory.ts';
import { REMOVED_SURFACE_NAMES, isRemovedSurfaceName } from './removed-surfaces.ts';
import { validateSubjectRef } from './subject-ref-validator.ts';

const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

const FORBIDDEN_EVENT_MEMORY_FIELDS: readonly string[] = [
  'view_refs',
  'recap',
  'task_status',
  'due',
  'due_date',
  'overdue',
  'deadline',
  'priority',
  'dependency',
  'progress',
  'workflow',
];

export type EventMemoryValidationError =
  | { code: 'event_memory_id_empty' }
  | { code: 'event_memory_occurred_at_not_iso_utc' }
  | { code: 'event_memory_created_at_not_iso_utc' }
  | { code: 'event_memory_updated_at_not_iso_utc' }
  | { code: 'event_memory_body_empty' }
  | { code: 'event_memory_source_invalid'; received: unknown }
  | { code: 'event_memory_admissible_use_invalid'; received: unknown }
  | { code: 'event_memory_person_ref_invalid'; index: number; reason: string }
  | { code: 'event_memory_concern_tag_ref_empty'; index: number }
  | { code: 'event_memory_forbidden_field_present'; field: string }
  | { code: 'event_memory_removed_field_present'; field: string };

export type EventMemoryValidationResult =
  | { ok: true }
  | { ok: false; error: EventMemoryValidationError };

export function validateEventMemory(memory: EventMemory): EventMemoryValidationResult {
  if (typeof memory.id !== 'string' || memory.id.length === 0) {
    return { ok: false, error: { code: 'event_memory_id_empty' } };
  }
  if (!ISO_UTC_PATTERN.test(memory.occurred_at)) {
    return { ok: false, error: { code: 'event_memory_occurred_at_not_iso_utc' } };
  }
  if (!ISO_UTC_PATTERN.test(memory.created_at)) {
    return { ok: false, error: { code: 'event_memory_created_at_not_iso_utc' } };
  }
  if (!ISO_UTC_PATTERN.test(memory.updated_at)) {
    return { ok: false, error: { code: 'event_memory_updated_at_not_iso_utc' } };
  }
  if (typeof memory.body !== 'string' || memory.body.length === 0) {
    return { ok: false, error: { code: 'event_memory_body_empty' } };
  }
  if (!EVENT_MEMORY_SOURCES.includes(memory.source)) {
    return { ok: false, error: { code: 'event_memory_source_invalid', received: memory.source } };
  }
  if (!EVENT_MEMORY_ADMISSIBLE_USES.includes(memory.admissible_use)) {
    return {
      ok: false,
      error: { code: 'event_memory_admissible_use_invalid', received: memory.admissible_use },
    };
  }
  for (let i = 0; i < memory.person_refs.length; i += 1) {
    const refCheck = validateSubjectRef(memory.person_refs[i]);
    if (!refCheck.ok) {
      return {
        ok: false,
        error: {
          code: 'event_memory_person_ref_invalid',
          index: i,
          reason: refCheck.error.code,
        },
      };
    }
  }
  for (let i = 0; i < memory.concern_tag_refs.length; i += 1) {
    const ref = memory.concern_tag_refs[i]!;
    if (typeof ref !== 'string' || ref.length === 0) {
      return { ok: false, error: { code: 'event_memory_concern_tag_ref_empty', index: i } };
    }
  }
  const record = memory as unknown as Record<string, unknown>;
  for (const field of FORBIDDEN_EVENT_MEMORY_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(record, field)) {
      return { ok: false, error: { code: 'event_memory_forbidden_field_present', field } };
    }
  }
  for (const key of Object.keys(record)) {
    if (key === 'event' || key === 'events') {
      return { ok: false, error: { code: 'event_memory_removed_field_present', field: key } };
    }
    if (isRemovedSurfaceName(key) && REMOVED_SURFACE_NAMES.has(key)) {
      return { ok: false, error: { code: 'event_memory_removed_field_present', field: key } };
    }
  }
  return { ok: true };
}

export type EventMemoryCollectionValidationError =
  | { code: 'event_memories_duplicate_id'; id: string }
  | { code: 'event_memory_invalid'; id: string; reason: string };

export type EventMemoryCollectionValidationResult =
  | { ok: true }
  | { ok: false; error: EventMemoryCollectionValidationError };

export function validateEventMemoryCollection(
  memories: readonly EventMemory[],
): EventMemoryCollectionValidationResult {
  const seen = new Set<string>();
  for (const memory of memories) {
    const check = validateEventMemory(memory);
    if (!check.ok) {
      return { ok: false, error: { code: 'event_memory_invalid', id: memory.id, reason: check.error.code } };
    }
    if (seen.has(memory.id)) {
      return { ok: false, error: { code: 'event_memories_duplicate_id', id: memory.id } };
    }
    seen.add(memory.id);
  }
  return { ok: true };
}
