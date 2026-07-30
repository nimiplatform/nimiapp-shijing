import { useMemo, useState } from 'react';
import type { NimiLocalAppAgentHandle } from '@nimiplatform/sdk/app';
import { buildEmptyShiJingSpace } from '../../product/dev/initial-space.ts';
import { ShijingShell } from '../../product/shell/shijing-shell.tsx';
import { ShijingStoreProvider } from '../../product/state/shijing-store.tsx';
import { ShellLayout } from '../app-shell/shell-layout.js';
import {
  createShijingAgentRuntimeAiClient,
  createShijingConversationChatBridge,
} from '../ai/shijing-conversation-chat-bridge.ts';
import { ShijingLocalDevelopmentStatus } from '../local-development/shijing-local-development-status.tsx';

/**
 * This route is reachable only after the protected local-app carrier reports
 * a session-bound development process. Persistence remains unmounted; Runtime
 * wording and consultation use only the selected caller-scoped Agent handle.
 */
export function ProductArea() {
  const [selectedAgentHandle, setSelectedAgentHandle] =
    useState<NimiLocalAppAgentHandle | null>(null);
  const snapshot = useMemo(
    () => buildEmptyShiJingSpace('local-development-space'),
    [],
  );
  const agentOptions = useMemo(
    () => ({ getAgentHandle: () => selectedAgentHandle }),
    [selectedAgentHandle],
  );
  const runtimeAiClient = useMemo(
    () => createShijingAgentRuntimeAiClient(agentOptions),
    [agentOptions],
  );
  const conversationChatBridge = useMemo(
    () => createShijingConversationChatBridge(agentOptions),
    [agentOptions],
  );
  return (
    <div className="shijing-local-development-shell" data-testid="shijing-product-area">
      <ShijingLocalDevelopmentStatus
        selectedAgentHandle={selectedAgentHandle}
        onSelectAgent={setSelectedAgentHandle}
      />
      <ShellLayout>
        <ShijingStoreProvider
          snapshot={snapshot}
          persistenceClient={null}
          runtimeAiClient={runtimeAiClient}
          conversationChatBridge={conversationChatBridge}
        >
          <ShijingShell />
        </ShijingStoreProvider>
      </ShellLayout>
    </div>
  );
}
