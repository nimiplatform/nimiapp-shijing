// SJG-DATA-10 + SJG-ASTRO-07 — append grounded follow-up turns to an
// existing ShiJing consultation conversation without creating another Reading.

import type { ConversationTurn } from '../../domain/conversation.ts';
import type { Reading } from '../../domain/reading.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import { newConversationTurnId } from '../ids/index.ts';
import type { ConversationChatBridge } from './conversation-chat-bridge.ts';

export type ConversationFollowUpFailureKind =
  | 'question_empty'
  | 'conversation_not_found'
  | 'source_readings_unresolvable'
  | 'chat_bridge_failed'
  | 'validation_failed';

export interface ConversationFollowUpFailure {
  readonly kind: ConversationFollowUpFailureKind;
  readonly detail: string;
}

export type ConversationFollowUpResult =
  | { ok: true; answer: string; next_space: ShiJingSpace }
  | { ok: false; failure: ConversationFollowUpFailure };

export interface SendConversationFollowUpInput {
  readonly space: ShiJingSpace;
  readonly conversation_id: string;
  readonly question: string;
  readonly bridge: ConversationChatBridge;
  readonly cited_event_memory_refs?: readonly string[];
  readonly cited_plan_item_refs?: readonly string[];
  readonly now?: () => string;
  readonly new_turn_id?: () => string;
}

function defaultNowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function resolveSourceReadings(
  readings: readonly Reading[],
  sourceReadingIds: readonly string[],
): { ok: true; readings: readonly Reading[] } | { ok: false; detail: string } {
  if (sourceReadingIds.length === 0) {
    return { ok: false, detail: 'conversation has no source_reading_ids' };
  }
  const readingById = new Map(readings.map((reading) => [reading.id, reading] as const));
  const resolved: Reading[] = [];
  const missing: string[] = [];
  for (const id of sourceReadingIds) {
    const reading = readingById.get(id);
    if (reading) resolved.push(reading);
    else missing.push(id);
  }
  if (missing.length > 0) {
    return { ok: false, detail: `missing source readings: ${missing.join(', ')}` };
  }
  return { ok: true, readings: resolved };
}

export async function sendConversationFollowUp(
  input: SendConversationFollowUpInput,
): Promise<ConversationFollowUpResult> {
  const question = input.question.trim();
  if (question.length === 0) {
    return { ok: false, failure: { kind: 'question_empty', detail: 'question is empty' } };
  }

  const conversation = input.space.conversations.find((item) => item.id === input.conversation_id);
  if (!conversation) {
    return {
      ok: false,
      failure: { kind: 'conversation_not_found', detail: `conversation not found: ${input.conversation_id}` },
    };
  }

  const sourceReadings = resolveSourceReadings(input.space.readings, conversation.source_reading_ids);
  if (!sourceReadings.ok) {
    return {
      ok: false,
      failure: { kind: 'source_readings_unresolvable', detail: sourceReadings.detail },
    };
  }

  const bridgeResult = await input.bridge.send({
    user_message: question,
    source_readings: sourceReadings.readings,
  });
  if (!bridgeResult.ok) {
    return {
      ok: false,
      failure: { kind: 'chat_bridge_failed', detail: bridgeResult.error.detail },
    };
  }

  const createdAt = input.now?.() ?? defaultNowIso();
  const newTurnId = input.new_turn_id ?? newConversationTurnId;
  const citedEventMemoryRefs = [...(input.cited_event_memory_refs ?? [])];
  const citedPlanItemRefs = [...(input.cited_plan_item_refs ?? [])];
  const userTurn: ConversationTurn = {
    id: newTurnId(),
    role: 'user',
    body: question,
    cited_reading_ids: [],
    cited_event_memory_refs: citedEventMemoryRefs,
    cited_plan_item_refs: citedPlanItemRefs,
    created_at: createdAt,
  };
  const aiTurn: ConversationTurn = {
    id: newTurnId(),
    role: 'ai',
    body: bridgeResult.text,
    cited_reading_ids: [...conversation.source_reading_ids],
    cited_event_memory_refs: citedEventMemoryRefs,
    cited_plan_item_refs: citedPlanItemRefs,
    created_at: createdAt,
  };

  const nextSpace: ShiJingSpace = {
    ...input.space,
    conversations: input.space.conversations.map((item) =>
      item.id === conversation.id
        ? { ...item, turns: [...item.turns, userTurn, aiTurn] }
        : item,
    ),
  };

  const validation = validateShiJingSpace(nextSpace);
  if (!validation.ok) {
    return {
      ok: false,
      failure: { kind: 'validation_failed', detail: validation.error.code },
    };
  }

  return { ok: true, answer: bridgeResult.text, next_space: nextSpace };
}
