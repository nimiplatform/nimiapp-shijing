import type { NimiLocalAppClient } from '@nimiplatform/sdk/app';
import type { MirrorKind } from '../../domain/mirror-scope.ts';
import {
  createConversationChatBridge,
  type ConversationChatBridge,
  type RuntimeTextGenerator,
  type RuntimeTextGeneratorRequest,
  type RuntimeTextGeneratorResponse,
} from '../../product/conversations/conversation-chat-bridge.ts';
import { applyRuntimeAiWordingText } from '../../product/astrology/runtime-ai-wording-text.ts';
import type {
  RuntimeAiClient,
  RuntimeAiResult,
} from '../../product/astrology/runtime-ai-client.ts';
import type { RuntimeAiPromptRequest } from '../../product/astrology/runtime-ai-prompt.ts';
import { runtimeFailureEvidence } from '../../product/astrology/runtime-ai-client.ts';
import { shijingLocalAppRuntimePlatform } from '../local-development/shijing-local-app-runtime.ts';

export type ShijingRuntimeAiOptions = {
  readonly getClient?: () => NimiLocalAppClient;
};

export async function generateShijingTextCandidate(
  input: ShijingRuntimeAiOptions & {
    readonly system: string;
    readonly user: string;
  },
): Promise<string> {
  const client = input.getClient?.() ?? shijingLocalAppRuntimePlatform;
  const result = await client.ai.text.generateCandidate({
    messages: [
      { role: 'system', text: input.system },
      { role: 'user', text: input.user },
    ],
  });
  if (result.finishReason !== 'stop') {
    throw Object.assign(new Error(result.finishReason === 'content-filter'
      ? 'Runtime filtered the response; no complete interpretation is available.'
      : 'Runtime stopped before completing the interpretation.'), {
      reasonCode: result.finishReason === 'content-filter'
        ? 'ai-content-filter-blocked' : 'ai-text-output-incomplete',
      actionHint: 'inspect_reason_code_and_retry_with_corrected_request',
      traceId: result.traceId,
    });
  }
  return result.text;
}

export function createShijingConversationTextGenerator(
  options: ShijingRuntimeAiOptions = {},
): RuntimeTextGenerator {
  return async function generateConversationText(
    request: RuntimeTextGeneratorRequest,
  ): Promise<RuntimeTextGeneratorResponse> {
    return {
      text: await generateShijingTextCandidate({
        ...options,
        system: request.system,
        user: request.user,
      }),
    };
  };
}

export function createShijingConversationChatBridge(
  options: ShijingRuntimeAiOptions = {},
): ConversationChatBridge {
  return createConversationChatBridge({
    generator: createShijingConversationTextGenerator(options),
  });
}

// @nimi-authority: rule.shijing.product.r011
// @nimi-authority: rule.shijing.astrology.r011
export function createShijingRuntimeAiClient(
  options: ShijingRuntimeAiOptions = {},
): RuntimeAiClient {
  return {
    async generate(
      mirrorKind: MirrorKind,
      request: RuntimeAiPromptRequest,
    ): Promise<RuntimeAiResult> {
      try {
        const text = await generateShijingTextCandidate({
          ...options,
          system: request.system_prompt,
          user: request.user_prompt,
        });
        return applyRuntimeAiWordingText(mirrorKind, request, text);
      } catch (error) {
        return {
          ok: false,
          failure: {
            kind: 'runtime_unavailable',
            detail: error instanceof Error ? error.message : String(error),
            ...runtimeFailureEvidence(error),
          },
        };
      }
    },
  };
}
