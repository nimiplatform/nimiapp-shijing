import { getPlatformClient, type PlatformClient } from '@nimiplatform/sdk';
import {
  createAIConfigEvidence,
  type AIConfig,
} from '@nimiplatform/sdk/ai';
import {
  createAIRuntimeEvidence,
  peekRuntimeSchedulingBatch,
  projectAIRuntimeEvidenceMetadata,
  resolveAIConfigRuntimeSchedulingTargetForCapability,
  type NimiRoutePolicy,
  type RuntimeRouteBinding,
} from '@nimiplatform/sdk/runtime';
import type { MirrorKind } from '../../domain/mirror-scope.ts';
import {
  createSdkRuntimeAiClient,
} from '../../product/astrology/runtime-ai-sdk-factory.ts';
import type {
  RuntimeAiClient,
  RuntimeAiResult,
} from '../../product/astrology/runtime-ai-client.ts';
import type { RuntimeAiPromptRequest } from '../../product/astrology/runtime-ai-prompt.ts';
import { SHIJING_APP_ID } from '../../contracts/app-identity.ts';
import {
  createShijingReadingAIScopeRef,
  loadShijingAIConfig,
} from './shijing-ai-config.ts';

export const SHIJING_TEXT_GENERATE_CAPABILITY_ID = 'text.generate';

type RuntimeTextParams = {
  readonly temperature?: number;
  readonly topP?: number;
  readonly maxTokens?: number;
  readonly timeoutMs?: number;
};

export type ResolvedShijingTextGenerateBinding =
  | {
      ok: true;
      binding: RuntimeRouteBinding;
      model: string;
      route: NimiRoutePolicy;
      connectorId?: string;
      params: RuntimeTextParams;
      metadata: Record<string, string>;
    }
  | {
      ok: false;
      detail: string;
    };

export type ShijingRuntimeAiClientOptions = {
  readonly loadConfig?: () => AIConfig;
  readonly getPlatformClient?: () => PlatformClient;
};

function bindingModel(binding: RuntimeRouteBinding): string {
  return String(binding.model || binding.modelId || binding.localModelId || '').trim();
}

function numberParam(params: Readonly<Record<string, unknown>> | undefined, key: string): number | undefined {
  const value = params?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function extractTextParams(params: Readonly<Record<string, unknown>> | undefined): RuntimeTextParams {
  return {
    ...(numberParam(params, 'temperature') !== undefined
      ? { temperature: numberParam(params, 'temperature') }
      : {}),
    ...(numberParam(params, 'topP') !== undefined ? { topP: numberParam(params, 'topP') } : {}),
    ...(numberParam(params, 'maxTokens') !== undefined
      ? { maxTokens: numberParam(params, 'maxTokens') }
      : {}),
    ...(numberParam(params, 'timeoutMs') !== undefined
      ? { timeoutMs: numberParam(params, 'timeoutMs') }
      : {}),
  };
}

export function resolveShijingTextGenerateBinding(
  config: AIConfig,
): ResolvedShijingTextGenerateBinding {
  const binding = config.capabilities.selectedBindings[SHIJING_TEXT_GENERATE_CAPABILITY_ID] || null;
  if (!binding) {
    return {
      ok: false,
      detail:
        'AIConfig binding is required for text.generate; ShiJing Runtime AI failed closed before request dispatch.',
    };
  }
  const model = bindingModel(binding);
  if (!model) {
    return {
      ok: false,
      detail: 'AIConfig binding for text.generate does not include a runtime model id.',
    };
  }
  const connectorId = String(binding.connectorId || '').trim();
  if (binding.source === 'local' && connectorId) {
    return {
      ok: false,
      detail:
        'AIConfig binding for text.generate is local but includes connectorId; local Runtime bindings must use connectorId="".',
    };
  }
  if (binding.source === 'cloud' && !connectorId) {
    return {
      ok: false,
      detail: 'AIConfig binding for text.generate is cloud but does not include connectorId.',
    };
  }
  if (binding.source !== 'local' && binding.source !== 'cloud') {
    return {
      ok: false,
      detail: `AIConfig binding for text.generate has unsupported source "${String(binding.source)}".`,
    };
  }

  const evidence = createAIConfigEvidence(config);
  return {
    ok: true,
    binding,
    model,
    route: binding.source,
    ...(connectorId ? { connectorId } : {}),
    params: extractTextParams(config.capabilities.selectedParams[SHIJING_TEXT_GENERATE_CAPABILITY_ID]),
    metadata: {
      aiConfigScopeKind: config.scopeRef.kind,
      aiConfigScopeOwnerId: config.scopeRef.ownerId,
      aiConfigScopeSurfaceId: config.scopeRef.surfaceId || '',
      aiConfigProfileId: config.profileOrigin?.profileId || '',
      aiConfigProfileTitle: config.profileOrigin?.title || '',
      aiConfigCapabilityId: SHIJING_TEXT_GENERATE_CAPABILITY_ID,
      aiConfigBindingSource: binding.source,
      aiConfigBindingConnectorId: connectorId,
      aiConfigBindingModel: model,
      aiConfigHash: evidence.configHash,
      aiConfigBindingKeys: evidence.capabilityBindingKeys.join(','),
      surfaceId: 'shijing.reading.runtime-ai',
    },
  };
}

async function schedulingMetadata(
  client: PlatformClient,
  config: AIConfig,
): Promise<Record<string, string> | { readonly failure: string }> {
  const target = resolveAIConfigRuntimeSchedulingTargetForCapability(
    config,
    SHIJING_TEXT_GENERATE_CAPABILITY_ID,
  );
  if (!target) return {};
  try {
    const batch = await peekRuntimeSchedulingBatch({
      appId: SHIJING_APP_ID,
      targets: [target],
      peekScheduling: (request, options) => client.runtime.ai.peekScheduling(request, options),
    });
    const judgement = batch?.aggregateJudgement ?? null;
    if (judgement?.state === 'denied') {
      return {
        failure: `Runtime scheduling denied text.generate: ${judgement.detail || 'denied'}`,
      };
    }
    return projectAIRuntimeEvidenceMetadata(createAIRuntimeEvidence({
      schedulingJudgement: judgement,
    }));
  } catch (error) {
    return {
      failure: error instanceof Error ? error.message : String(error),
    };
  }
}

class AIConfigBackedRuntimeAiClient implements RuntimeAiClient {
  private readonly loadConfig: () => AIConfig;
  private readonly getClient: () => PlatformClient;

  constructor(options: ShijingRuntimeAiClientOptions = {}) {
    this.loadConfig = options.loadConfig ?? (() => loadShijingAIConfig(createShijingReadingAIScopeRef()));
    this.getClient = options.getPlatformClient ?? (() => getPlatformClient());
  }

  async generate(
    mirror_kind: MirrorKind,
    request: RuntimeAiPromptRequest,
  ): Promise<RuntimeAiResult> {
    let config: AIConfig;
    try {
      config = this.loadConfig();
    } catch (error) {
      return {
        ok: false,
        failure: {
          kind: 'runtime_unavailable',
          detail: error instanceof Error ? error.message : String(error),
        },
      };
    }

    const resolved = resolveShijingTextGenerateBinding(config);
    if (!resolved.ok) {
      return { ok: false, failure: { kind: 'runtime_unavailable', detail: resolved.detail } };
    }

    let client: PlatformClient;
    try {
      client = this.getClient();
    } catch (error) {
      return {
        ok: false,
        failure: {
          kind: 'runtime_unavailable',
          detail: error instanceof Error ? error.message : String(error),
        },
      };
    }

    const scheduling = await schedulingMetadata(client, config);
    if ('failure' in scheduling) {
      return { ok: false, failure: { kind: 'runtime_unavailable', detail: scheduling.failure } };
    }

    return createSdkRuntimeAiClient({
      runtime: client.runtime,
      model: resolved.model,
      route: resolved.route,
      ...(resolved.connectorId ? { connectorId: resolved.connectorId } : {}),
      metadata: {
        ...resolved.metadata,
        ...scheduling,
      },
      ...resolved.params,
    }).generate(mirror_kind, request);
  }
}

export function createShijingRuntimeAiClient(
  options: ShijingRuntimeAiClientOptions = {},
): RuntimeAiClient {
  return new AIConfigBackedRuntimeAiClient(options);
}
