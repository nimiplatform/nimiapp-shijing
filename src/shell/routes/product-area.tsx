import { useMemo } from 'react';
import { buildEmptyShiJingSpace } from '../../product/dev/initial-space.ts';
import { ShijingShell } from '../../product/shell/shijing-shell.tsx';
import { ShijingStoreProvider } from '../../product/state/shijing-store.tsx';
import { ShellLayout } from '../app-shell/shell-layout.js';
import { ShijingLocalDevelopmentStatus } from '../local-development/shijing-local-development-status.tsx';

/**
 * This route is reachable only after the protected local-app carrier reports
 * a session-bound development process. It intentionally mounts no persistence,
 * Runtime AI, consultation bridge, account projection, or presence client.
 */
export function ProductArea() {
  const snapshot = useMemo(
    () => buildEmptyShiJingSpace('local-development-space'),
    [],
  );
  return (
    <div className="shijing-local-development-shell" data-testid="shijing-product-area">
      <ShijingLocalDevelopmentStatus />
      <ShellLayout>
        <ShijingStoreProvider snapshot={snapshot} persistenceClient={null}>
          <ShijingShell />
        </ShijingStoreProvider>
      </ShellLayout>
    </div>
  );
}
