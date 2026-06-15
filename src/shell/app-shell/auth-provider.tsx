import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { OfflineCoordinator, type OfflineTier } from '@nimiplatform/kit/core/offline-coordinator';
import {
  AmbientBackground,
  Button,
  InlineAlert,
  StatusBadge,
  Surface,
} from '@nimiplatform/kit/ui';
import { useAppStore } from './app-store.js';

const shijingAuthGateOfflineCoordinator = new OfflineCoordinator();

const ShijingLoginPage = lazy(() =>
  import('../features/auth/shijing-login-page.js').then((module) => ({
    default: module.ShijingLoginPage,
  })),
);

let shijingBootstrapModulePromise:
  | Promise<typeof import('../infra/shijing-bootstrap.js')>
  | null = null;

function loadShijingBootstrapModule(): Promise<typeof import('../infra/shijing-bootstrap.js')> {
  shijingBootstrapModulePromise ??= import('../infra/shijing-bootstrap.js');
  return shijingBootstrapModulePromise;
}

async function runShijingBootstrap(options?: { readonly force?: boolean }): Promise<void> {
  const bootstrap = await loadShijingBootstrapModule();
  await bootstrap.runShijingBootstrap(options);
}

type AuthGateState =
  | { kind: 'checking' }
  | { kind: 'blocked'; message: string; offlineTier: OfflineTier }
  | { kind: 'login-required' }
  | { kind: 'ready' };

function resolveAuthGateState(input: {
  authStatus: ReturnType<typeof useAppStore.getState>['auth']['status'];
  bootstrapReady: boolean;
  bootstrapError: string | null;
}): AuthGateState {
  if (input.bootstrapError) {
    shijingAuthGateOfflineCoordinator.markRuntimeReachable(false);
    return {
      kind: 'blocked',
      message: input.bootstrapError,
      offlineTier: shijingAuthGateOfflineCoordinator.getTier(),
    };
  }
  if (!input.bootstrapReady || input.authStatus === 'bootstrapping') {
    return { kind: 'checking' };
  }
  shijingAuthGateOfflineCoordinator.markRuntimeReachable(true);
  if (input.authStatus === 'unauthenticated') {
    return { kind: 'login-required' };
  }
  return { kind: 'ready' };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const authStatus = useAppStore((s) => s.auth.status);
  const bootstrapReady = useAppStore((s) => s.bootstrapReady);
  const bootstrapError = useAppStore((s) => s.bootstrapError);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    void runShijingBootstrap();
  }, []);

  const gateState = useMemo(
    () => resolveAuthGateState({ authStatus, bootstrapReady, bootstrapError }),
    [authStatus, bootstrapError, bootstrapReady],
  );

  const retry = useCallback(() => {
    const store = useAppStore.getState();
    store.setBootstrapError(null);
    store.setBootstrapReady(false);
    setRetrying(true);
    void runShijingBootstrap({ force: true }).finally(() => {
      setRetrying(false);
    });
  }, []);

  if (gateState.kind === 'blocked') {
    return (
      <AuthGateScreen
        badge={<StatusBadge tone="danger" shape="dot">Runtime blocked · {gateState.offlineTier}</StatusBadge>}
        title="Runtime 不可用"
        detail="时镜需要 Runtime 完成账号、AI 和本地存储边界初始化。"
      >
        <InlineAlert tone="danger">{gateState.message}</InlineAlert>
        <Button tone="primary" onClick={retry} loading={retrying}>重试</Button>
      </AuthGateScreen>
    );
  }

  if (gateState.kind === 'checking') {
    return (
      <AuthGateScreen
        badge={<StatusBadge tone="neutral" shape="dot">Runtime check</StatusBadge>}
        title="正在连接 Runtime"
        detail="正在建立 Runtime account session、app session 和 AIConfig 边界。"
      >
        <div className="flex items-center gap-3 text-sm text-[var(--nimi-text-secondary)]" role="status">
          <span
            aria-hidden="true"
            className="inline-block h-4 w-4 rounded-full border-2 border-[var(--nimi-border-strong)] border-r-transparent animate-spin"
          />
          <span>启动中</span>
        </div>
      </AuthGateScreen>
    );
  }

  if (gateState.kind === 'login-required') {
    return (
      <Suspense
        fallback={
          <AuthGateScreen
            badge={<StatusBadge tone="neutral" shape="dot">Login</StatusBadge>}
            title="正在加载登录"
            detail="正在准备 Runtime account 登录入口。"
          >
            <div className="flex items-center gap-3 text-sm text-[var(--nimi-text-secondary)]" role="status">
              <span
                aria-hidden="true"
                className="inline-block h-4 w-4 rounded-full border-2 border-[var(--nimi-border-strong)] border-r-transparent animate-spin"
              />
              <span>加载中</span>
            </div>
          </AuthGateScreen>
        }
      >
        <ShijingLoginPage />
      </Suspense>
    );
  }

  return <>{children}</>;
}

function AuthGateScreen({
  badge,
  title,
  detail,
  children,
}: {
  badge: ReactNode;
  title: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <AmbientBackground
      variant="mesh"
      className="flex h-screen w-screen items-center justify-center px-6 text-[var(--nimi-text-primary)]"
    >
      <Surface
        tone="panel"
        elevation="raised"
        padding="lg"
        className="relative z-[1] flex w-full max-w-[460px] flex-col gap-5"
      >
        <div className="flex flex-col gap-3">
          <div>{badge}</div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold leading-tight">{title}</h1>
            <p className="text-sm leading-6 text-[var(--nimi-text-secondary)]">{detail}</p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-4">{children}</div>
      </Surface>
    </AmbientBackground>
  );
}
