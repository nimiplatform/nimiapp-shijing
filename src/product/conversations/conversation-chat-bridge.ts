// SJG-DATA-10 + SJG-ASTRO-07 — ShiJing consultation chat bridge.
//
// A grounded follow-up Runtime AI call over saved source readings.
// Never produces a new astrology output entity; never substitutes a
// synthesized turn on runtime failure.

import type { Reading } from '../../domain/reading.ts';

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
  readonly source_readings: readonly Reading[];
}

export interface RuntimeTextGeneratorRequest {
  readonly system: string;
  readonly user: string;
}

export interface RuntimeTextGeneratorResponse {
  readonly text: string;
}

export type RuntimeTextGenerator = (
  request: RuntimeTextGeneratorRequest,
) => Promise<RuntimeTextGeneratorResponse>;

export interface ConversationChatBridgeOptions {
  readonly generator: RuntimeTextGenerator;
  readonly system_prompt?: string;
}

export const CONVERSATION_SYSTEM_PROMPT =
  '你是 ShiJing 问镜的咨询解读助手。只能基于 source_readings 中已经保存的 Reading 做解释与回应,不能做新的占星推算,不能计算四柱、大运、阶段或关键窗口,不能输出 luck score / trend / task。若用户提出新的占星问题,要求先生成一份新的 Reading。';

export interface ConversationChatBridge {
  send(request: ConversationChatRequest): Promise<ConversationChatResult>;
}

export function createConversationChatBridge(
  options: ConversationChatBridgeOptions,
): ConversationChatBridge {
  const systemPrompt = options.system_prompt ?? CONVERSATION_SYSTEM_PROMPT;
  return {
    async send(request) {
      const userPrompt = JSON.stringify({
        source_readings: request.source_readings.map((r) => ({
          id: r.id,
          mirror_kind: r.mirror_kind,
          mirror_scope: r.mirror_scope,
          output_summary: r.output.summary,
          uncertainty: r.uncertainty,
        })),
        user_message: request.user_message,
        instruction:
          '只围绕 source_readings 回答;如果需要新的占星判断,请要求用户先生成新的 Reading。',
      });
      let response: RuntimeTextGeneratorResponse;
      try {
        response = await options.generator({ system: systemPrompt, user: userPrompt });
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
