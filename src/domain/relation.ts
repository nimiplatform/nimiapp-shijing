// SJG-DATA-04 — Relation.

import type { SubjectRef } from './subject-ref.ts';

export interface Relation {
  readonly id: string;
  readonly from_subject: SubjectRef;
  readonly to_subject: SubjectRef;
  readonly relation_kind: string;
  readonly notes?: string;
}
