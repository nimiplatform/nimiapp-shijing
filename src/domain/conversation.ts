// SJG-DATA-10 — Conversation, ConversationTurn.

export type ConversationRole = 'user' | 'ai';

export const CONVERSATION_ROLES: readonly ConversationRole[] = ['user', 'ai'] as const;

export interface ConversationTurn {
  readonly id: string;
  readonly role: ConversationRole;
  readonly body: string;
  readonly cited_reading_ids: readonly string[];
  readonly cited_event_memory_refs: readonly string[];
  readonly cited_plan_item_refs: readonly string[];
  readonly created_at: string;
}

export interface Conversation {
  readonly id: string;
  readonly created_at: string;
  readonly source_reading_ids: readonly string[];
  readonly concern_tag_refs: readonly string[];
  readonly turns: readonly ConversationTurn[];
}
