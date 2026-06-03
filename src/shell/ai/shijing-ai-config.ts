import {
  aiConfigScopeKeyFromRef,
  computeAIConfigVersion,
  createAIConfigSubscriptionRegistry,
  createAppAIScopeRef,
  createHostAIProfileSurface,
  createScopedAIConfigStore,
  validateAIConfigRuntimeBindings,
  type AIConfig,
  type AIConfigStorageLike,
  type AIProfile,
  type AIScopeRef,
} from '@nimiplatform/sdk/ai';
import type {
  SharedAIConfigService,
  SharedAIConfigSubscribeListener,
  SharedAIConfigUnsubscribe,
} from '@nimiplatform/kit/features/model-config/headless';
import { resolveBrowserStorage } from '@nimiplatform/kit/core/storage-json';
import { SHIJING_APP_ID } from '../../contracts/app-identity.ts';

export const SHIJING_READING_AI_SURFACE_ID = 'shijing.reading';
export const SHIJING_AI_CONFIG_STORAGE_KEY = 'nimiapp-shijing:reading-ai-config:v1';
export const SHIJING_AI_PROFILE_LIBRARY_STORAGE_KEY = 'nimiapp-shijing:reading-ai-profiles:v1';
export const SHIJING_AI_PROFILE_LIBRARY_SCHEMA_VERSION = 1;

type ShijingAIProfileLibraryStore = {
  schemaVersion: typeof SHIJING_AI_PROFILE_LIBRARY_SCHEMA_VERSION;
  profiles: AIProfile[];
};

const configSubscriptions = createAIConfigSubscriptionRegistry({
  resolveScopeKey: (config) => aiConfigScopeKeyFromRef(config.scopeRef),
  cloneOnNotify: true,
});

const ephemeralProfiles: AIProfile[] = [];

function getStorage(): Storage | null {
  return resolveBrowserStorage('local');
}

function useEphemeralStore(): boolean {
  return typeof window === 'undefined';
}

const aiConfigStore = createScopedAIConfigStore({
  storage: () => getStorage() as AIConfigStorageLike | null,
  configKeyForScope: () => SHIJING_AI_CONFIG_STORAGE_KEY,
  validateRuntimeBindings: true,
  enableEphemeralStore: useEphemeralStore(),
});

export function createShijingReadingAIScopeRef(): AIScopeRef {
  return createAppAIScopeRef(SHIJING_APP_ID, SHIJING_READING_AI_SURFACE_ID);
}

function defaultProfileLibraryStore(): ShijingAIProfileLibraryStore {
  return {
    schemaVersion: SHIJING_AI_PROFILE_LIBRARY_SCHEMA_VERSION,
    profiles: [],
  };
}

function parseProfileLibrary(raw: string): ShijingAIProfileLibraryStore {
  const parsed = JSON.parse(raw) as Partial<ShijingAIProfileLibraryStore>;
  if (
    parsed.schemaVersion !== SHIJING_AI_PROFILE_LIBRARY_SCHEMA_VERSION
    || !Array.isArray(parsed.profiles)
  ) {
    throw new Error('Stored ShiJing AIProfile library schema is invalid.');
  }
  return {
    schemaVersion: SHIJING_AI_PROFILE_LIBRARY_SCHEMA_VERSION,
    profiles: [...parsed.profiles],
  };
}

function loadProfileLibraryStore(storage: Storage | null = getStorage()): ShijingAIProfileLibraryStore {
  if (!storage) {
    if (!useEphemeralStore()) {
      throw new Error('ShiJing AIProfile library requires browser local storage.');
    }
    return {
      schemaVersion: SHIJING_AI_PROFILE_LIBRARY_SCHEMA_VERSION,
      profiles: [...ephemeralProfiles],
    };
  }
  const raw = storage.getItem(SHIJING_AI_PROFILE_LIBRARY_STORAGE_KEY);
  return raw ? parseProfileLibrary(raw) : defaultProfileLibraryStore();
}

export function listShijingAIProfiles(): AIProfile[] {
  return [...loadProfileLibraryStore().profiles];
}

export function loadShijingAIConfig(
  scopeRef: AIScopeRef = createShijingReadingAIScopeRef(),
): AIConfig {
  try {
    return aiConfigStore.load(scopeRef);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith('AIConfig binding is invalid: ')) {
      throw new Error(`Stored ${message}`, { cause: error });
    }
    if (message === 'AIConfig schema is invalid.') {
      throw new Error('Stored ShiJing AIConfig scope does not match shijing.reading.', {
        cause: error,
      });
    }
    throw error;
  }
}

export function saveShijingAIConfig(
  next: AIConfig,
  scopeRef: AIScopeRef = createShijingReadingAIScopeRef(),
  options?: { readonly expectedBaseVersion?: string },
): AIConfig {
  const normalized = { ...next, scopeRef };
  const expectedBaseVersion = options?.expectedBaseVersion?.trim();
  if (expectedBaseVersion) {
    const currentVersion = computeAIConfigVersion(loadShijingAIConfig(scopeRef));
    if (currentVersion !== expectedBaseVersion) {
      throw new Error('AIConfig CAS conflict: baseVersion is stale');
    }
  }
  const bindingErrors = validateAIConfigRuntimeBindings(normalized);
  if (bindingErrors.length > 0) {
    throw new Error(`AIConfig binding validation failed: ${bindingErrors.join('; ')}`);
  }
  const saved = aiConfigStore.save(normalized);
  configSubscriptions.notify(saved);
  return saved;
}

export function createShijingAIConfigService(): SharedAIConfigService {
  const aiProfile = createHostAIProfileSurface({
    listProfiles: () => listShijingAIProfiles(),
    loadConfig: (scopeRef) => loadShijingAIConfig(scopeRef),
    saveConfig: (scopeRef, next, options) => saveShijingAIConfig(next, scopeRef, options),
    missingProfileMessage: (profileId) =>
      `AIProfile ${profileId} is not in the ShiJing profile library.`,
  });

  return {
    aiConfig: {
      get(scopeRef: AIScopeRef): AIConfig {
        return loadShijingAIConfig(scopeRef);
      },
      update(scopeRef: AIScopeRef, next: AIConfig): void {
        saveShijingAIConfig(next, scopeRef);
      },
      subscribe(
        scopeRef: AIScopeRef,
        listener: SharedAIConfigSubscribeListener,
      ): SharedAIConfigUnsubscribe {
        return configSubscriptions.subscribe(aiConfigScopeKeyFromRef(scopeRef), listener);
      },
    },
    aiProfile: {
      list: () => aiProfile.list(),
      previewApply: (scopeRef, profileId) => aiProfile.previewApply(scopeRef, profileId),
      apply: (scopeRef, profileId, options) => aiProfile.apply(scopeRef, profileId, options),
    },
  };
}
