// SJG-DATA-05 — Event.

import type { SubjectRef } from './subject-ref.ts';

export interface Event {
  readonly id: string;
  readonly primary_subject: SubjectRef;
  readonly participants: readonly SubjectRef[];
  readonly occurred_at: string;
  readonly title: string;
  readonly view_refs: readonly string[];
  readonly recap?: string;
  readonly notes?: string;
}
