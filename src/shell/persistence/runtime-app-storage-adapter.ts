// Runtime-owned app storage persistence adapter for ShiJingSpace.

import type { NimiClient } from '@nimiplatform/sdk';
import { resolveNimiRuntimeAppStorageRoots } from '@nimiplatform/sdk/runtime';
import {
  invoke,
  toShellBridgeNimiError,
  type JsonObject,
} from '@nimiplatform/kit/shell/renderer/bridge';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import { dropIncompatibleReadings } from '../../product/persistence/sanitize-loaded-space.ts';
import { SHIJING_APP_ID } from '../../contracts/app-identity.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import type {
  ClearResult,
  LoadResult,
  PersistenceClient,
  SaveResult,
} from '../../product/persistence/persistence-client.ts';
import { getShijingNimiClient } from '../infra/shijing-nimi-client.ts';

const STORAGE_LABEL = 'shijing app';

export interface RuntimeAppStoragePersistenceAdapterOptions {
  readonly getClient?: () => NimiClient;
}

export class RuntimeAppStoragePersistenceAdapter implements PersistenceClient {
  readonly adapter_kind = 'runtime_app_storage' as const;
  private readonly getClient: () => NimiClient;

  constructor(options: RuntimeAppStoragePersistenceAdapterOptions = {}) {
    this.getClient = options.getClient ?? (() => getShijingNimiClient());
  }

  async load(): Promise<LoadResult> {
    let root: string;
    try {
      root = await this.dataRoot();
    } catch (cause) {
      return {
        ok: false,
        error: {
          kind: 'load_open_failed',
          adapter: this.adapter_kind,
          cause: errorMessage(cause),
        },
      };
    }
    let raw: string | null | undefined;
    try {
      raw = await invokeShijingCommand<string | null | undefined>('shijing_space_load', {
        payload: { storageRoot: root },
      });
    } catch (cause) {
      return {
        ok: false,
        error: {
          kind: 'load_read_failed',
          adapter: this.adapter_kind,
          cause: errorMessage(cause),
        },
      };
    }
    if (raw === null || raw === undefined) return { ok: true, snapshot: null };
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (cause) {
      return {
        ok: false,
        error: {
          kind: 'load_read_failed',
          adapter: this.adapter_kind,
          cause: `stored JSON parse failed: ${errorMessage(cause)}`,
        },
      };
    }
    // Pre-release hard-cut recovery: drop Readings persisted under the old
    // pre-envelope schema (and Conversations citing them) so a valid profile
    // still loads instead of failing the whole space. Self-heals on next save.
    const sanitized = dropIncompatibleReadings(parsed as ShiJingSpace).space;
    const validation = validateShiJingSpace(sanitized);
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
    return { ok: true, snapshot: sanitized };
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
    let root: string;
    try {
      root = await this.dataRoot();
    } catch (cause) {
      return {
        ok: false,
        error: {
          kind: 'save_write_failed',
          adapter: this.adapter_kind,
          cause: errorMessage(cause),
        },
      };
    }
    try {
      await invokeShijingCommand('shijing_space_save', {
        payload: {
          storageRoot: root,
          snapshotJson: JSON.stringify(snapshot),
        },
      });
      return { ok: true };
    } catch (cause) {
      return {
        ok: false,
        error: {
          kind: 'save_write_failed',
          adapter: this.adapter_kind,
          cause: errorMessage(cause),
        },
      };
    }
  }

  async clear(): Promise<ClearResult> {
    let root: string;
    try {
      root = await this.dataRoot();
    } catch (cause) {
      return {
        ok: false,
        error: {
          kind: 'clear_failed',
          adapter: this.adapter_kind,
          cause: errorMessage(cause),
        },
      };
    }
    try {
      await invokeShijingCommand('shijing_space_clear', { payload: { storageRoot: root } });
      return { ok: true };
    } catch (cause) {
      return {
        ok: false,
        error: {
          kind: 'clear_failed',
          adapter: this.adapter_kind,
          cause: errorMessage(cause),
        },
      };
    }
  }

  private async dataRoot(): Promise<string> {
    const client = this.getClient();
    await client.runtime.ready();
    const roots = await resolveNimiRuntimeAppStorageRoots({
      appLifecycle: client.runtime.appLifecycle,
      appId: SHIJING_APP_ID,
      label: STORAGE_LABEL,
    });
    return roots.dataRoot;
  }
}

async function invokeShijingCommand<T = void>(
  command: string,
  args?: JsonObject,
): Promise<T> {
  try {
    return await invoke(command, args ?? {}) as T;
  } catch (error) {
    throw toShellBridgeNimiError(error);
  }
}

function errorMessage(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  if (typeof cause === 'string') return cause;
  return String(cause || 'unknown error');
}
