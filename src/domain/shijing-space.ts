// SJG-DATA-02 — ShiJingSpace root user-data entity.

import type { Conversation } from './conversation.ts';
import type { Event } from './event.ts';
import type { Person, SelfSubject } from './person.ts';
import type { Reading } from './reading.ts';
import type { Relation } from './relation.ts';
import type { Settings } from './settings.ts';
import type { View } from './view.ts';

export interface ShiJingSpace {
  readonly user_id: string;
  readonly self_subject: SelfSubject;
  readonly persons: readonly Person[];
  readonly relations: readonly Relation[];
  readonly events: readonly Event[];
  readonly views: readonly View[];
  readonly readings: readonly Reading[];
  readonly conversations: readonly Conversation[];
  readonly settings: Settings;
}
