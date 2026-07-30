import type {
  NimiLocalAppAgentHandle,
  NimiLocalAppClient,
  NimiLocalAppConversationEvent,
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
} from '../../product/astrology/runtime-ai-sdk-factory.ts';
import type {
  RuntimeAiClient,
  RuntimeAiResult,
} from '../../product/astrology/runtime-ai-client.ts';
import type { RuntimeAiPromptRequest } from '../../product/astrology/runtime-ai-prompt.ts';
import {
  SHIJING_AGENTS_INTERACT_PERMISSION,
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
  const permission = await client.permissions.status(
    SHIJING_AGENTS_INTERACT_PERMISSION,
  );
  if (permission.posture !== 'granted') {
    throw localAppTurnError(
      `ShiJing Agent interaction permission is ${permission.posture}.`,
      'shijing-agents-interact-permission-required',
      permission.canRequest
        ? 'request_agents_interact_from_shijing'
        : 'review_agents_interact_in_nimi_desktop',
    );
  }
  const selectedHandle = options.getAgentHandle();
  const selectedAgent = permission.agents.find(
    (agent) => agent.agentHandle === selectedHandle,
  );
  if (!selectedAgent) {
    throw localAppTurnError(
      'ShiJing requires an Agent selected from the current caller-scoped grant.',
      'shijing-agent-handle-required',
      permission.agents.length > 0
        ? 'select_shijing_consultation_agent'
        : 'wait_for_account_agent_inventory',
    );
  }

  const opened = await client.conversation.open({
    agentHandle: selectedAgent.agentHandle,
    disposition: 'create-or-resume',
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
      const payload = eventPayload(event);
      const eventTurnId = stringValue(payload.turn_id ?? payload.turnId);
      if (event.messageType === 'runtime.agent.turn.accepted') {
        const detail = eventDetail(payload);
        if (stringValue(detail.request_id ?? detail.requestId) !== requestId || !eventTurnId) {
          continue;
        }
        runtimeTurnId = eventTurnId;
        continue;
      }
      if (!runtimeTurnId || eventTurnId !== runtimeTurnId) continue;

      const detail = eventDetail(payload);
      if (event.messageType === 'runtime.agent.turn.message_committed') {
        committedText = stringValue(detail.text);
        continue;
      }
      if (event.messageType === 'runtime.agent.turn.completed') {
        if (!committedText) {
          throw localAppTurnError(
            'Runtime completed the ShiJing Agent turn without a committed response.',
            'shijing-agent-terminal-response-missing',
            'retry_shijing_agent_turn',
          );
        }
        return committedText;
      }
      if (event.messageType === 'runtime.agent.turn.failed') {
        throw localAppTurnError(
          stringValue(detail.message) || 'Runtime Agent turn failed.',
          event.reasonCode || 'shijing-agent-turn-failed',
          'review_agent_model_and_retry',
        );
      }
      if (event.messageType === 'runtime.agent.turn.interrupted') {
        throw localAppTurnError(
          'Runtime Agent turn was interrupted.',
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
  ].join('\n');
}

function eventPayload(event: NimiLocalAppConversationEvent): Record<string, unknown> {
  return event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload)
    ? event.payload as Record<string, unknown>
    : {};
}

function eventDetail(payload: Record<string, unknown>): Record<string, unknown> {
  const detail = payload.detail;
  return detail && typeof detail === 'object' && !Array.isArray(detail)
    ? detail as Record<string, unknown>
    : {};
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
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
