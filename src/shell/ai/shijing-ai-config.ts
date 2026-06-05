import {
  createNimiAIConfigStore,
  createNimiAIConfigSubscriptionRegistry,
  createNimiAIHostSurface,
  createNimiAppAIScopeRef,
  validateNimiAIConfig,
  versionNimiAIConfig,
  type NimiAIConfig,
  type NimiAIHostStorage,
  type NimiAIProfile,
  type NimiAIScopeRef,
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
  profiles: NimiAIProfile[];
};

const configSubscriptions = createNimiAIConfigSubscriptionRegistry();

const ephemeralProfiles: NimiAIProfile[] = [];

function getStorage(): Storage | null {
  return resolveBrowserStorage('local');
}

function useEphemeralStore(): boolean {
  return typeof window === 'undefined';
}

const aiConfigStore = createNimiAIConfigStore({
  storage: () => getStorage() as NimiAIHostStorage | null,
  configKeyForScope: () => SHIJING_AI_CONFIG_STORAGE_KEY,
  enableEphemeralStore: useEphemeralStore(),
});

export function createShijingReadingAIScopeRef(): NimiAIScopeRef {
  return createNimiAppAIScopeRef(SHIJING_APP_ID, SHIJING_READING_AI_SURFACE_ID);
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

export function listShijingAIProfiles(): NimiAIProfile[] {
  return [...loadProfileLibraryStore().profiles];
}

export function loadShijingAIConfig(
  scopeRef: NimiAIScopeRef = createShijingReadingAIScopeRef(),
): NimiAIConfig {
  try {
    return aiConfigStore.load(scopeRef);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith('AIConfig targetRef is invalid: ')) {
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
  next: NimiAIConfig,
  scopeRef: NimiAIScopeRef = createShijingReadingAIScopeRef(),
  options?: { readonly expectedBaseVersion?: string },
): NimiAIConfig {
  const normalized = { ...next, scopeRef };
  const expectedBaseVersion = options?.expectedBaseVersion?.trim();
  if (expectedBaseVersion) {
    const currentVersion = versionNimiAIConfig(loadShijingAIConfig(scopeRef));
    if (currentVersion !== expectedBaseVersion) {
      throw new Error('AIConfig CAS conflict: baseVersion is stale');
    }
  }
  const validation = validateNimiAIConfig(normalized);
  if (!validation.valid) {
    throw new Error(`AIConfig validation failed: ${validation.errors.join('; ')}`);
  }
  const saved = aiConfigStore.save(normalized);
  configSubscriptions.notify(saved);
  return saved;
}

export function createShijingAIConfigService(): SharedAIConfigService {
  const surface = createNimiAIHostSurface({
    configStore: aiConfigStore,
    subscriptions: configSubscriptions,
    profiles: listShijingAIProfiles(),
  });

  return {
    aiConfig: {
      get(scopeRef: NimiAIScopeRef): NimiAIConfig {
        return loadShijingAIConfig(scopeRef);
      },
      update(scopeRef: NimiAIScopeRef, next: NimiAIConfig): void {
        saveShijingAIConfig(next, scopeRef);
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
      previewApply: (scopeRef, profileId) => surface.aiProfile.previewApply(scopeRef, profileId),
      apply: (scopeRef, profileId, options) => surface.aiProfile.apply(scopeRef, profileId, options),
    },
  };
}
