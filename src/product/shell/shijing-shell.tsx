// Four-tab IA shell layout. Tabs come from SHIJING_IA_TABS; active state
// goes through the in-memory store. Snapshot validation status is surfaced
// at the shell level so any invalid ShiJingSpace short-circuits the body
// instead of rendering downstream surfaces against bad data.

import { Surface, NimiTabs, InlineAlert } from '@nimiplatform/kit/ui';
import { SHIJING_IA_TABS, type ShijingTabId } from '../../contracts/ia-contract.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import { TabRouter } from '../navigation/tab-router.tsx';
import { SubjectSwitcher } from './subject-switcher.tsx';
import { formatValidatorRefusal } from '../i18n/format-failure.ts';
import { TechnicalDetails } from '../components/technical-details.tsx';

export function ShijingShell() {
  const { state, dispatch } = useShijingStore();

  if (state.snapshot_status.kind === 'invalid') {
    const formatted = formatValidatorRefusal(state.snapshot_status.error.code);
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
        className="shijing-shell__tabbar"
      >
        <div className="shijing-shell__tabbar-row">
          <SubjectSwitcher />
          <NimiTabs
            items={tabItems}
            value={state.active_tab}
            onValueChange={(value) => dispatch({ type: 'tab/activate', tab: value as ShijingTabId })}
            ariaLabel="时镜主导航"
            className="shijing-shell__tabs"
          />
        </div>
      </Surface>
      <div className="shijing-shell__body">
        <TabRouter active_tab={state.active_tab} />
      </div>
    </div>
  );
}
