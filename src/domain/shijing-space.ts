// SJG-DATA-02 — ShiJingSpace root user-data entity.

import type { ConcernTag } from './concern-tag.ts';
import type { Conversation } from './conversation.ts';
import type { EventMemory } from './event-memory.ts';
import type { PlanItem } from './plan-item.ts';
import type { Person, SelfSubject } from './person.ts';
import type { Reading } from './reading.ts';
import type { Settings } from './settings.ts';

export interface ShiJingSpace {
  readonly user_id: string;
  readonly self_subject: SelfSubject;
  readonly persons: readonly Person[];
  readonly concern_tags: readonly ConcernTag[];
  readonly event_memories: readonly EventMemory[];
  readonly plan_items: readonly PlanItem[];
  readonly readings: readonly Reading[];
  readonly conversations: readonly Conversation[];
  readonly settings: Settings;
}
