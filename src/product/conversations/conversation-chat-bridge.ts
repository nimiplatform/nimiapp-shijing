// SJG-DATA-08 — Conversation chat bridge. Conversations do NOT go
// through the astrology pipeline; they are direct chat calls subject
// to a system prompt that forbids 吉凶 prediction and luck score
// output (SJG-ASTRO-05 forbidden-outputs spirit, extended to
// conversations because the chat surface must not bypass the
// astrology boundary).
//
// The bridge is wired with a RuntimeTextGenerator (the same SDK
// callable the astrology runtime adapter uses). All failures surface
// as a typed status — never a synthesized substitute turn.

import type {
  RuntimeTextGenerator,
  RuntimeTextGeneratorResponse,
} from '../astrology/runtime-ai-client.ts';

export const CONVERSATION_SYSTEM_PROMPT =
  '你是 ShiJing 的对话助手，仅基于用户提供的语境讨论。永不预言吉凶，永不输出 luck score。';

export type ConversationChatFailureKind =
  | 'generator_unavailable'
  | 'generator_call_failed'
  | 'generator_response_empty';

export interface ConversationChatFailure {
  readonly kind: ConversationChatFailureKind;
  readonly detail: string;
}

export type ConversationChatResult =
  | { ok: true; text: string }
  | { ok: false; error: ConversationChatFailure };

export interface ConversationChatRequest {
  readonly user_message: string;
  readonly model_id: string;
}

export interface ConversationChatBridgeOptions {
  readonly generator: RuntimeTextGenerator;
  readonly system_prompt?: string;
}

export function createConversationChatBridge(options: ConversationChatBridgeOptions) {
  const systemPrompt = options.system_prompt ?? CONVERSATION_SYSTEM_PROMPT;
  return {
    async send(request: ConversationChatRequest): Promise<ConversationChatResult> {
      let response: RuntimeTextGeneratorResponse;
      try {
        response = await options.generator({
          system: systemPrompt,
          user: request.user_message,
          modelId: request.model_id,
        });
      } catch (cause) {
        return {
          ok: false,
          error: {
            kind: 'generator_call_failed',
            detail: cause instanceof Error ? cause.message : 'runtime generator threw',
          },
        };
      }
      if (!response || typeof response.text !== 'string' || response.text.length === 0) {
        return {
          ok: false,
          error: { kind: 'generator_response_empty', detail: 'runtime generator returned no text' },
        };
      }
      return { ok: true, text: response.text };
    },
  };
}

export type ConversationChatBridge = ReturnType<typeof createConversationChatBridge>;

// Fail-close generator used when the host did not wire a real one.
// SJG-ALGO-12 prohibits synthesized substitute output; the chat
// bridge surfaces `generator_unavailable` so the conversation UI
// shows a typed failure instead of a fake assistant turn.
export function createUnavailableConversationChatBridge(): ConversationChatBridge {
  return {
    async send(): Promise<ConversationChatResult> {
      return {
        ok: false,
        error: {
          kind: 'generator_unavailable',
          detail: 'No conversation text generator is wired in this build.',
        },
      };
    },
  };
}
