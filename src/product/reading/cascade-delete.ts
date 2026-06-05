// Deletion cascade for EventMemory / PlanItem removal.
//
// A Reading cites memories/plans (cited_event_memory_refs / cited_plan_item_refs)
// and a Conversation turn can cite them too. Deleting the entity without cleaning
// these leaves orphan refs that the load-time sanitizer would silently drop. This
// performs the same cleanup eagerly and atomically — and reports the counts so the
// UI can tell the user what else was removed — keeping the space valid post-delete.

import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import type { Reading } from '../../domain/reading.ts';
import type { Conversation } from '../../domain/conversation.ts';

export interface CascadeRemovalResult {
  readonly readings: readonly Reading[];
  readonly conversations: readonly Conversation[];
  readonly dropped_readings: number;
  readonly dropped_conversations: number;
}

export interface CascadeRemovalTarget {
  readonly event_memory_id?: string;
  readonly plan_item_id?: string;
}

export function cascadeOnEntityRemoval(
  space: ShiJingSpace,
  target: CascadeRemovalTarget,
): CascadeRemovalResult {
  const memId = target.event_memory_id;
  const planId = target.plan_item_id;

  const readings = space.readings.filter(
    (r) =>
      !(memId !== undefined && r.cited_event_memory_refs.includes(memId)) &&
      !(planId !== undefined && r.cited_plan_item_refs.includes(planId)),
  );
  const survivingReadingIds = new Set(readings.map((r) => r.id));

  const conversations = space.conversations.filter(
    (c) =>
      !(memId !== undefined && c.turns.some((t) => t.cited_event_memory_refs.includes(memId))) &&
      !(planId !== undefined && c.turns.some((t) => t.cited_plan_item_refs.includes(planId))) &&
      // also drop a conversation that cited a now-dropped reading (transitive orphan)
      c.source_reading_ids.every((id) => survivingReadingIds.has(id)) &&
      c.turns.every((t) => t.cited_reading_ids.every((id) => survivingReadingIds.has(id))),
  );

  return {
    readings,
    conversations,
    dropped_readings: space.readings.length - readings.length,
    dropped_conversations: space.conversations.length - conversations.length,
  };
}
