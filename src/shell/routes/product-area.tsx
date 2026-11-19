import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NimiAppScope } from '@nimiplatform/kit/core/app-session';
import { projectShijingAIConfig } from '../ai/shijing-ai-config.ts';
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
import { ShijingRuntimeStoragePersistenceClient } from '../persistence/shijing-runtime-storage.ts';
import type { ShijingPlatform } from '../mount-shijing.js';
import { useShijingNavigation } from '../../product/navigation/app-navigation.tsx';
import { openShijingRuntimeAiRecovery } from '../ai/shijing-ai-recovery.ts';


/**
 * This route is reachable only after the protected local-app carrier reports
 * an admitted connection. Product data uses the same Runtime-owned
 * current-account-plus-Registered-App-Subject partition as installed Apps.
 */
// @nimi-authority: rule.shijing.product.r002
export function ProductArea({ scope, platform }: { scope: NimiAppScope; platform: ShijingPlatform }) {
  const openOwnerConfiguration = platform.kind === 'desktop' ? platform.openConfiguration : undefined;
  const { t } = useTranslation();
  const { open } = useShijingNavigation();
  const openModelSettings = useCallback(() => open({ id: 'settings', page: 'settings', focusTarget: 'ai_configuration' }), [open]);
  const [aiConfigReady, setAiConfigReady] = useState<boolean | null>(null);
  const shijingPersistenceClient = useMemo(() => new ShijingRuntimeStoragePersistenceClient(scope), [scope]);
  const activity = useMemo(() => ({ async put(input: Parameters<typeof scope.client.activity.put>[0]) {
    scope.signal.throwIfAborted();
    const result = await scope.client.activity.put(input);
    scope.signal.throwIfAborted();
    return result;
  } }), [scope]);
  useEffect(() => {
    let live = true;
    void scope.client.aiConfig.get().then(snapshot => { if (live && !scope.signal.aborted) setAiConfigReady(projectShijingAIConfig(snapshot).state === 'ready'); }).catch(() => { if (live && !scope.signal.aborted) setAiConfigReady(null); });
    return () => { live = false; };
  }, [scope]);
  const snapshot = useMemo(
    () => buildEmptyShiJingSpace('local-development-space'),
    [],
  );
  const runtimeAiClient = useMemo(
    () => createShijingRuntimeAiClient(scope),
    [scope],
  );
  const conversationChatBridge = useMemo(
    () => createShijingConversationChatBridge(scope),
    [scope],
  );
  // The development-session status (session + App AIConfig) lives inside the
  // 设置 settings sub-page as an injected module, not above the product shell.
  const settingsExtras = useMemo(
    () => ({
      targetId: 'settings-local-development',
      navLabel: t('LocalDevelopment.aiConfig'),
      content: <ShijingLocalDevelopmentStatus scope={scope} onReadinessChange={setAiConfigReady} openOwnerConfiguration={openOwnerConfiguration} />,
    }),
    [t, scope, openOwnerConfiguration],
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
          openRuntimeAiRecovery={platform.kind === 'desktop' ? openShijingRuntimeAiRecovery : undefined}
          openModelSettings={platform.kind === 'desktop' ? undefined : openModelSettings}
        >
          <ShijingShell settingsExtras={settingsExtras} activity={activity} />
        </ShijingStoreProvider>
      </ShellLayout>
    </div>
  );
}
