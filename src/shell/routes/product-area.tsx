import { useMemo } from 'react';
import { buildEmptyShiJingSpace } from '../../product/dev/initial-space.ts';
import { ShijingShell } from '../../product/shell/shijing-shell.tsx';
import { ShijingStoreProvider } from '../../product/state/shijing-store.tsx';
import { ShellLayout } from '../app-shell/shell-layout.js';
import {
  createShijingConversationChatBridge,
  createShijingRuntimeAiClient,
} from '../ai/shijing-runtime-ai.ts';
import { ShijingLocalDevelopmentStatus } from '../local-development/shijing-local-development-status.tsx';
import { shijingLocalAppRuntimePlatform } from '../local-development/shijing-local-app-runtime.ts';
import { ShijingRuntimeStoragePersistenceClient } from '../persistence/shijing-runtime-storage.ts';

const shijingPersistenceClient = new ShijingRuntimeStoragePersistenceClient(
  shijingLocalAppRuntimePlatform,
);

/**
 * This route is reachable only after the protected local-app carrier reports
 * a session-bound development process. Product data uses the same Runtime-owned
 * current-account-plus-Registered-App-Subject partition as installed Apps.
 */
export function ProductArea() {
  const snapshot = useMemo(
    () => buildEmptyShiJingSpace('local-development-space'),
    [],
  );
  const runtimeAiClient = useMemo(
    () => createShijingRuntimeAiClient(),
    [],
  );
  const conversationChatBridge = useMemo(
    () => createShijingConversationChatBridge(),
    [],
  );
  return (
    <div className="shijing-local-development-shell" data-testid="shijing-product-area">
      <ShijingLocalDevelopmentStatus />
      <ShellLayout>
        <ShijingStoreProvider
          snapshot={snapshot}
          persistenceClient={shijingPersistenceClient}
          runtimeAiClient={runtimeAiClient}
          conversationChatBridge={conversationChatBridge}
        >
          <ShijingShell />
        </ShijingStoreProvider>
      </ShellLayout>
    </div>
  );
}
