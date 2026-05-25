import type { ReactNode } from 'react';
import {
  AmbientBackground,
  Surface,
  Avatar,
  ActionMenu,
  Popover,
  PopoverTrigger,
  PopoverContent,
  type NimiMenuItem,
} from '@nimiplatform/kit/ui';
import { useAppStore } from './app-store.js';
import { logoutShijingRuntimeAccount } from '../infra/shijing-bootstrap.js';

function initialFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '時';
  const codePoint = trimmed.codePointAt(0);
  return codePoint ? String.fromCodePoint(codePoint).toUpperCase() : '時';
}

export function ShellLayout({ children }: { children: ReactNode }) {
  const user = useAppStore((s) => s.auth.user);

  const accountMenuItems: NimiMenuItem[] = [
    {
      id: 'logout',
      label: '退出登录',
      tone: 'danger',
      onSelect: () => {
        void logoutShijingRuntimeAccount()
          .catch(() => {})
          .finally(() => {
            useAppStore.getState().clearAuthSession();
          });
      },
    },
  ];

  const accountDisplayName = user?.displayName?.trim() || user?.id || '';

  return (
    <AmbientBackground variant="mesh" className="shijing-app">
      <Surface
        tone="panel"
        elevation="raised"
        material="glass-chrome"
        className="shijing-app__header"
        data-tauri-drag-region
      >
        <div className="shijing-app__brand">
          <span className="shijing-app__brand-mark" aria-hidden>時</span>
          <div className="shijing-app__brand-text">
            <span className="shijing-app__brand-name">时镜</span>
            <span className="shijing-app__brand-sub">ShiJing</span>
          </div>
        </div>
        <div className="shijing-app__actions">
          {user ? (
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="shijing-app__account-trigger" aria-label="账户菜单">
                  <Avatar
                    size="sm"
                    shape="circle"
                    tone="accent"
                    alt={accountDisplayName || '账户头像'}
                    fallback={initialFromName(accountDisplayName)}
                  />
                  <span className="shijing-app__account-name">{accountDisplayName}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" sideOffset={8}>
                <ActionMenu items={accountMenuItems} ariaLabel="账户菜单" />
              </PopoverContent>
            </Popover>
          ) : null}
        </div>
      </Surface>
      <main className="shijing-app__body">{children}</main>
    </AmbientBackground>
  );
}
