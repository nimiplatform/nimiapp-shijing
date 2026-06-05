// W-c03 Settings > Memory & Plans (EventMemory half).

import type { EventMemory } from '../../domain/event-memory.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import {
  validateEventMemory,
  type EventMemoryValidationError,
} from '../../contracts/event-memory-validator.ts';
import { cascadeOnEntityRemoval } from '../reading/cascade-delete.ts';

export type MemoryUpsertError =
  | { code: 'memory_invalid'; detail: EventMemoryValidationError }
  | { code: 'memory_concern_tag_ref_unresolvable'; ref: string }
  | { code: 'memory_person_ref_unresolvable'; ref: string };

export type MemoryUpsertOutcome =
  | { ok: true; next_space: ShiJingSpace }
  | { ok: false; error: MemoryUpsertError };

export function upsertEventMemory(
  space: ShiJingSpace,
  memory: EventMemory,
): MemoryUpsertOutcome {
  const check = validateEventMemory(memory);
  if (!check.ok) return { ok: false, error: { code: 'memory_invalid', detail: check.error } };
  for (const ref of memory.concern_tag_refs) {
    if (!space.concern_tags.some((t) => t.id === ref)) {
      return { ok: false, error: { code: 'memory_concern_tag_ref_unresolvable', ref } };
    }
  }
  for (const ref of memory.person_refs) {
    if (ref === 'self') continue;
    if (!space.persons.some((p) => p.id === ref.id)) {
      return { ok: false, error: { code: 'memory_person_ref_unresolvable', ref: ref.id } };
    }
  }
  const idx = space.event_memories.findIndex((m) => m.id === memory.id);
  if (idx === -1) {
    return {
      ok: true,
      next_space: { ...space, event_memories: [...space.event_memories, memory] },
    };
  }
  const event_memories = space.event_memories.slice();
  event_memories[idx] = memory;
  return { ok: true, next_space: { ...space, event_memories } };
}

export type MemoryDeleteOutcome =
  | { ok: true; next_space: ShiJingSpace; dropped_readings: number; dropped_conversations: number }
  | { ok: false; error: { code: 'memory_not_found'; id: string } };

export function deleteEventMemory(space: ShiJingSpace, id: string): MemoryDeleteOutcome {
  if (!space.event_memories.some((m) => m.id === id)) {
    return { ok: false, error: { code: 'memory_not_found', id } };
  }
  // Cascade: drop Readings/Conversations that cited this memory so the space stays
  // valid (no orphan refs) instead of being silently repaired on the next load.
  const cascade = cascadeOnEntityRemoval(space, { event_memory_id: id });
  return {
    ok: true,
    next_space: {
      ...space,
      event_memories: space.event_memories.filter((m) => m.id !== id),
      readings: cascade.readings,
      conversations: cascade.conversations,
    },
    dropped_readings: cascade.dropped_readings,
    dropped_conversations: cascade.dropped_conversations,
  };
}
