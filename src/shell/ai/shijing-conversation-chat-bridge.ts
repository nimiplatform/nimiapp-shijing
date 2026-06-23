import type { NimiClient } from '@nimiplatform/sdk';
import {
  createNimiRuntimeAIModel,
  runNimiTextGenerate,
  type NimiAIConfig,
} from '@nimiplatform/sdk/ai';
import { SHIJING_RUNTIME_APP_ID } from '../../contracts/app-identity.ts';
import {
  createConversationChatBridge,
  type ConversationChatBridge,
  type RuntimeTextGenerator,
  type RuntimeTextGeneratorRequest,
  type RuntimeTextGeneratorResponse,
} from '../../product/conversations/conversation-chat-bridge.ts';
import {
  createShijingReadingAIScopeRef,
  loadShijingAIConfig,
} from './shijing-ai-config.ts';
import {
  resolveShijingRuntimeAISchedulingMetadata,
  resolveShijingTextGenerateBinding,
} from './shijing-runtime-ai-client.ts';
import { getShijingNimiClient } from '../infra/shijing-nimi-client.ts';
import { requireShijingRuntimeSubjectUserId } from '../infra/shijing-runtime-session.ts';

export type ShijingConversationChatBridgeOptions = {
  readonly loadConfig?: () => NimiAIConfig;
  readonly getClient?: () => NimiClient;
  readonly getSubjectUserId?: () => string | Promise<string>;
  readonly surfaceId?: string;
};

const SHIJING_CONVERSATION_RUNTIME_SURFACE_ID = 'shijing.conversation.runtime-ai';

function detailFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function loadRuntimeConfig(loadConfig: () => NimiAIConfig): NimiAIConfig {
  try {
    return loadConfig();
  } catch (error) {
    throw new Error(detailFromError(error), { cause: error });
  }
}

function resolveRuntimeClient(getClient: () => NimiClient): NimiClient {
  try {
    return getClient();
  } catch (error) {
    throw new Error(detailFromError(error), { cause: error });
  }
}

async function resolveSubjectUserId(
  getSubjectUserId: () => string | Promise<string>,
): Promise<string> {
  try {
    const subjectUserId = String(await getSubjectUserId()).trim();
    if (!subjectUserId) {
      throw new Error('ShiJing Runtime AI requires a non-empty subjectUserId.');
    }
    return subjectUserId;
  } catch (error) {
    throw new Error(detailFromError(error), { cause: error });
  }
}

export function createShijingConversationTextGenerator(
  options: ShijingConversationChatBridgeOptions = {},
): RuntimeTextGenerator {
  const loadConfig = options.loadConfig ?? (() => loadShijingAIConfig(createShijingReadingAIScopeRef()));
  const getClient = options.getClient ?? (() => getShijingNimiClient());
  const getSubjectUserId = options.getSubjectUserId ?? requireShijingRuntimeSubjectUserId;
  const surfaceId = options.surfaceId ?? SHIJING_CONVERSATION_RUNTIME_SURFACE_ID;

  return async function generateConversationText(
    request: RuntimeTextGeneratorRequest,
  ): Promise<RuntimeTextGeneratorResponse> {
    const config = loadRuntimeConfig(loadConfig);
    const resolved = resolveShijingTextGenerateBinding(config);
    if (!resolved.ok) {
      throw new Error(resolved.detail);
    }

    const client = resolveRuntimeClient(getClient);
    const scheduling = await resolveShijingRuntimeAISchedulingMetadata(
      client,
      config,
      resolved.schedulingTarget,
    );
    if ('failure' in scheduling) {
      throw new Error(scheduling.failure);
    }

    const subjectUserId = await resolveSubjectUserId(getSubjectUserId);
    const model = createNimiRuntimeAIModel({
      runtime: client.runtime,
      appId: SHIJING_RUNTIME_APP_ID,
      routePolicy: resolved.route,
      connectorId: resolved.connectorId,
      subjectUserId,
      timeoutMs: resolved.params.timeoutMs,
      model: {
        modelId: resolved.model,
        ...(resolved.connectorId ? { providerId: resolved.connectorId } : {}),
      },
    });

    const result = await runNimiTextGenerate({
      runtime: { model },
      request: {
        model: model.model,
        messages: [
          { role: 'system', content: [{ type: 'text', text: request.system }] },
          { role: 'user', content: [{ type: 'text', text: request.user }] },
        ],
        parameters: {
          metadata: {
            ...resolved.metadata,
            ...scheduling,
            surfaceId,
            runtimeAiUse: 'conversation',
          },
          ...(typeof resolved.params.temperature === 'number'
            ? { temperature: resolved.params.temperature }
            : {}),
          ...(typeof resolved.params.topP === 'number' ? { topP: resolved.params.topP } : {}),
          ...(typeof resolved.params.maxTokens === 'number'
            ? { maxTokens: resolved.params.maxTokens }
            : {}),
        },
      },
    });

    if (!result.ok) {
      throw new Error(result.error.message || result.error.code || 'Runtime text generation failed');
    }
    return { text: result.text };
  };
}

export function createShijingConversationChatBridge(
  options: ShijingConversationChatBridgeOptions = {},
): ConversationChatBridge {
  return createConversationChatBridge({
    generator: createShijingConversationTextGenerator(options),
  });
}
