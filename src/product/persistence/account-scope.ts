import { validateShiJingSpace } from '../../contracts/shijing-space-validator.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import type {
  LoadResult,
  PersistenceAdapterKind,
  PersistenceError,
} from './persistence-client.ts';

export function normalizePersistenceAccountId(value: string): string {
  return value.trim();
}

export function validateLoadedSnapshotForAccount(
  raw: unknown,
  adapter: PersistenceAdapterKind,
  expectedUserId: string,
): LoadResult {
  const validation = validateShiJingSpace(raw);
  if (!validation.ok) {
    return {
      ok: false,
      error: {
        kind: 'load_invalid_snapshot',
        adapter,
        validation_error: validation.error,
      },
    };
  }
  const snapshot = raw as ShiJingSpace;
  const mismatch = snapshotAccountMismatchError('load', adapter, snapshot, expectedUserId);
  if (mismatch) return { ok: false, error: mismatch };
  return { ok: true, snapshot };
}

export function snapshotAccountMismatchError(
  operation: 'load' | 'save',
  adapter: PersistenceAdapterKind,
  snapshot: ShiJingSpace,
  expectedUserId: string,
): PersistenceError | null {
  const expected = normalizePersistenceAccountId(expectedUserId);
  const actual = normalizePersistenceAccountId(snapshot.user_id);
  if (actual === expected) return null;
  return operation === 'load'
    ? {
        kind: 'load_account_mismatch',
        adapter,
        expected_user_id: expected,
        snapshot_user_id: actual,
      }
    : {
        kind: 'save_account_mismatch',
        adapter,
        expected_user_id: expected,
        snapshot_user_id: actual,
      };
}
