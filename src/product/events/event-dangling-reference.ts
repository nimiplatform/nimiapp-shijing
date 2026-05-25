// SJG-DATA-05 — dangling-reference detector for Event deletion. An
// Event is referenced from two places in ShiJingSpace:
//   1. view.context_items[].body when kind === 'event_ref' (the body
//      carries the referenced event id per SJG-DATA-06).
//   2. conversation.turns[].body — turns may quote event ids inline;
//      we treat any turn body that exact-matches the event id as a
//      reference. The spec gives no structured event-ref slot on a
//      turn, so the exact-id match is the only fail-close signal
//      available without inventing a parallel field.

import type { ShiJingSpace } from '../../domain/shijing-space.ts';

export interface EventReference {
  readonly via: string;
  readonly event_id: string;
}

export function findReferencesToEvent(space: ShiJingSpace, eventId: string): readonly EventReference[] {
  const matches: EventReference[] = [];
  for (const view of space.views) {
    for (const item of view.context_items) {
      if (item.kind === 'event_ref' && item.body === eventId) {
        matches.push({ via: `view:${view.id}:context_items:${item.id}`, event_id: eventId });
      }
    }
  }
  for (const conversation of space.conversations) {
    for (const turn of conversation.turns) {
      if (turn.body === eventId) {
        matches.push({ via: `conversation:${conversation.id}:turns:${turn.id}`, event_id: eventId });
      }
    }
  }
  return matches;
}
