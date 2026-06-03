// SJG-DATA-10 — Conversation validator.

import {
  CONVERSATION_ROLES,
  type Conversation,
  type ConversationTurn,
} from '../domain/conversation.ts';

const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export type ConversationValidationError =
  | { code: 'conversation_id_empty' }
  | { code: 'conversation_created_at_not_iso_utc' }
  | { code: 'conversation_source_reading_ids_empty' }
  | { code: 'conversation_source_reading_id_empty'; index: number }
  | { code: 'conversation_turn_id_empty'; index: number }
  | { code: 'conversation_turn_role_invalid'; index: number; received: unknown }
  | { code: 'conversation_turn_body_empty'; index: number }
  | { code: 'conversation_turn_created_at_not_iso_utc'; index: number }
  | { code: 'conversation_turn_ai_must_disclose_source_reading'; index: number }
  | { code: 'conversation_turn_ai_cited_reading_must_be_in_source_reading_ids'; index: number; ref: string }
  | { code: 'conversation_turn_cited_event_memory_ref_empty'; index: number; ref_index: number }
  | { code: 'conversation_turn_cited_plan_item_ref_empty'; index: number; ref_index: number };

export type ConversationValidationResult =
  | { ok: true }
  | { ok: false; error: ConversationValidationError };

export function validateConversation(conversation: Conversation): ConversationValidationResult {
  if (typeof conversation.id !== 'string' || conversation.id.length === 0) {
    return { ok: false, error: { code: 'conversation_id_empty' } };
  }
  if (!ISO_UTC_PATTERN.test(conversation.created_at)) {
    return { ok: false, error: { code: 'conversation_created_at_not_iso_utc' } };
  }
  if (conversation.source_reading_ids.length === 0) {
    return { ok: false, error: { code: 'conversation_source_reading_ids_empty' } };
  }
  for (let i = 0; i < conversation.source_reading_ids.length; i += 1) {
    const id = conversation.source_reading_ids[i]!;
    if (typeof id !== 'string' || id.length === 0) {
      return { ok: false, error: { code: 'conversation_source_reading_id_empty', index: i } };
    }
  }
  const sourceReadingIds = new Set(conversation.source_reading_ids);
  for (let i = 0; i < conversation.turns.length; i += 1) {
    const turn: ConversationTurn = conversation.turns[i]!;
    if (typeof turn.id !== 'string' || turn.id.length === 0) {
      return { ok: false, error: { code: 'conversation_turn_id_empty', index: i } };
    }
    if (!CONVERSATION_ROLES.includes(turn.role)) {
      return {
        ok: false,
        error: { code: 'conversation_turn_role_invalid', index: i, received: turn.role },
      };
    }
    if (typeof turn.body !== 'string' || turn.body.length === 0) {
      return { ok: false, error: { code: 'conversation_turn_body_empty', index: i } };
    }
    if (!ISO_UTC_PATTERN.test(turn.created_at)) {
      return { ok: false, error: { code: 'conversation_turn_created_at_not_iso_utc', index: i } };
    }
    for (let j = 0; j < turn.cited_event_memory_refs.length; j += 1) {
      const ref = turn.cited_event_memory_refs[j]!;
      if (typeof ref !== 'string' || ref.length === 0) {
        return {
          ok: false,
          error: { code: 'conversation_turn_cited_event_memory_ref_empty', index: i, ref_index: j },
        };
      }
    }
    for (let j = 0; j < turn.cited_plan_item_refs.length; j += 1) {
      const ref = turn.cited_plan_item_refs[j]!;
      if (typeof ref !== 'string' || ref.length === 0) {
        return {
          ok: false,
          error: { code: 'conversation_turn_cited_plan_item_ref_empty', index: i, ref_index: j },
        };
      }
    }
    if (turn.role === 'ai') {
      if (turn.cited_reading_ids.length === 0) {
        return {
          ok: false,
          error: { code: 'conversation_turn_ai_must_disclose_source_reading', index: i },
        };
      }
      for (const ref of turn.cited_reading_ids) {
        if (!sourceReadingIds.has(ref)) {
          return {
            ok: false,
            error: {
              code: 'conversation_turn_ai_cited_reading_must_be_in_source_reading_ids',
              index: i,
              ref,
            },
          };
        }
      }
    }
  }
  return { ok: true };
}
