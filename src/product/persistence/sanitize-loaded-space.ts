// Pre-release hard-cut recovery for persisted ShiJingSpace.
//
// The SJG-FEATURE-v2 envelope refactor changed the persisted Reading shape
// (method_evidence + common, renamed method ids). Readings written under the old
// schema fail validateReading and would fail the whole space load
// (space_reading_invalid). The IndexedDB backend hard-cuts via a version bump;
// the runtime app-storage backend (on disk) does not, so we recover on load by
// making the space pass validateShiJingSpace again:
//
//   - drop Readings that fail current validation (try/catch: a structurally
//     malformed Reading must be dropped, never crash the load);
//   - drop Readings whose cross-entity refs (person / concern tag / memory /
//     plan / cited Reading) no longer resolve — the space validator enforces
//     these too, so a per-Reading check alone leaves orphans that re-fail load;
//   - drop any Conversation that cites a dropped Reading;
//   - reset a method_profile_id that is no longer admitted to the default.
//
// Readings are regenerable. On the next save the sanitized space overwrites the
// stale one, so this self-heals.

import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import type { Reading } from '../../domain/reading.ts';
import type { Conversation } from '../../domain/conversation.ts';
import { isAdmittedMethodProfileId } from '../../domain/algorithm.ts';
import { isPersonRef } from '../../domain/subject-ref.ts';
import { validateReading } from '../../contracts/reading-validator.ts';

export interface SanitizeResult {
  readonly space: ShiJingSpace;
  readonly dropped_readings: number;
  readonly dropped_conversations: number;
  readonly repaired_settings: boolean;
}

function idSet(items: unknown, key: 'id'): Set<string> {
  const out = new Set<string>();
  if (Array.isArray(items)) {
    for (const item of items) {
      const id = (item as Record<string, unknown>)?.[key];
      if (typeof id === 'string') out.add(id);
    }
  }
  return out;
}

interface ResolveSets {
  readonly persons: Set<string>;
  readonly concernTags: Set<string>;
  readonly memories: Set<string>;
  readonly plans: Set<string>;
}

// A Reading is loadable iff it passes current validation AND every cross-entity
// ref resolves in the space. validateReading is wrapped: a malformed Reading
// (e.g. missing inputs_summary) throws on property access and must be dropped.
function readingLoadable(reading: Reading, sets: ResolveSets): boolean {
  let valid: boolean;
  try {
    valid = validateReading(reading).ok;
  } catch {
    // A structurally malformed Reading throws on property access → drop it.
    valid = false;
  }
  if (!valid) return false;
  if (!Array.isArray(reading.related_person_refs) || !Array.isArray(reading.concern_tag_refs)) return false;
  if (!reading.related_person_refs.every((ref) => isPersonRef(ref) && sets.persons.has(ref.id))) return false;
  if (!reading.concern_tag_refs.every((ref) => sets.concernTags.has(ref))) return false;
  if (!reading.cited_event_memory_refs.every((ref) => sets.memories.has(ref))) return false;
  if (!reading.cited_plan_item_refs.every((ref) => sets.plans.has(ref))) return false;
  return true;
}

export function dropIncompatibleReadings(space: ShiJingSpace): SanitizeResult {
  if (!space || !Array.isArray(space.readings)) {
    return { space, dropped_readings: 0, dropped_conversations: 0, repaired_settings: false };
  }
  const sourceReadings = space.readings as readonly Reading[];
  const sets: ResolveSets = {
    persons: idSet(space.persons, 'id'),
    concernTags: idSet(space.concern_tags, 'id'),
    memories: idSet(space.event_memories, 'id'),
    plans: idSet(space.plan_items, 'id'),
  };

  let readings = sourceReadings.filter((reading) => readingLoadable(reading, sets));
  // Cascade: a surviving Reading that cites a dropped Reading (e.g. a ShiJing
  // consultation grounded in retired sources) can no longer resolve its refs.
  for (;;) {
    const ids = new Set(readings.map((r) => r.id));
    const next = readings.filter((r) => r.cited_reading_ids.every((ref) => ref === r.id || ids.has(ref)));
    if (next.length === readings.length) break;
    readings = next;
  }

  const survivingIds = new Set(readings.map((r) => r.id));
  const sourceConversations: readonly Conversation[] = Array.isArray(space.conversations)
    ? (space.conversations as readonly Conversation[])
    : [];
  const conversations = sourceConversations.filter((c) =>
    c.source_reading_ids.every((ref) => survivingIds.has(ref)) &&
    c.turns.every((t) => t.cited_reading_ids.every((ref) => survivingIds.has(ref))));

  // Settings repair: a method_profile_id left over from a retired/renamed engine
  // is no longer admitted and would fail the space validator. Fall back to the
  // default engine (absent id ⇒ default) so the space loads.
  let settings = space.settings;
  let repaired_settings = false;
  if (
    settings &&
    typeof settings === 'object' &&
    settings.method_profile_id !== undefined &&
    !isAdmittedMethodProfileId(settings.method_profile_id)
  ) {
    const { method_profile_id: _retired, ...rest } = settings;
    void _retired;
    settings = rest;
    repaired_settings = true;
  }

  return {
    space: { ...space, readings, conversations, settings },
    dropped_readings: sourceReadings.length - readings.length,
    dropped_conversations: sourceConversations.length - conversations.length,
    repaired_settings,
  };
}
