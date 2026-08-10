import type {
  NimiLocalAppAgentHandle,
  NimiLocalAppClient,
} from '@nimiplatform/sdk/app';
import type { MirrorKind } from '../../domain/mirror-scope.ts';
import {
  createConversationChatBridge,
  type ConversationChatBridge,
  type RuntimeTextGenerator,
  type RuntimeTextGeneratorRequest,
  type RuntimeTextGeneratorResponse,
} from '../../product/conversations/conversation-chat-bridge.ts';
import {
  applyRuntimeAiWordingText,
} from '../../product/astrology/runtime-ai-wording-text.ts';
import type {
  RuntimeAiClient,
  RuntimeAiResult,
} from '../../product/astrology/runtime-ai-client.ts';
import type { RuntimeAiPromptRequest } from '../../product/astrology/runtime-ai-prompt.ts';
import {
  shijingLocalAppRuntimePlatform,
} from '../local-development/shijing-local-app-runtime.ts';

export type ShijingAgentConversationOptions = {
  readonly getAgentHandle: () => NimiLocalAppAgentHandle | null;
  readonly getClient?: () => NimiLocalAppClient;
  readonly createRequestId?: () => string;
};

export function createShijingConversationTextGenerator(
  options: ShijingAgentConversationOptions,
): RuntimeTextGenerator {
  return async function generateConversationText(
    request: RuntimeTextGeneratorRequest,
  ): Promise<RuntimeTextGeneratorResponse> {
    return {
      text: await runShijingAgentTerminalTurn({
        ...options,
        system: request.system,
        user: request.user,
      }),
    };
  };
}

export function createShijingConversationChatBridge(
  options: ShijingAgentConversationOptions,
): ConversationChatBridge {
  return createConversationChatBridge({
    generator: createShijingConversationTextGenerator(options),
  });
}

export function createShijingAgentRuntimeAiClient(
  options: ShijingAgentConversationOptions,
): RuntimeAiClient {
  return {
    async generate(
      mirrorKind: MirrorKind,
      request: RuntimeAiPromptRequest,
    ): Promise<RuntimeAiResult> {
      try {
        const text = await runShijingAgentTerminalTurn({
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
          },
        };
      }
    },
  };
}

export async function runShijingAgentTerminalTurn(
  options: ShijingAgentConversationOptions & {
    readonly system: string;
    readonly user: string;
  },
): Promise<string> {
  const client = options.getClient?.() ?? shijingLocalAppRuntimePlatform;
  const agents = await client.agents.listReferences();
  const selectedHandle = options.getAgentHandle();
  const selectedAgent = agents.find(
    (agent) => agent.agentHandle === selectedHandle,
  );
  if (!selectedAgent) {
    throw localAppTurnError(
      'ShiJing requires a consultation Agent selected from the current session Agent references.',
      'shijing-agent-handle-required',
      agents.length > 0
        ? 'select_shijing_consultation_agent'
        : 'wait_for_account_agent_inventory',
    );
  }

  const opened = await client.conversation.open({
    agentHandle: selectedAgent.agentHandle,
  });
  const scope = {
    agentHandle: selectedAgent.agentHandle,
    conversationAnchorId: opened.conversationAnchorId,
  } as const;
  const subscription = await client.conversation.subscribe(scope);
  const requestId = options.createRequestId?.() ?? createTurnRequestId();
  let runtimeTurnId = '';
  let committedText = '';

  try {
    await client.conversation.send({
      ...scope,
      requestId,
      text: composeAgentTurnText(options.system, options.user),
    });
    for await (const event of subscription) {
      if (event.type === 'turn-accepted') {
        if (event.requestId !== requestId || !event.turnId) {
          continue;
        }
        runtimeTurnId = event.turnId;
        continue;
      }
      if (!runtimeTurnId || event.turnId !== runtimeTurnId) continue;

      if (event.type === 'message-committed') {
        committedText = event.text.trim();
        continue;
      }
      if (event.type === 'turn-completed') {
        if (!committedText) {
          throw localAppTurnError(
            'Runtime completed the ShiJing Agent turn without a committed response.',
            'shijing-agent-terminal-response-missing',
            'retry_shijing_agent_turn',
          );
        }
        return committedText;
      }
      if (event.type === 'turn-failed') {
        throw localAppTurnError(
          event.message?.trim() || 'Runtime Agent turn failed.',
          event.reasonCode || 'shijing-agent-turn-failed',
          'review_agent_model_and_retry',
        );
      }
      if (event.type === 'turn-interrupted') {
        throw localAppTurnError(
          'Runtime Agent turn was interrupted before committing a response.',
          'shijing-agent-turn-interrupted',
          'retry_shijing_agent_turn',
        );
      }
    }
    throw localAppTurnError(
      'Runtime Agent event stream ended before a terminal event.',
      'shijing-agent-terminal-event-missing',
      'retry_shijing_agent_turn',
    );
  } finally {
    await subscription.cancel();
  }
}

function composeAgentTurnText(system: string, user: string): string {
  return [
    '[ShiJing consultation contract]',
    system.trim(),
    '',
    '[ShiJing user request and cited deterministic evidence]',
    user.trim(),
    '',
    '[Runtime Agent transport framing]',
    'For this Agent conversation transport only, wrap the requested JSON wording patch '
      + 'inside one text-only Runtime APML message:',
    '<message id="message-0">{...the requested JSON wording patch...}</message>',
    'The direct-model rules above about the first and last output characters apply only '
      + 'to the JSON message text inside <message>. The complete response must begin with '
      + '<message and end with </message>. Do not add Markdown, fences, sibling APML elements, '
      + 'or prose outside the message.',
  ].join('\n');
}

function createTurnRequestId(): string {
  const randomId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `shijing-turn-${randomId}`;
}

function localAppTurnError(
  message: string,
  reasonCode: string,
  actionHint: string,
): Error {
  return Object.assign(new Error(message), {
    reasonCode,
    actionHint,
    source: 'sdk',
    retryable: true,
  });
}
