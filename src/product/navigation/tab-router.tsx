// rule.shijing.ia.r001 — primary router for the six-tab mirror shell.

import { type ReactNode } from 'react';
import {
  SHIJING_PRIMARY_TAB_DESCRIPTORS,
  type ShijingPrimaryTabId,
} from './tab-descriptor.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import { useProductCopy } from '../i18n/copy.ts';
import { hasCompletedMingJingStartupIntake } from '../onboarding/startup-intake.ts';

export interface PrimaryTabBarProps {
  readonly children?: ReactNode;
}

export function PrimaryTabBar(_props: PrimaryTabBarProps) {
  const { state, dispatch } = useShijingStore();
  const copy = useProductCopy();
  const intakePending = !hasCompletedMingJingStartupIntake(state.snapshot);
  return (
    <nav className="shijing-primary-tabbar" aria-label={copy.shell.navAriaLabel}>
      {SHIJING_PRIMARY_TAB_DESCRIPTORS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          aria-current={state.active_tab === tab.id ? 'page' : undefined}
          onClick={() => dispatch({ type: 'tab/activate', tab: tab.id })}
          data-mirror-kind={tab.id}
          data-intake-gated={intakePending && tab.id !== 'mingjing' ? '' : undefined}
        >
          {copy.tabLabels[tab.id]}
          {tab.id === 'mingjing' && intakePending ? (
            <span
              className="shijing-primary-tabbar__intake-dot"
              aria-hidden
            />
          ) : null}
        </button>
      ))}
    </nav>
  );
}

export type ActiveMirrorKind = ShijingPrimaryTabId;
