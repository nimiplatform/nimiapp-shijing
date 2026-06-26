import {
  areNimiAIScopeRefsEqual,
  createNimiAIConfigStore,
  createNimiAIConfigSubscriptionRegistry,
  createNimiAIHostSurface,
  createNimiAppAIScopeRef,
  encodeNimiAIScopeRef,
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
export const SHIJING_AI_CONFIG_STORAGE_PREFIX = 'nimiapp-shijing:reading-ai-config:v2';
export const SHIJING_AI_CONFIG_INDEX_KEY = `${SHIJING_AI_CONFIG_STORAGE_PREFIX}:index`;
export const SHIJING_AI_CONFIG_QUARANTINE_PREFIX = `${SHIJING_AI_CONFIG_STORAGE_PREFIX}:quarantine:`;
export const SHIJING_AI_PROFILE_LIBRARY_STORAGE_KEY = 'nimiapp-shijing:reading-ai-profiles:v1';
export const SHIJING_AI_PROFILE_LIBRARY_SCHEMA_VERSION = 1;

type ShijingAIProfileLibraryStore = {
  schemaVersion: typeof SHIJING_AI_PROFILE_LIBRARY_SCHEMA_VERSION;
  profiles: NimiAIProfile[];
};

export type ShijingAIConfigStorageRepairResult = {
  readonly scanned: number;
  readonly quarantined: number;
  readonly removedScopeKeys: readonly string[];
  readonly quarantineKeys: readonly string[];
};

type ShijingAIConfigStorageRepairOptions = {
  readonly now?: () => string;
};

const configSubscriptions = createNimiAIConfigSubscriptionRegistry();

const ephemeralProfiles: NimiAIProfile[] = [];

function isStorageLike(value: unknown): value is Storage {
  return Boolean(value)
    && typeof (value as Storage).getItem === 'function'
    && typeof (value as Storage).setItem === 'function'
    && typeof (value as Storage).removeItem === 'function';
}

function getStorage(): Storage | null {
  const storage = resolveBrowserStorage('local');
  return isStorageLike(storage) ? storage : null;
}

function useEphemeralStore(): boolean {
  return typeof window === 'undefined';
}

const aiConfigStore = createNimiAIConfigStore({
  indexKey: SHIJING_AI_CONFIG_INDEX_KEY,
  storage: () => getStorage() as NimiAIHostStorage | null,
  configKeyForScope: shijingAIConfigStorageKeyForScopeKey,
  enableEphemeralStore: useEphemeralStore(),
});

export function createShijingReadingAIScopeRef(): NimiAIScopeRef {
  return createNimiAppAIScopeRef(SHIJING_APP_ID, SHIJING_READING_AI_SURFACE_ID);
}

function shijingAIConfigStorageKeyForScopeKey(scopeKey: string): string {
  return `${SHIJING_AI_CONFIG_STORAGE_PREFIX}:${scopeKey}`;
}

function removeStorageItem(storage: NimiAIHostStorage, key: string): void {
  if (storage.removeItem) {
    storage.removeItem(key);
    return;
  }
  storage.setItem(key, '');
}

function readScopeIndex(storage: NimiAIHostStorage): string[] {
  const raw = storage.getItem(SHIJING_AI_CONFIG_INDEX_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

function removeScopeKeyFromIndex(storage: NimiAIHostStorage, scopeKey: string): void {
  const next = readScopeIndex(storage).filter((entry) => entry !== scopeKey);
  storage.setItem(SHIJING_AI_CONFIG_INDEX_KEY, JSON.stringify([...new Set(next)].sort()));
}

function uniqueShijingAIConfigQuarantineKey(
  storage: NimiAIHostStorage,
  scopeKey: string,
  quarantinedAt: string,
): string {
  const base = `${SHIJING_AI_CONFIG_QUARANTINE_PREFIX}${encodeURIComponent(scopeKey)}:${encodeURIComponent(quarantinedAt)}`;
  let candidate = base;
  let index = 1;
  while (storage.getItem(candidate) !== null) {
    candidate = `${base}:${index}`;
    index += 1;
  }
  return candidate;
}

function storedAIConfigInvalidReason(raw: string, scopeRef: NimiAIScopeRef): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return error instanceof Error ? error.message : String(error || 'Invalid stored AIConfig JSON.');
  }
  const validation = validateNimiAIConfig(parsed);
  if (!validation.valid) {
    return validation.errors.join('; ');
  }
  const config = parsed as NimiAIConfig;
  if (!areNimiAIScopeRefsEqual(config.scopeRef, scopeRef)) {
    return 'Stored AIConfig scopeRef does not match ShiJing scopeRef.';
  }
  return null;
}

export function repairShijingAIConfigStorageForScope(
  scopeRef: NimiAIScopeRef = createShijingReadingAIScopeRef(),
  storage: NimiAIHostStorage | null = getStorage() as NimiAIHostStorage | null,
  options: ShijingAIConfigStorageRepairOptions = {},
): ShijingAIConfigStorageRepairResult {
  if (!storage) {
    return { scanned: 0, quarantined: 0, removedScopeKeys: [], quarantineKeys: [] };
  }
  const scopeKey = encodeNimiAIScopeRef(scopeRef);
  const storageKey = shijingAIConfigStorageKeyForScopeKey(scopeKey);
  const raw = storage.getItem(storageKey);
  if (!raw) {
    removeScopeKeyFromIndex(storage, scopeKey);
    return { scanned: 0, quarantined: 0, removedScopeKeys: [], quarantineKeys: [] };
  }
  const reason = storedAIConfigInvalidReason(raw, scopeRef);
  if (!reason) {
    return { scanned: 1, quarantined: 0, removedScopeKeys: [], quarantineKeys: [] };
  }

  const quarantinedAt = options.now?.() ?? new Date().toISOString();
  const quarantineKey = uniqueShijingAIConfigQuarantineKey(storage, scopeKey, quarantinedAt);
  storage.setItem(quarantineKey, JSON.stringify({
    schemaVersion: 1,
    reasonCode: 'SHIJING_AI_CONFIG_STORE_INVALID',
    reason,
    scopeKey,
    originalKey: storageKey,
    quarantinedAt,
    raw,
  }));
  removeStorageItem(storage, storageKey);
  removeScopeKeyFromIndex(storage, scopeKey);
  return {
    scanned: 1,
    quarantined: 1,
    removedScopeKeys: [scopeKey],
    quarantineKeys: [quarantineKey],
  };
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
  repairShijingAIConfigStorageForScope(scopeRef);
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
  repairShijingAIConfigStorageForScope(scopeRef);
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
      previewApply: (scopeRef, profileId, options) => {
        repairShijingAIConfigStorageForScope(scopeRef);
        return surface.aiProfile.previewApply(scopeRef, profileId, options);
      },
      apply: (scopeRef, profileId, options) => {
        repairShijingAIConfigStorageForScope(scopeRef);
        return surface.aiProfile.apply(scopeRef, profileId, options);
      },
    },
  };
}
