// W05 — product area route. Wires the ShijingStoreProvider against the
// new four-mirror shell.

import { useMemo } from 'react';
import { useAppStore } from '../app-shell/app-store.js';
import { ShijingStoreProvider } from '../../product/state/shijing-store.tsx';
import { ShijingShell } from '../../product/shell/shijing-shell.tsx';
import { IndexedDBPersistenceAdapter } from '../../product/persistence/indexeddb-adapter.ts';
import { InMemoryPersistenceAdapter } from '../../product/persistence/in-memory-adapter.ts';
import {
  buildEmptyShiJingSpace,
  buildMockShiJingSpace,
} from '../../product/dev/mock-snapshot.ts';
import type { PersistenceClient } from '../../product/persistence/persistence-client.ts';

function pickPersistenceClient(userId: string): PersistenceClient {
  // In DEV the snapshot comes from `buildMockShiJingSpace`, which seeds
  // demo readings (NianJing long-horizon, etc.). IndexedDB would
  // overwrite that seed with a previously-persisted empty snapshot on
  // every reload, masking the demo. In-memory keeps the seeded mock
  // visible across reloads. Production still uses IndexedDB.
  if (import.meta.env?.DEV === true) {
    return new InMemoryPersistenceAdapter();
  }
  if (IndexedDBPersistenceAdapter.isSupported()) {
    return new IndexedDBPersistenceAdapter({ user_id: userId });
  }
  return new InMemoryPersistenceAdapter();
}

export function ProductArea() {
  const user = useAppStore((s) => s.auth.user);
  const userId = user?.id ?? '';
  const snapshot = useMemo(
    () =>
      import.meta.env?.DEV === true
        ? buildMockShiJingSpace(userId)
        : buildEmptyShiJingSpace(userId),
    [userId],
  );
  const persistenceClient = useMemo(() => pickPersistenceClient(userId), [userId]);

  if (!userId) {
    return null;
  }

  const account = {
    ...(user?.displayName ? { name: user.displayName } : {}),
    ...(user?.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
  };

  return (
    <ShijingStoreProvider snapshot={snapshot} persistenceClient={persistenceClient}>
      <ShijingShell account={account} />
    </ShijingStoreProvider>
  );
}
