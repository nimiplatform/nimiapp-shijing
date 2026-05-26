// SJG-DATA-08 — Conversation.

import type { SubjectRef } from './subject-ref.ts';

export type ConversationRole = 'user' | 'ai';

export interface ConversationTurn {
  readonly id: string;
  readonly role: ConversationRole;
  readonly body: string;
  readonly created_at: string;
}

export interface Conversation {
  readonly id: string;
  readonly created_at: string;
  readonly subject_anchor: SubjectRef;
  readonly view_id?: string;
  readonly source_reading_id?: string;
  readonly turns: readonly ConversationTurn[];
}
