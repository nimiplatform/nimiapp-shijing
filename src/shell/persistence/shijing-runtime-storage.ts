import type { NimiAppScope } from '@nimiplatform/kit/core/app-session';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import type {
  ClearResult,
  LoadResult,
  PersistenceClient,
  SaveResult,
} from '../../product/persistence/persistence-client.ts';
import { normalizeShijingLocalAppError } from '../local-development/shijing-local-app-runtime.ts';

export const SHIJING_SPACE_STORAGE_PATH = 'product/shijing-space.json';

type ShijingStorageScope = { client: Pick<NimiAppScope['client'], 'storage'>; signal: AbortSignal };

// @nimi-authority: rule.nimi.sdks.feature-clients.r035
// @nimi-authority: rule.shijing.data-model.r002
export class ShijingRuntimeStoragePersistenceClient implements PersistenceClient {
  readonly adapter_kind = 'nimi_storage' as const;
  private readonly scope: ShijingStorageScope;
  private readonly relativePath: string;

  constructor(
    scope: ShijingStorageScope,
    relativePath = SHIJING_SPACE_STORAGE_PATH,
  ) {
    this.scope = scope;
    this.relativePath = relativePath;
  }

  async load(): Promise<LoadResult> {
    let value: unknown;
    try {
      this.scope.signal.throwIfAborted();
      const result = await this.scope.client.storage.assets.read({ relativePath: this.relativePath });
      const decoder = new TextDecoder('utf-8', { fatal: true });
      let text = '';
      for await (const chunk of result.body) { this.scope.signal.throwIfAborted(); text += decoder.decode(chunk, { stream: true }); }
      this.scope.signal.throwIfAborted();
      text += decoder.decode();
      value = JSON.parse(text);
    } catch (error) {
      const evidence = normalizeShijingLocalAppError(error);
      if (!this.scope.signal.aborted && (evidence.code === 'not-found' || evidence.reasonCode === 'APP_STORAGE_ENTRY_NOT_FOUND')) {
        return { ok: true, snapshot: null };
      }
      return {
        ok: false,
        error: {
          kind: 'load_read_failed',
          adapter: this.adapter_kind,
          cause: persistenceCause(evidence),
        },
      };
    }
    const validation = validateShiJingSpace(value);
    if (!validation.ok) {
      return {
        ok: false,
        error: {
          kind: 'load_invalid_snapshot',
          adapter: this.adapter_kind,
          validation_error: validation.error,
        },
      };
    }
    return { ok: true, snapshot: value as ShiJingSpace };
  }

  async save(snapshot: ShiJingSpace): Promise<SaveResult> {
    const validation = validateShiJingSpace(snapshot);
    if (!validation.ok) {
      return {
        ok: false,
        error: {
          kind: 'save_validation_failed',
          adapter: this.adapter_kind,
          validation_error: validation.error,
        },
      };
    }
    try {
      this.scope.signal.throwIfAborted();
      await this.scope.client.storage.assets.write({
        relativePath: this.relativePath,
        body: new TextEncoder().encode(JSON.stringify(snapshot)),
        mediaType: 'application/json',
        overwrite: true,
      });
      this.scope.signal.throwIfAborted();
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: {
          kind: 'save_write_failed',
          adapter: this.adapter_kind,
          cause: persistenceCause(normalizeShijingLocalAppError(error)),
        },
      };
    }
  }

  async clear(): Promise<ClearResult> {
    try {
      this.scope.signal.throwIfAborted();
      await this.scope.client.storage.assets.remove(this.relativePath);
      this.scope.signal.throwIfAborted();
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: {
          kind: 'clear_failed',
          adapter: this.adapter_kind,
          cause: persistenceCause(normalizeShijingLocalAppError(error)),
        },
      };
    }
  }
}

function persistenceCause(evidence: {
  readonly code: string;
  readonly reasonCode: string;
  readonly actionHint: string;
  readonly message: string;
}): string {
  return `${evidence.reasonCode}: ${evidence.message} [${evidence.actionHint}]`;
}
