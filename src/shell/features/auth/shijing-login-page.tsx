import { useMemo } from 'react';
import { DesktopShellAuthPage } from '@nimiplatform/kit/auth';
import '@nimiplatform/kit/auth/styles.css';
import { useAppStore } from '../../app-shell/app-store.js';
import {
  createShijingDesktopBrowserAuthAdapter,
  createShijingRuntimeAccountBrowserBroker,
} from './shijing-auth-adapter.js';
import { shijingTauriOAuthBridge } from '../../bridge/index.js';

const shijingLogoUrl = new URL('../../../../src-tauri/icons/128x128@2x.png', import.meta.url).href;

export function ShijingLoginPage() {
  const adapter = useMemo(() => createShijingDesktopBrowserAuthAdapter(), []);
  const runtimeAccountBroker = useMemo(() => createShijingRuntimeAccountBrowserBroker(), []);
  const webBaseUrl = useAppStore((s) => s.runtimeDefaults?.webBaseUrl || '');

  return (
    <DesktopShellAuthPage
      adapter={adapter}
      logo={shijingLogoUrl}
      logoAltText="ShiJing"
      session={{
        mode: 'desktop-browser',
        authStatus: 'unauthenticated',
        setAuthSession: (user) => {
          const store = useAppStore.getState();
          if (!user || !user.id) {
            store.clearAuthSession();
            return;
          }
          store.setAuthSession({
            id: String(user.id),
            displayName: String(user.displayName || user.name || ''),
            email: user.email ? String(user.email) : undefined,
            avatarUrl: user.avatarUrl ? String(user.avatarUrl) : undefined,
          });
        },
      }}
      desktopBrowserAuth={{
        baseUrl: webBaseUrl || undefined,
        bridge: shijingTauriOAuthBridge,
        runtimeAccountBroker,
      }}
      testIds={{
        screen: 'shijing-login-page',
        logoTrigger: 'shijing-login-trigger',
      }}
    />
  );
}
