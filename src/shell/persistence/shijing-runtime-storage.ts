import type { NimiLocalAppClient } from '@nimiplatform/sdk/app';
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

type ShijingStorageClient = Pick<NimiLocalAppClient, 'storage'>;

// @nimi-authority: rule.nimi.sdks.feature-clients.r035
// @nimi-authority: rule.shijing.data-model.r002
export class ShijingRuntimeStoragePersistenceClient implements PersistenceClient {
  readonly adapter_kind = 'nimi_storage' as const;
  private readonly client: ShijingStorageClient;
  private readonly relativePath: string;

  constructor(
    client: ShijingStorageClient,
    relativePath = SHIJING_SPACE_STORAGE_PATH,
  ) {
    this.client = client;
    this.relativePath = relativePath;
  }

  async load(): Promise<LoadResult> {
    let value: unknown;
    try {
      value = (await this.client.storage.readJson(this.relativePath)).value;
    } catch (error) {
      const evidence = normalizeShijingLocalAppError(error);
      if (evidence.reasonCode === 'not-found') {
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
      await this.client.storage.writeJson(this.relativePath, snapshot as never);
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
      await this.client.storage.removeJson(this.relativePath);
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
  readonly reasonCode: string;
  readonly actionHint: string;
  readonly message: string;
}): string {
  return `${evidence.reasonCode}: ${evidence.message} [${evidence.actionHint}]`;
}
