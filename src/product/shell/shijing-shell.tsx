// Four-tab IA shell layout. Tabs come from SHIJING_IA_TABS; active state
// goes through the in-memory store. Snapshot validation status is surfaced
// at the shell level so any invalid ShiJingSpace short-circuits the body
// instead of rendering downstream surfaces against bad data.

import {
  Surface,
  NimiTabs,
  InlineAlert,
  Avatar,
  ActionMenu,
  Popover,
  PopoverTrigger,
  PopoverContent,
  type NimiMenuItem,
} from '@nimiplatform/kit/ui';
import { SHIJING_IA_TABS, type ShijingTabId } from '../../contracts/ia-contract.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import { TabRouter } from '../navigation/tab-router.tsx';
import { SubjectSwitcher } from './subject-switcher.tsx';
import { formatValidatorRefusal } from '../i18n/format-failure.ts';
import { TechnicalDetails } from '../components/technical-details.tsx';
import { NatalInputsForm } from '../inputs/natal-inputs-form.tsx';
import { BRAND_NAME } from '../i18n/copy.ts';
import { useAppStore } from '../../shell/app-shell/app-store.js';
import { logoutShijingRuntimeAccount } from '../../shell/infra/shijing-bootstrap.js';

function initialFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '時';
  const codePoint = trimmed.codePointAt(0);
  return codePoint ? String.fromCodePoint(codePoint).toUpperCase() : '時';
}

function ShellAccountTrigger() {
  const user = useAppStore((s) => s.auth.user);
  const accountDisplayName = user?.displayName?.trim() || user?.id || '';

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

  if (!user) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="shijing-topbar__account" aria-label="账户菜单">
          <span className="shijing-topbar__account-name">{accountDisplayName}</span>
          <Avatar
            size="sm"
            shape="circle"
            tone="accent"
            alt={accountDisplayName || '账户头像'}
            fallback={initialFromName(accountDisplayName)}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8}>
        <ActionMenu items={accountMenuItems} ariaLabel="账户菜单" />
      </PopoverContent>
    </Popover>
  );
}

export function ShijingShell() {
  const { state, dispatch } = useShijingStore();

  if (state.snapshot_status.kind === 'invalid') {
    const formatted = formatValidatorRefusal(state.snapshot_status.error.code);
    if (state.snapshot_status.error.code === 'space_self_subject_natal_inputs_invalid') {
      return (
        <div className="shijing-shell shijing-shell--repair" role="main">
          <Surface tone="card" material="glass-thin" padding="md">
            <InlineAlert tone="warning">
              <strong>建立本人本命资料</strong>
            </InlineAlert>
            <NatalInputsForm />
          </Surface>
        </div>
      );
    }
    return (
      <div className="shijing-shell shijing-shell--error" role="alert">
        <Surface tone="card" material="glass-thin" padding="md">
          <InlineAlert tone="danger">
            <strong>{formatted.headline}</strong>
          </InlineAlert>
          <TechnicalDetails content={formatted.technical} />
        </Surface>
      </div>
    );
  }

  const tabItems = SHIJING_IA_TABS.map((tab) => ({
    value: tab.id,
    label: tab.chinese_label,
  }));

  return (
    <div className="shijing-shell">
      <Surface
        tone="panel"
        material="glass-chrome"
        padding="none"
        className="shijing-shell__topbar"
        data-tauri-drag-region
      >
        <div className="shijing-topbar">
          <div className="shijing-topbar__brand">
            <span className="shijing-topbar__brand-mark" aria-hidden>時</span>
            <span className="shijing-topbar__brand-name">{BRAND_NAME}</span>
            <span className="shijing-topbar__breadcrumb-sep" aria-hidden>/</span>
            <SubjectSwitcher variant="breadcrumb" />
          </div>
          <NimiTabs
            items={tabItems}
            value={state.active_tab}
            onValueChange={(value) => dispatch({ type: 'tab/activate', tab: value as ShijingTabId })}
            ariaLabel="时镜主导航"
            className="shijing-topbar__tabs"
          />
          <div className="shijing-topbar__account-slot">
            <ShellAccountTrigger />
          </div>
        </div>
      </Surface>
      <div className="shijing-shell__body">
        <TabRouter active_tab={state.active_tab} />
      </div>
    </div>
  );
}
