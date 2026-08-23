import { useMemo } from 'react';
import { buildEmptyShiJingSpace } from '../../product/dev/initial-space.ts';
import { InMemoryPersistenceAdapter } from '../../product/persistence/in-memory-adapter.ts';
import { ShijingShell } from '../../product/shell/shijing-shell.tsx';
import { ShijingStoreProvider } from '../../product/state/shijing-store.tsx';
import { ShellLayout } from '../app-shell/shell-layout.js';
import {
  createShijingConversationChatBridge,
  createShijingRuntimeAiClient,
} from '../ai/shijing-runtime-ai.ts';
import { ShijingLocalDevelopmentStatus } from '../local-development/shijing-local-development-status.tsx';

// Local-development session continuity only. Keeping one adapter per renderer
// process lets a temporarily remounted product route recover its current
// snapshot without creating durable or account-scoped app storage.
const localDevelopmentPersistenceClient = new InMemoryPersistenceAdapter();

/**
 * This route is reachable only after the protected local-app carrier reports
 * a session-bound development process. Product data remains process-local and
 * volatile; Runtime wording and consultation consume ShiJing's canonical App
 * AIConfig through the protected runtime.consume text-candidate operation.
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
          persistenceClient={localDevelopmentPersistenceClient}
          runtimeAiClient={runtimeAiClient}
          conversationChatBridge={conversationChatBridge}
        >
          <ShijingShell />
        </ShijingStoreProvider>
      </ShellLayout>
    </div>
  );
}
