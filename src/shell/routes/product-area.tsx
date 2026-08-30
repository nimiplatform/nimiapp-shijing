import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useAppStore } from '../app-shell/app-store.js';

const shijingPersistenceClient = new ShijingRuntimeStoragePersistenceClient(
  shijingLocalAppRuntimePlatform,
);

/**
 * This route is reachable only after the protected local-app carrier reports
 * a session-bound development process. Product data uses the same Runtime-owned
 * current-account-plus-Registered-App-Subject partition as installed Apps.
 */
export function ProductArea() {
  const { t } = useTranslation();
  const aiConfigReady = useAppStore((state) => state.aiConfigReady);
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
  // The development-session status (session + App AIConfig) lives inside the
  // 设置 settings sub-page as an injected module, not above the product shell.
  const settingsExtras = useMemo(
    () => ({
      targetId: 'settings-local-development',
      navLabel: t('LocalDevelopment.aiConfig'),
      content: <ShijingLocalDevelopmentStatus />,
    }),
    [t],
  );
  return (
    <div className="shijing-local-development-shell" data-testid="shijing-product-area">
      <ShellLayout>
        <ShijingStoreProvider
          snapshot={snapshot}
          persistenceClient={shijingPersistenceClient}
          runtimeAiClient={runtimeAiClient}
          conversationChatBridge={conversationChatBridge}
          aiConfigReady={aiConfigReady}
        >
          <ShijingShell settingsExtras={settingsExtras} />
        </ShijingStoreProvider>
      </ShellLayout>
    </div>
  );
}
