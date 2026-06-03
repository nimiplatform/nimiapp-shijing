// SJG-DATA-05 — EventMemory.

import type { SubjectRef } from './subject-ref.ts';

export type EventMemorySource = 'manual' | 'rijing' | 'yuejing' | 'nianjing' | 'shijing';

export const EVENT_MEMORY_SOURCES: readonly EventMemorySource[] = [
  'manual',
  'rijing',
  'yuejing',
  'nianjing',
  'shijing',
] as const;

export type EventMemoryAdmissibleUse = 'record_only' | 'eligible_for_retrieval';

export const EVENT_MEMORY_ADMISSIBLE_USES: readonly EventMemoryAdmissibleUse[] = [
  'record_only',
  'eligible_for_retrieval',
] as const;

export interface EventMemory {
  readonly id: string;
  readonly occurred_at: string;
  readonly body: string;
  readonly person_refs: readonly SubjectRef[];
  readonly concern_tag_refs: readonly string[];
  readonly source: EventMemorySource;
  readonly admissible_use: EventMemoryAdmissibleUse;
  readonly created_at: string;
  readonly updated_at: string;
}
