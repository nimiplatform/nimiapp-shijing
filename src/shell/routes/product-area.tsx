// W05 — product area route. Wires the ShijingStoreProvider against the
// new four-mirror shell.

import { useMemo } from 'react';
import { useAppStore } from '../app-shell/app-store.js';
import { ShijingStoreProvider } from '../../product/state/shijing-store.tsx';
import { ShijingShell } from '../../product/shell/shijing-shell.tsx';
import { IndexedDBPersistenceAdapter } from '../../product/persistence/indexeddb-adapter.ts';
import { InMemoryPersistenceAdapter } from '../../product/persistence/in-memory-adapter.ts';
import { RuntimeAppStoragePersistenceAdapter } from '../persistence/runtime-app-storage-adapter.ts';
import {
  buildEmptyShiJingSpace,
  buildMockShiJingSpace,
} from '../../product/dev/mock-snapshot.ts';
import type { PersistenceClient } from '../../product/persistence/persistence-client.ts';
import { createShijingRuntimeAiClient } from '../ai/shijing-runtime-ai-client.ts';

function pickPersistenceClient(userId: string): PersistenceClient {
  if (isTauriRuntime()) return new RuntimeAppStoragePersistenceAdapter();
  if (IndexedDBPersistenceAdapter.isSupported()) {
    return new IndexedDBPersistenceAdapter({ user_id: userId });
  }
  return new InMemoryPersistenceAdapter();
}

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
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
  const runtimeAiClient = useMemo(() => createShijingRuntimeAiClient(), []);

  if (!userId) {
    return null;
  }

  const account = {
    ...(user?.displayName ? { name: user.displayName } : {}),
    ...(user?.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
  };

  return (
    <ShijingStoreProvider
      snapshot={snapshot}
      persistenceClient={persistenceClient}
      runtimeAiClient={runtimeAiClient}
    >
      <ShijingShell account={account} />
    </ShijingStoreProvider>
  );
}
