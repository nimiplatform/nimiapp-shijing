// SJG-DATA-02 — ShiJingSpace validator.
//
// Cross-entity invariants and runtime removed-surface fail-close. The guard
// uses exact-symbol matching; admitted v1 names (EventMemory / PlanItem /
// ConcernTag and their plural/refs) live in the allowlist defined in
// `removed-surfaces.ts` so the new domain entities cannot accidentally be
// classified as removed.

import type { ShiJingSpace } from '../domain/shijing-space.ts';
import { PERSON_RELATION_MAX_LENGTH } from '../domain/person.ts';
import { isPersonRef, isSelfRef, type SubjectRef } from '../domain/subject-ref.ts';
import { validateConcernTagCollection } from './concern-tag-validator.ts';
import { validateConversation } from './conversation-validator.ts';
import { validateEventMemoryCollection } from './event-memory-validator.ts';
import { validateNatalInputs } from './natal-inputs-validator.ts';
import { validatePlanItemCollection } from './plan-item-validator.ts';
import { validateReading } from './reading-validator.ts';
import { isAdmittedSurfaceName, REMOVED_SURFACE_NAMES } from './removed-surfaces.ts';
import { validateSettings } from './settings-validator.ts';

const ALLOWED_CONSENT_STATES = new Set(['owner_recorded', 'subject_consented', 'withheld']);

export type ShijingSpaceValidationError =
  | { code: 'space_shape_invalid'; field: string; expected: string }
  | { code: 'space_persons_duplicate_id'; id: string }
  | { code: 'space_person_id_empty' }
  | { code: 'space_person_kind_invalid'; received: unknown }
  | { code: 'space_person_consent_state_invalid'; received: unknown }
  | { code: 'space_person_relation_invalid'; person_id: string }
  | { code: 'space_subject_ref_unresolvable'; ref: SubjectRef; via: string }
  | { code: 'space_concern_tags_invalid'; reason: string }
  | { code: 'space_event_memories_invalid'; reason: string }
  | { code: 'space_event_memory_concern_tag_ref_unresolvable'; event_memory_id: string; concern_tag_id: string }
  | { code: 'space_plan_items_invalid'; reason: string }
  | { code: 'space_plan_item_concern_tag_ref_unresolvable'; plan_item_id: string; concern_tag_id: string }
  | { code: 'space_readings_duplicate_id'; id: string }
  | { code: 'space_reading_invalid'; reading_id: string; reason: string }
  | { code: 'space_reading_concern_tag_ref_unresolvable'; reading_id: string; concern_tag_id: string }
  | { code: 'space_reading_cited_event_memory_unresolvable'; reading_id: string; ref: string }
  | { code: 'space_reading_cited_plan_item_unresolvable'; reading_id: string; ref: string }
  | { code: 'space_reading_cited_reading_unresolvable'; reading_id: string; ref: string }
  | { code: 'space_reading_related_person_ref_unresolvable'; reading_id: string; person_id: string }
  | { code: 'space_conversations_duplicate_id'; id: string }
  | { code: 'space_conversation_invalid'; conversation_id: string; reason: string }
  | { code: 'space_conversation_source_reading_unresolvable'; conversation_id: string; reading_id: string }
  | { code: 'space_conversation_turn_cited_reading_unresolvable'; conversation_id: string; turn_id: string; ref: string }
  | { code: 'space_conversation_turn_cited_event_memory_unresolvable'; conversation_id: string; turn_id: string; ref: string }
  | { code: 'space_conversation_turn_cited_plan_item_unresolvable'; conversation_id: string; turn_id: string; ref: string }
  | { code: 'space_self_subject_natal_inputs_invalid'; reason: string }
  | { code: 'space_person_natal_inputs_invalid'; person_id: string; reason: string }
  | { code: 'space_settings_invalid'; reason: string }
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
    if (isAdmittedSurfaceName(key)) continue;
    if (REMOVED_SURFACE_NAMES.has(key)) return key;
  }
  return null;
}

export function validateShiJingSpace(input: unknown): ShijingSpaceValidationResult {
  try {
    return validateShiJingSpaceUnchecked(input);
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'space_shape_invalid',
        field: 'space',
        expected: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

function validateShiJingSpaceUnchecked(input: unknown): ShijingSpaceValidationResult {
  const spaceRecord = asRecord(input);
  if (!spaceRecord) {
    return invalidShape('space', 'object');
  }
  const space = input as ShiJingSpace;
  const removedRootKey = findRemovedKey(spaceRecord);
  if (removedRootKey) {
    return {
      ok: false,
      error: { code: 'space_removed_field_present', container: 'space', field: removedRootKey },
    };
  }
  const settingsRecord = asRecord(space.settings);
  if (!settingsRecord) {
    return invalidShape('settings', 'object');
  }
  const removedSettingsKey = findRemovedKey(settingsRecord);
  if (removedSettingsKey) {
    return {
      ok: false,
      error: { code: 'space_removed_field_present', container: 'settings', field: removedSettingsKey },
    };
  }
  if (!asRecord(space.self_subject)) {
    return invalidShape('self_subject', 'object');
  }
  for (const field of [
    'persons',
    'concern_tags',
    'event_memories',
    'plan_items',
    'readings',
    'conversations',
  ] as const) {
    if (!Array.isArray(space[field])) {
      return invalidShape(field, 'array');
    }
  }
  // SJG-DATA-09 / SJG-ALGO-01 — Settings content (method_profile_id admission +
  // response-preference enums), not just removed-surface keys.
  const settingsCheck = validateSettings(space.settings);
  if (!settingsCheck.ok) {
    return { ok: false, error: { code: 'space_settings_invalid', reason: settingsCheck.error.code } };
  }
  const selfNatalCheck = validateNatalInputs(space.self_subject.natal_inputs);
  if (!selfNatalCheck.ok) {
    return {
      ok: false,
      error: { code: 'space_self_subject_natal_inputs_invalid', reason: selfNatalCheck.error.code },
    };
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
      return {
        ok: false,
        error: { code: 'space_person_consent_state_invalid', received: person.consent_state },
      };
    }
    // `relation` is an optional bounded display label (SJG-DATA-03): when
    // present it must be a string within the length cap — never parsed further.
    if (person.relation !== undefined) {
      if (typeof person.relation !== 'string' || person.relation.length > PERSON_RELATION_MAX_LENGTH) {
        return { ok: false, error: { code: 'space_person_relation_invalid', person_id: person.id } };
      }
    }
    const personNatalCheck = validateNatalInputs(person.natal_inputs);
    if (!personNatalCheck.ok) {
      return {
        ok: false,
        error: {
          code: 'space_person_natal_inputs_invalid',
          person_id: person.id,
          reason: personNatalCheck.error.code,
        },
      };
    }
    personIds.add(person.id);
  }
  const concernCheck = validateConcernTagCollection(space.concern_tags);
  if (!concernCheck.ok) {
    return { ok: false, error: { code: 'space_concern_tags_invalid', reason: concernCheck.error.code } };
  }
  const concernTagIds = new Set<string>();
  for (const tag of space.concern_tags) {
    concernTagIds.add(tag.id);
    for (const mention of tag.mention_refs) {
      if (mention.resolved_subject_ref && !subjectExistsInSpace(mention.resolved_subject_ref, personIds)) {
        return {
          ok: false,
          error: {
            code: 'space_subject_ref_unresolvable',
            ref: mention.resolved_subject_ref,
            via: `concern_tag:${tag.id}:mention:${mention.token}`,
          },
        };
      }
    }
  }
  const memoryCheck = validateEventMemoryCollection(space.event_memories);
  if (!memoryCheck.ok) {
    return { ok: false, error: { code: 'space_event_memories_invalid', reason: memoryCheck.error.code } };
  }
  const eventMemoryIds = new Set<string>();
  for (const memory of space.event_memories) {
    eventMemoryIds.add(memory.id);
    for (const personRef of memory.person_refs) {
      if (!subjectExistsInSpace(personRef, personIds)) {
        return {
          ok: false,
          error: {
            code: 'space_subject_ref_unresolvable',
            ref: personRef,
            via: `event_memory:${memory.id}:person_refs`,
          },
        };
      }
    }
    for (const concernTagId of memory.concern_tag_refs) {
      if (!concernTagIds.has(concernTagId)) {
        return {
          ok: false,
          error: {
            code: 'space_event_memory_concern_tag_ref_unresolvable',
            event_memory_id: memory.id,
            concern_tag_id: concernTagId,
          },
        };
      }
    }
  }
  const planCheck = validatePlanItemCollection(space.plan_items);
  if (!planCheck.ok) {
    return { ok: false, error: { code: 'space_plan_items_invalid', reason: planCheck.error.code } };
  }
  const planItemIds = new Set<string>();
  for (const plan of space.plan_items) {
    planItemIds.add(plan.id);
    for (const personRef of plan.person_refs) {
      if (!subjectExistsInSpace(personRef, personIds)) {
        return {
          ok: false,
          error: {
            code: 'space_subject_ref_unresolvable',
            ref: personRef,
            via: `plan_item:${plan.id}:person_refs`,
          },
        };
      }
    }
    for (const concernTagId of plan.concern_tag_refs) {
      if (!concernTagIds.has(concernTagId)) {
        return {
          ok: false,
          error: {
            code: 'space_plan_item_concern_tag_ref_unresolvable',
            plan_item_id: plan.id,
            concern_tag_id: concernTagId,
          },
        };
      }
    }
  }
  const readingIds = new Set<string>();
  for (const reading of space.readings) {
    if (readingIds.has(reading.id)) {
      return { ok: false, error: { code: 'space_readings_duplicate_id', id: reading.id } };
    }
    readingIds.add(reading.id);
    const check = validateReading(reading);
    if (!check.ok) {
      return {
        ok: false,
        error: { code: 'space_reading_invalid', reading_id: reading.id, reason: check.error.code },
      };
    }
    for (const ref of reading.related_person_refs) {
      if (!isPersonRef(ref) || !personIds.has(ref.id)) {
        return {
          ok: false,
          error: {
            code: 'space_reading_related_person_ref_unresolvable',
            reading_id: reading.id,
            person_id: isPersonRef(ref) ? ref.id : '',
          },
        };
      }
    }
    for (const concernTagId of reading.concern_tag_refs) {
      if (!concernTagIds.has(concernTagId)) {
        return {
          ok: false,
          error: {
            code: 'space_reading_concern_tag_ref_unresolvable',
            reading_id: reading.id,
            concern_tag_id: concernTagId,
          },
        };
      }
    }
    for (const ref of reading.cited_event_memory_refs) {
      if (!eventMemoryIds.has(ref)) {
        return {
          ok: false,
          error: { code: 'space_reading_cited_event_memory_unresolvable', reading_id: reading.id, ref },
        };
      }
    }
    for (const ref of reading.cited_plan_item_refs) {
      if (!planItemIds.has(ref)) {
        return {
          ok: false,
          error: { code: 'space_reading_cited_plan_item_unresolvable', reading_id: reading.id, ref },
        };
      }
    }
    for (const ref of reading.cited_reading_ids) {
      if (!readingIds.has(ref) && reading.id !== ref) {
        return {
          ok: false,
          error: { code: 'space_reading_cited_reading_unresolvable', reading_id: reading.id, ref },
        };
      }
    }
  }
  const conversationIds = new Set<string>();
  for (const conversation of space.conversations) {
    if (conversationIds.has(conversation.id)) {
      return { ok: false, error: { code: 'space_conversations_duplicate_id', id: conversation.id } };
    }
    conversationIds.add(conversation.id);
    const check = validateConversation(conversation);
    if (!check.ok) {
      return {
        ok: false,
        error: {
          code: 'space_conversation_invalid',
          conversation_id: conversation.id,
          reason: check.error.code,
        },
      };
    }
    for (const ref of conversation.source_reading_ids) {
      if (!readingIds.has(ref)) {
        return {
          ok: false,
          error: {
            code: 'space_conversation_source_reading_unresolvable',
            conversation_id: conversation.id,
            reading_id: ref,
          },
        };
      }
    }
    for (const turn of conversation.turns) {
      for (const ref of turn.cited_reading_ids) {
        if (!readingIds.has(ref)) {
          return {
            ok: false,
            error: {
              code: 'space_conversation_turn_cited_reading_unresolvable',
              conversation_id: conversation.id,
              turn_id: turn.id,
              ref,
            },
          };
        }
      }
      for (const ref of turn.cited_event_memory_refs) {
        if (!eventMemoryIds.has(ref)) {
          return {
            ok: false,
            error: {
              code: 'space_conversation_turn_cited_event_memory_unresolvable',
              conversation_id: conversation.id,
              turn_id: turn.id,
              ref,
            },
          };
        }
      }
      for (const ref of turn.cited_plan_item_refs) {
        if (!planItemIds.has(ref)) {
          return {
            ok: false,
            error: {
              code: 'space_conversation_turn_cited_plan_item_unresolvable',
              conversation_id: conversation.id,
              turn_id: turn.id,
              ref,
            },
          };
        }
      }
    }
  }
  return { ok: true };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function invalidShape(field: string, expected: string): ShijingSpaceValidationResult {
  return {
    ok: false,
    error: { code: 'space_shape_invalid', field, expected },
  };
}
