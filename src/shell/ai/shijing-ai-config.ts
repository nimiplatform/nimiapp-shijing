import {
  areNimiAIScopeRefsEqual,
  createEmptyNimiAIConfig,
  createNimiAIConfigSubscriptionRegistry,
  createNimiAIHostSurface,
  createNimiAppAIScopeRef,
  encodeNimiAIScopeRef,
  validateNimiAIConfig,
  versionNimiAIConfig,
  type NimiAIConfig,
  type NimiAIConfigStore,
  type NimiAIScopeRef,
} from '@nimiplatform/sdk/ai';
import type {
  SharedAIConfigService,
  SharedAIConfigSubscribeListener,
  SharedAIConfigUnsubscribe,
} from '@nimiplatform/kit/features/model-config/headless';
import { SHIJING_APP_ID } from '../../contracts/app-identity.ts';
import {
  createInstalledNimiAppStandardShellSurface,
  type JsonObject,
} from '../bridge/index.ts';

export const SHIJING_READING_AI_SURFACE_ID = 'shijing.reading';

const configSubscriptions = createNimiAIConfigSubscriptionRegistry();
const shellHydratedConfigs = new Map<string, NimiAIConfig>();

export function createShijingReadingAIScopeRef(): NimiAIScopeRef {
  return createNimiAppAIScopeRef(SHIJING_APP_ID, SHIJING_READING_AI_SURFACE_ID);
}

function cloneAIConfig(config: NimiAIConfig): NimiAIConfig {
  return JSON.parse(JSON.stringify(config)) as NimiAIConfig;
}

function normalizeShijingAIConfig(next: NimiAIConfig, scopeRef: NimiAIScopeRef): NimiAIConfig {
  const normalized = {
    ...next,
    scopeRef,
    capabilities: {
      targetRefs: { ...(next.capabilities.targetRefs || {}) },
      selectedParams: { ...(next.capabilities.selectedParams || {}) },
    },
    profileOrigin: next.profileOrigin ?? null,
  };
  const validation = validateNimiAIConfig(normalized);
  if (!validation.valid) {
    throw new Error(`AIConfig validation failed: ${validation.errors.join('; ')}`);
  }
  return normalized;
}

function rememberShijingAIConfig(next: NimiAIConfig, scopeRef: NimiAIScopeRef = next.scopeRef): NimiAIConfig {
  const normalized = normalizeShijingAIConfig(next, scopeRef);
  const scopeKey = encodeNimiAIScopeRef(scopeRef);
  shellHydratedConfigs.set(scopeKey, cloneAIConfig(normalized));
  configSubscriptions.notify(normalized);
  return normalized;
}

const aiConfigStore: NimiAIConfigStore = {
  has(scopeRef) {
    return shellHydratedConfigs.has(encodeNimiAIScopeRef(scopeRef));
  },
  loadOrNull(scopeRef) {
    const config = shellHydratedConfigs.get(encodeNimiAIScopeRef(scopeRef));
    return config ? cloneAIConfig(config) : null;
  },
  load(scopeRef) {
    return aiConfigStore.loadOrNull(scopeRef) ?? createEmptyNimiAIConfig(scopeRef);
  },
  save(config) {
    return rememberShijingAIConfig(config, config.scopeRef);
  },
  listScopeRefs() {
    return [...shellHydratedConfigs.values()].map((config) => config.scopeRef);
  },
};

export function loadShijingAIConfig(
  scopeRef: NimiAIScopeRef = createShijingReadingAIScopeRef(),
): NimiAIConfig {
  return aiConfigStore.load(scopeRef);
}

export async function hydrateShijingAIConfigFromShell(
  scopeRef: NimiAIScopeRef = createShijingReadingAIScopeRef(),
): Promise<NimiAIConfig | null> {
  const scopeKey = encodeNimiAIScopeRef(scopeRef);
  const standardShell = createInstalledNimiAppStandardShellSurface();
  try {
    const config = parseShellAIConfig(await standardShell.aiConfig.get(scopeKey), scopeRef);
    return rememberShijingAIConfig(config, scopeRef);
  } catch (error) {
    if (isStandardShellAIConfigNotFound(error)) {
      rememberShijingAIConfig(createEmptyNimiAIConfig(scopeRef), scopeRef);
      return null;
    }
    throw error;
  }
}

function parseShellAIConfig(value: JsonObject, scopeRef: NimiAIScopeRef): NimiAIConfig {
  const validation = validateNimiAIConfig(value);
  if (!validation.valid) {
    throw new Error(`ShiJing standard shell AIConfig is invalid: ${validation.errors.join('; ')}`);
  }
  const config = value as unknown as NimiAIConfig;
  if (!areNimiAIScopeRefsEqual(config.scopeRef, scopeRef)) {
    throw new Error('ShiJing standard shell AIConfig scopeRef does not match shijing.reading.');
  }
  return config;
}

function isStandardShellAIConfigNotFound(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error || '');
  return /ai-config-scope-not-found|scope-not-found|not-found/i.test(text);
}

export async function commitShijingAIConfigToShell(
  next: NimiAIConfig,
  scopeRef: NimiAIScopeRef = createShijingReadingAIScopeRef(),
  options?: { readonly expectedBaseVersion?: string },
): Promise<NimiAIConfig> {
  const normalized = normalizeShijingAIConfig(next, scopeRef);
  const expectedBaseVersion = options?.expectedBaseVersion?.trim();
  if (expectedBaseVersion) {
    const currentVersion = versionNimiAIConfig(loadShijingAIConfig(scopeRef));
    if (currentVersion !== expectedBaseVersion) {
      throw new Error('AIConfig CAS conflict: baseVersion is stale');
    }
  }
  const scopeKey = encodeNimiAIScopeRef(scopeRef);
  const standardShell = createInstalledNimiAppStandardShellSurface();
  const saved = parseShellAIConfig(
    await standardShell.aiConfig.set(scopeKey, normalized as unknown as JsonObject),
    scopeRef,
  );
  return rememberShijingAIConfig(saved, scopeRef);
}

export function createShijingAIConfigService(): SharedAIConfigService {
  const surface = createNimiAIHostSurface({
    configStore: aiConfigStore,
    subscriptions: configSubscriptions,
    profiles: [],
  });

  return {
    aiConfig: {
      get(scopeRef: NimiAIScopeRef): NimiAIConfig {
        return loadShijingAIConfig(scopeRef);
      },
      async update(scopeRef: NimiAIScopeRef, next: NimiAIConfig): Promise<void> {
        await commitShijingAIConfigToShell(next, scopeRef);
      },
      subscribe(
        scopeRef: NimiAIScopeRef,
        listener: SharedAIConfigSubscribeListener,
      ): SharedAIConfigUnsubscribe {
        return configSubscriptions.subscribe(scopeRef, listener);
      },
    },
    aiProfile: {
      list: async () => [...(await surface.aiProfile.list())],
      previewApply: (scopeRef, profileId, options) => surface.aiProfile.previewApply(scopeRef, profileId, options),
      apply: async (scopeRef, profileId, options) => {
        const preview = await surface.aiProfile.previewApply(scopeRef, profileId, {
          requirementDeclarations: options.requirementDeclarations,
        });
        if (preview.outcome !== 'ready_to_apply' || !preview.after) {
          return {
            success: false,
            config: null,
            failureReason: preview.outcome,
            outcome: preview.outcome,
            setupProjection: preview.setupProjection,
            probeWarnings: preview.probeWarnings,
          };
        }
        if (options.expectedBaseVersion && options.expectedBaseVersion !== preview.baseVersion) {
          return {
            success: false,
            config: null,
            failureReason: 'stale_base',
            outcome: 'stale_base',
            probeWarnings: [],
          };
        }
        return {
          success: true,
          config: preview.after,
          failureReason: null,
          outcome: 'ready_to_apply',
          probeWarnings: [],
        };
      },
    },
  };
}
