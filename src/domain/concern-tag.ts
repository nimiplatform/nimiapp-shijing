// SJG-DATA-04 — ConcernTag, MentionRef.

import type { SubjectRef } from './subject-ref.ts';

export type ConcernTagStatus = 'active' | 'archived';

export const CONCERN_TAG_STATUSES: readonly ConcernTagStatus[] = [
  'active',
  'archived',
] as const;

export const CONCERN_TAG_ACTIVE_LIMIT = 5 as const;

export const CONCERN_TAG_TOPIC_PREFIX = '#' as const;
export const CONCERN_TAG_PERSON_PREFIX = '@' as const;
export const CONCERN_TAG_LABEL_MAX_LENGTH = 80 as const;

export interface MentionRef {
  readonly token: string;
  readonly resolved_subject_ref?: SubjectRef;
  readonly unresolved_text?: string;
}

export interface ConcernTag {
  readonly id: string;
  readonly label: string;
  readonly status: ConcernTagStatus;
  readonly sort_order: number;
  readonly parsed_topics: readonly string[];
  readonly mention_refs: readonly MentionRef[];
  readonly prompt_text: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface ConcernTagSnapshot {
  readonly id: string;
  readonly label: string;
  readonly status: ConcernTagStatus;
  readonly sort_order: number;
  readonly parsed_topics: readonly string[];
  readonly mention_refs: readonly MentionRef[];
  readonly prompt_text_hash: string;
  readonly resolved_person_refs: readonly SubjectRef[];
  readonly captured_at: string;
}
