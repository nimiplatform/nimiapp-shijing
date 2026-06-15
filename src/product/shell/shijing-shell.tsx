// W05 — four-mirror shell.
//
// Wires the integrated top bar (brand + the contract-locked primary tab
// bar rijing / yuejing / nianjing / shijing + account). The account cluster
// shows the user's avatar + name; clicking it opens a compact menu (Nimi
// ActionMenu) listing the settings sub-pages; selecting an entry opens a
// full-surface detail page for that page.

import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ActionMenu, type NimiMenuItem } from '@nimiplatform/kit/ui';
import { useShijingStore } from '../state/shijing-store.tsx';
import { PrimaryTabBar } from '../navigation/tab-router.tsx';
import type { ShijingSettingsFocusTarget } from '../settings/settings-page-view.tsx';
import {
  SHIJING_SETTINGS_PAGES,
  type ShijingSettingsPageId,
} from '../../contracts/ia-contract.ts';
import { BRAND_NAME, SETTINGS_PAGE_LABELS } from '../i18n/copy.ts';
import type { PersistenceError } from '../persistence/persistence-client.ts';

const RiJingTab = lazy(() =>
  import('../tabs/rijing-tab.tsx').then((module) => ({ default: module.RiJingTab })),
);
const YueJingTab = lazy(() =>
  import('../tabs/yuejing-tab.tsx').then((module) => ({ default: module.YueJingTab })),
);
const NianJingTab = lazy(() =>
  import('../tabs/nianjing-tab.tsx').then((module) => ({ default: module.NianJingTab })),
);
const ShiJingTab = lazy(() =>
  import('../tabs/shijing-tab.tsx').then((module) => ({ default: module.ShiJingTab })),
);
const SettingsPageView = lazy(() =>
  import('../settings/settings-page-view.tsx').then((module) => ({
    default: module.SettingsPageView,
  })),
);

// Derives the avatar fallback glyph from the account name — the first
// character (works for both CJK and Latin names). Falls back to a neutral
// dot when no name is projected (dev preview / unauthenticated mount).
function avatarInitial(name: string): string {
  return name ? Array.from(name)[0] : '·';
}

function persistenceErrorDetail(error: PersistenceError): string {
  if ('cause' in error) return `${error.kind}: ${error.cause}`;
  if ('reason' in error) return `${error.kind}: ${error.reason}`;
  if ('validation_error' in error) return `${error.kind}: ${error.validation_error.code}`;
  const exhaustive = error as { readonly kind?: string };
  return exhaustive.kind ?? 'unknown';
}

export interface ShijingShellAccount {
  readonly name?: string;
  readonly avatarUrl?: string;
}

export interface ShijingShellProps {
  // Projected account identity for the top-bar account cluster. Optional
  // so the dev preview and tests can mount the shell without an auth
  // session; absent → a neutral avatar with no name.
  readonly account?: ShijingShellAccount;
}

interface ActiveSettingsPageState {
  readonly pageId: ShijingSettingsPageId;
  readonly focusTarget?: ShijingSettingsFocusTarget | null;
}

export function ShijingShell(props: ShijingShellProps) {
  const { state, persistence_status } = useShijingStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState<ActiveSettingsPageState | null>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountName = props.account?.name?.trim() ?? '';

  // Dropdown affordances: dismiss the avatar menu on Escape or on a click
  // outside the account cluster.
  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    function onPointerDown(event: MouseEvent) {
      if (!accountRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [menuOpen]);

  function openPage(
    pageId: ShijingSettingsPageId,
    focusTarget?: ShijingSettingsFocusTarget | null,
  ) {
    setActivePage({ pageId, focusTarget: focusTarget ?? null });
    setMenuOpen(false);
  }

  const menuItems: NimiMenuItem[] = SHIJING_SETTINGS_PAGES.map((page) => ({
    id: page.id,
    label: SETTINGS_PAGE_LABELS[page.id],
    onSelect: () => openPage(page.id),
  }));

  return (
    <div className="shijing-shell" data-active-tab={state.active_tab}>
      <header className="shijing-topbar">
        <div className="shijing-topbar__brand">
          <span className="shijing-topbar__wordmark">{BRAND_NAME}</span>
          <span className="shijing-topbar__tagline" aria-hidden>
            SHIJING · OS
          </span>
        </div>
        <PrimaryTabBar />
        <div className="shijing-topbar__account" ref={accountRef}>
          <button
            type="button"
            className="shijing-topbar__avatar-button"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label={accountName ? `账户菜单 — ${accountName}` : '账户菜单'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="shijing-topbar__avatar" aria-hidden>
              {props.account?.avatarUrl ? (
                <img src={props.account.avatarUrl} alt="" />
              ) : (
                avatarInitial(accountName)
              )}
            </span>
            {accountName ? (
              <span className="shijing-topbar__account-name">{accountName}</span>
            ) : null}
          </button>
          {menuOpen ? (
            <div className="shijing-account-menu">
              <ActionMenu ariaLabel="设置" items={menuItems} />
            </div>
          ) : null}
        </div>
      </header>
      <main className="shijing-shell__main" role="main">
        {state.snapshot_status.kind === 'invalid' ? (
          <p className="shijing-shell__error" role="alert">
            数据快照校验未通过: {state.snapshot_status.error.code}
            。请点击右上角头像打开"设置 → 隐私与本地数据"清理已存数据后再试。
          </p>
        ) : null}
        {persistence_status.kind === 'error' ? (
          <p className="shijing-shell__error" role="alert">
            本地数据读写失败: {persistenceErrorDetail(persistence_status.error)}
          </p>
        ) : null}
        <Suspense
          fallback={
            <p className="shijing-shell__loading" role="status">
              正在加载镜面…
            </p>
          }
        >
          {renderActiveTab(state.active_tab, (page, focusTarget) => openPage(page ?? 'profile', focusTarget))}
        </Suspense>
      </main>
      {activePage ? (
        <Suspense
          fallback={
            <div className="shijing-settings-page shijing-settings-page--loading" role="status">
              正在加载设置…
            </div>
          }
        >
          <SettingsPageView
            pageId={activePage.pageId}
            focusTarget={activePage.focusTarget}
            onBack={() => setActivePage(null)}
            onNavigate={(pageId) => setActivePage({ pageId, focusTarget: null })}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

function renderActiveTab(
  tab: string,
  onRequestOpenSettings: (
    page?: ShijingSettingsPageId,
    focusTarget?: ShijingSettingsFocusTarget | null,
  ) => void,
) {
  switch (tab) {
    case 'rijing':
      return <RiJingTab onRequestOpenSettings={onRequestOpenSettings} />;
    case 'yuejing':
      return <YueJingTab />;
    case 'nianjing':
      return <NianJingTab onRequestOpenSettings={onRequestOpenSettings} />;
    case 'shijing':
      return <ShiJingTab onRequestOpenSettings={onRequestOpenSettings} />;
    default:
      return null;
  }
}
