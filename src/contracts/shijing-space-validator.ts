// SJG-DATA-02 + SJG-DATA-11 — ShiJingSpace validator (cross-entity
// invariants plus runtime removed-surface fail-close).

import type { ShiJingSpace } from '../domain/shijing-space.ts';
import { isPersonRef, isSelfRef, subjectRefEquals, type SubjectRef } from '../domain/subject-ref.ts';
import { validateView } from './view-validator.ts';
import { validateReading } from './reading-validator.ts';
import { validateNatalInputs } from './natal-inputs-validator.ts';
import { validateEvent } from './event-validator.ts';
import { REMOVED_SURFACE_NAMES } from './removed-surfaces.ts';

export type ShijingSpaceValidationError =
  | { code: 'space_persons_duplicate_id'; id: string }
  | { code: 'space_person_id_empty' }
  | { code: 'space_person_kind_invalid'; received: unknown }
  | { code: 'space_person_consent_state_invalid'; received: unknown }
  | { code: 'space_subject_ref_unresolvable'; ref: SubjectRef; via: string }
  | { code: 'space_relation_self_loop'; relation_id: string }
  | { code: 'space_view_invalid'; view_id: string; reason: string }
  | { code: 'space_reading_invalid'; reading_id: string; reason: string }
  | { code: 'space_event_invalid'; event_id: string; reason: string }
  | { code: 'space_event_view_ref_unresolvable'; event_id: string; view_id: string }
  | { code: 'space_conversation_view_id_unresolvable'; conversation_id: string; view_id: string }
  | { code: 'space_reading_view_id_unresolvable'; reading_id: string; view_id: string }
  | { code: 'space_self_subject_natal_inputs_invalid'; reason: string }
  | { code: 'space_person_natal_inputs_invalid'; person_id: string; reason: string }
  | { code: 'space_removed_field_present'; container: 'space' | 'settings'; field: string };

export type ShijingSpaceValidationResult =
  | { ok: true }
  | { ok: false; error: ShijingSpaceValidationError };

function subjectExistsInSpace(ref: SubjectRef, personIds: ReadonlySet<string>): boolean {
  if (isSelfRef(ref)) return true;
  if (isPersonRef(ref)) return personIds.has(ref.id);
  return false;
}

function findRemovedKey(record: Record<string, unknown>): string | null {
  for (const key of Object.keys(record)) {
    if (REMOVED_SURFACE_NAMES.has(key)) return key;
  }
  return null;
}

const ALLOWED_CONSENT_STATES = new Set(['owner_recorded', 'subject_consented', 'withheld']);

export function validateShiJingSpace(space: ShiJingSpace): ShijingSpaceValidationResult {
  const spaceRecord = space as unknown as Record<string, unknown>;
  const removedRootKey = findRemovedKey(spaceRecord);
  if (removedRootKey) {
    return { ok: false, error: { code: 'space_removed_field_present', container: 'space', field: removedRootKey } };
  }
  const settingsRecord = space.settings as unknown as Record<string, unknown>;
  const removedSettingsKey = findRemovedKey(settingsRecord);
  if (removedSettingsKey) {
    return { ok: false, error: { code: 'space_removed_field_present', container: 'settings', field: removedSettingsKey } };
  }
  const selfNatalCheck = validateNatalInputs(space.self_subject.natal_inputs);
  if (!selfNatalCheck.ok) {
    return { ok: false, error: { code: 'space_self_subject_natal_inputs_invalid', reason: selfNatalCheck.error.code } };
  }
  const personIds = new Set<string>();
  for (const person of space.persons) {
    if (!person.id || person.id.length === 0) {
      return { ok: false, error: { code: 'space_person_id_empty' } };
    }
    if (personIds.has(person.id)) {
      return { ok: false, error: { code: 'space_persons_duplicate_id', id: person.id } };
    }
    if (person.kind !== 'person') {
      return { ok: false, error: { code: 'space_person_kind_invalid', received: person.kind } };
    }
    if (!ALLOWED_CONSENT_STATES.has(person.consent_state)) {
      return { ok: false, error: { code: 'space_person_consent_state_invalid', received: person.consent_state } };
    }
    const personNatalCheck = validateNatalInputs(person.natal_inputs);
    if (!personNatalCheck.ok) {
      return { ok: false, error: { code: 'space_person_natal_inputs_invalid', person_id: person.id, reason: personNatalCheck.error.code } };
    }
    personIds.add(person.id);
  }
  for (const relation of space.relations) {
    if (!subjectExistsInSpace(relation.from_subject, personIds)) {
      return {
        ok: false,
        error: { code: 'space_subject_ref_unresolvable', ref: relation.from_subject, via: `relation:${relation.id}:from` },
      };
    }
    if (!subjectExistsInSpace(relation.to_subject, personIds)) {
      return {
        ok: false,
        error: { code: 'space_subject_ref_unresolvable', ref: relation.to_subject, via: `relation:${relation.id}:to` },
      };
    }
    if (subjectRefEquals(relation.from_subject, relation.to_subject)) {
      return { ok: false, error: { code: 'space_relation_self_loop', relation_id: relation.id } };
    }
  }
  const viewIds = new Set<string>();
  for (const view of space.views) {
    viewIds.add(view.id);
    for (const subject of view.subjects) {
      if (!subjectExistsInSpace(subject, personIds)) {
        return {
          ok: false,
          error: { code: 'space_subject_ref_unresolvable', ref: subject, via: `view:${view.id}:subjects` },
        };
      }
    }
    if (!subjectExistsInSpace(view.anchor_subject, personIds)) {
      return {
        ok: false,
        error: { code: 'space_subject_ref_unresolvable', ref: view.anchor_subject, via: `view:${view.id}:anchor` },
      };
    }
    const viewCheck = validateView(view);
    if (!viewCheck.ok) {
      return { ok: false, error: { code: 'space_view_invalid', view_id: view.id, reason: viewCheck.error.code } };
    }
  }
  for (const event of space.events) {
    if (!subjectExistsInSpace(event.primary_subject, personIds)) {
      return {
        ok: false,
        error: { code: 'space_subject_ref_unresolvable', ref: event.primary_subject, via: `event:${event.id}:primary_subject` },
      };
    }
    for (const participant of event.participants) {
      if (!subjectExistsInSpace(participant, personIds)) {
        return {
          ok: false,
          error: { code: 'space_subject_ref_unresolvable', ref: participant, via: `event:${event.id}:participants` },
        };
      }
    }
    for (const viewRef of event.view_refs) {
      if (!viewIds.has(viewRef)) {
        return { ok: false, error: { code: 'space_event_view_ref_unresolvable', event_id: event.id, view_id: viewRef } };
      }
    }
    const eventCheck = validateEvent(event);
    if (!eventCheck.ok) {
      return { ok: false, error: { code: 'space_event_invalid', event_id: event.id, reason: eventCheck.error.code } };
    }
  }
  for (const reading of space.readings) {
    for (const subject of reading.subjects) {
      if (!subjectExistsInSpace(subject, personIds)) {
        return {
          ok: false,
          error: { code: 'space_subject_ref_unresolvable', ref: subject, via: `reading:${reading.id}:subjects` },
        };
      }
    }
    if (!subjectExistsInSpace(reading.anchor_subject, personIds)) {
      return {
        ok: false,
        error: { code: 'space_subject_ref_unresolvable', ref: reading.anchor_subject, via: `reading:${reading.id}:anchor` },
      };
    }
    if (reading.scope === 'view') {
      if (!reading.view_id || !viewIds.has(reading.view_id)) {
        return {
          ok: false,
          error: { code: 'space_reading_view_id_unresolvable', reading_id: reading.id, view_id: reading.view_id ?? '' },
        };
      }
    }
    const readingCheck = validateReading(reading);
    if (!readingCheck.ok) {
      return {
        ok: false,
        error: { code: 'space_reading_invalid', reading_id: reading.id, reason: readingCheck.error.code },
      };
    }
  }
  for (const conversation of space.conversations) {
    if (!subjectExistsInSpace(conversation.subject_anchor, personIds)) {
      return {
        ok: false,
        error: { code: 'space_subject_ref_unresolvable', ref: conversation.subject_anchor, via: `conversation:${conversation.id}` },
      };
    }
    if (conversation.view_id && !viewIds.has(conversation.view_id)) {
      return {
        ok: false,
        error: { code: 'space_conversation_view_id_unresolvable', conversation_id: conversation.id, view_id: conversation.view_id },
      };
    }
  }
  return { ok: true };
}
