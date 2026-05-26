// SJG-DATA-08 — Conversation chat bridge. Follow-up conversations are
// explanation-only Runtime AI calls over a saved source Reading. They
// must not become a second astrology generation path.
//
// The bridge is wired with a RuntimeTextGenerator (the same SDK
// callable the astrology runtime adapter uses). All failures surface
// as a typed status — never a synthesized substitute turn.

import type {
  RuntimeTextGenerator,
  RuntimeTextGeneratorResponse,
} from '../astrology/runtime-ai-client.ts';

export const CONVERSATION_SYSTEM_PROMPT =
  '你是 ShiJing 的跟进解读助手。只能解释、澄清或展开 source_reading 中已经保存的解读；不能做新的占星推算，不能计算四柱、大运、阶段、关键窗口，不能预言吉凶，不能输出 luck score。若用户提出新的占星问题，要求先生成一份新的 Reading。';

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

export interface ConversationSourceReadingContext {
  readonly id: string;
  readonly kind: string;
  readonly scope: string;
  readonly anchor_subject: unknown;
  readonly time_window: unknown;
  readonly output: {
    readonly summary: string;
    readonly highlights: readonly unknown[];
    readonly recommendations: readonly unknown[];
  };
  readonly inputs_summary: {
    readonly input_hash: string;
    readonly feature_snapshot_hash: string;
    readonly method_profile: unknown;
    readonly stage_label: string;
    readonly uncertainty_inputs: readonly unknown[];
  };
  readonly uncertainty: {
    readonly confidence: string;
    readonly caveats: readonly string[];
    readonly data_gaps: readonly string[];
  };
}

export interface ConversationChatRequest {
  readonly user_message: string;
  readonly model_id: string;
  readonly source_reading: ConversationSourceReadingContext;
}

export interface ConversationChatBridgeOptions {
  readonly generator: RuntimeTextGenerator;
  readonly system_prompt?: string;
}

export function createConversationChatBridge(options: ConversationChatBridgeOptions) {
  const systemPrompt = options.system_prompt ?? CONVERSATION_SYSTEM_PROMPT;
  return {
    async send(request: ConversationChatRequest): Promise<ConversationChatResult> {
      const userPrompt = JSON.stringify({
        source_reading: request.source_reading,
        user_message: request.user_message,
        instruction: '只围绕 source_reading 回答；如果需要新的占星判断，请要求用户先生成新的 Reading。',
      });
      let response: RuntimeTextGeneratorResponse;
      try {
        response = await options.generator({
          system: systemPrompt,
          user: userPrompt,
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
