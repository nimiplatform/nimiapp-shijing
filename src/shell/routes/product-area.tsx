// W05 — product area route. Wires the ShijingStoreProvider against the
// new four-mirror shell.

import { useMemo } from 'react';
import { useAppStore } from '../app-shell/app-store.js';
import { ShijingStoreProvider } from '../../product/state/shijing-store.tsx';
import { ShijingShell } from '../../product/shell/shijing-shell.tsx';
import { IndexedDBPersistenceAdapter } from '../../product/persistence/indexeddb-adapter.ts';
import { InMemoryPersistenceAdapter } from '../../product/persistence/in-memory-adapter.ts';
import { RuntimeAppStoragePersistenceAdapter } from '../persistence/runtime-app-storage-adapter.ts';
import { hasShellHostInvoke } from '../bridge/index.js';
import { buildEmptyShiJingSpace } from '../../product/dev/initial-space.ts';
import type { PersistenceClient } from '../../product/persistence/persistence-client.ts';
import { createShijingRuntimeAiClient } from '../ai/shijing-runtime-ai-client.ts';
import { createShijingConversationChatBridge } from '../ai/shijing-conversation-chat-bridge.ts';
import { createShijingPresenceVerificationClient } from '../infra/shijing-presence-verification.ts';

function pickPersistenceClient(userId: string): PersistenceClient {
  if (hasShellHostInvoke()) return new RuntimeAppStoragePersistenceAdapter({ user_id: userId });
  if (IndexedDBPersistenceAdapter.isSupported()) {
    return new IndexedDBPersistenceAdapter({ user_id: userId });
  }
  return new InMemoryPersistenceAdapter();
}

export function ProductArea() {
  const user = useAppStore((s) => s.auth.user);
  const userId = user?.id ?? '';
  const snapshot = useMemo(() => buildEmptyShiJingSpace(userId), [userId]);
  const persistenceClient = useMemo(
    () => (userId ? pickPersistenceClient(userId) : null),
    [userId],
  );
  const runtimeAiClient = useMemo(() => createShijingRuntimeAiClient(), []);
  const conversationChatBridge = useMemo(() => createShijingConversationChatBridge(), []);
  const presenceVerificationClient = useMemo(() => createShijingPresenceVerificationClient(), []);

  if (!userId) {
    return null;
  }

  const account = {
    ...(user?.displayName ? { name: user.displayName } : {}),
    ...(user?.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
  };

  return (
    <ShijingStoreProvider
      key={userId}
      snapshot={snapshot}
      persistenceClient={persistenceClient}
      runtimeAiClient={runtimeAiClient}
      conversationChatBridge={conversationChatBridge}
      presenceVerificationClient={presenceVerificationClient}
    >
      <ShijingShell account={account} />
    </ShijingStoreProvider>
  );
}
