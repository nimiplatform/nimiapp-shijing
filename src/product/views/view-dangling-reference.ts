// Wave-9 — dangling reference detector for View deletion. A View must
// not be removed while events.view_refs / readings.view_id /
// conversations.view_id still reference it.

import type { ShiJingSpace } from '../../domain/shijing-space.ts';

export interface ViewReference {
  readonly via: string;
  readonly view_id: string;
}

export function findReferencesToView(space: ShiJingSpace, viewId: string): readonly ViewReference[] {
  const matches: ViewReference[] = [];
  for (const event of space.events) {
    if (event.view_refs.includes(viewId)) {
      matches.push({ via: `event:${event.id}:view_refs`, view_id: viewId });
    }
  }
  for (const reading of space.readings) {
    if (reading.view_id === viewId) {
      matches.push({ via: `reading:${reading.id}:view_id`, view_id: viewId });
    }
  }
  for (const conversation of space.conversations) {
    if (conversation.view_id === viewId) {
      matches.push({ via: `conversation:${conversation.id}:view_id`, view_id: viewId });
    }
  }
  return matches;
}
