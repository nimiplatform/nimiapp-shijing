// Standard-shell app storage persistence adapter for ShiJingSpace.

import {
  createInstalledNimiAppStandardShellSurface,
  toShellBridgeNimiError,
  type InstalledNimiAppStandardShellSurface,
  type JsonValue,
} from '@nimiplatform/kit/shell/renderer/bridge';
import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import {
  normalizePersistenceAccountId,
  snapshotAccountMismatchError,
  validateLoadedSnapshotForAccount,
} from '../../product/persistence/account-scope.ts';
import type {
  ClearResult,
  LoadResult,
  PersistenceClient,
  SaveResult,
} from '../../product/persistence/persistence-client.ts';

export interface RuntimeAppStoragePersistenceAdapterOptions {
  readonly user_id: string;
  readonly standardShell?: InstalledNimiAppStandardShellSurface;
}

export class RuntimeAppStoragePersistenceAdapter implements PersistenceClient {
  readonly adapter_kind = 'runtime_app_storage' as const;
  private readonly user_id: string;
  private readonly standardShell: InstalledNimiAppStandardShellSurface;

  constructor(options: RuntimeAppStoragePersistenceAdapterOptions) {
    this.user_id = requireRuntimeStorageUserId(options.user_id);
    this.standardShell = options.standardShell ?? createInstalledNimiAppStandardShellSurface();
  }

  async load(): Promise<LoadResult> {
    let parsed: unknown;
    try {
      parsed = await this.standardShell.storage.readJson(this.relativePath());
    } catch (cause) {
      const shellError = toShellBridgeNimiError(cause);
      if (isNotFoundShellError(shellError)) return { ok: true, snapshot: null };
      return {
        ok: false,
        error: {
          kind: 'load_read_failed',
          adapter: this.adapter_kind,
          cause: errorMessage(shellError),
        },
      };
    }
    return validateLoadedSnapshotForAccount(parsed, this.adapter_kind, this.user_id);
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
    const accountError = snapshotAccountMismatchError('save', this.adapter_kind, snapshot, this.user_id);
    if (accountError) return { ok: false, error: accountError };
    try {
      await this.standardShell.storage.writeJson(this.relativePath(), snapshotToStorageJson(snapshot));
      return { ok: true };
    } catch (cause) {
      return {
        ok: false,
        error: {
          kind: 'save_write_failed',
          adapter: this.adapter_kind,
          cause: errorMessage(toShellBridgeNimiError(cause)),
        },
      };
    }
  }

  async clear(): Promise<ClearResult> {
    try {
      await this.standardShell.storage.removeJson(this.relativePath());
      return { ok: true };
    } catch (cause) {
      return {
        ok: false,
        error: {
          kind: 'clear_failed',
          adapter: this.adapter_kind,
          cause: errorMessage(toShellBridgeNimiError(cause)),
        },
      };
    }
  }

  private relativePath(): string {
    return `shijing-space/account.${accountIdToHex(this.user_id)}.json`;
  }
}

function requireRuntimeStorageUserId(value: string): string {
  const userId = normalizePersistenceAccountId(value);
  if (!userId) {
    throw new Error('Runtime app storage user_id is required');
  }
  return userId;
}

function accountIdToHex(value: string): string {
  return [...new TextEncoder().encode(value)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function snapshotToStorageJson(snapshot: ShiJingSpace): JsonValue {
  return snapshot as unknown as JsonValue;
}

function isNotFoundShellError(cause: unknown): boolean {
  return Boolean(cause && typeof cause === 'object' && (cause as { code?: unknown }).code === 'not-found');
}

function errorMessage(cause: unknown): string {
  const structured = structuredErrorMessage(cause);
  if (structured) return structured;
  if (cause instanceof Error) return cause.message;
  if (typeof cause === 'string') return cause;
  return String(cause || 'unknown error');
}

function structuredErrorMessage(cause: unknown): string {
  if (!cause || typeof cause !== 'object') return '';
  const record = cause as Record<string, unknown>;
  const details = record.details && typeof record.details === 'object' && !Array.isArray(record.details)
    ? record.details as Record<string, unknown>
    : undefined;
  return normalizeErrorText(details?.cause)
    || normalizeErrorText(details?.message)
    || normalizeErrorText(details?.rawMessage)
    || normalizeErrorText(record.message);
}

function normalizeErrorText(value: unknown): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized === '[object Object]' ? '' : normalized;
}
