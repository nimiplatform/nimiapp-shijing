// SJG-IA-01 — primary tab router for the four-mirror shell.

import { type ReactNode } from 'react';
import {
  SHIJING_PRIMARY_TAB_DESCRIPTORS,
  type ShijingPrimaryTabId,
} from './tab-descriptor.ts';
import { useShijingStore } from '../state/shijing-store.tsx';

export interface PrimaryTabBarProps {
  readonly children?: ReactNode;
}

export function PrimaryTabBar(_props: PrimaryTabBarProps) {
  const { state, dispatch } = useShijingStore();
  return (
    <nav className="shijing-primary-tabbar" aria-label="ShiJing 四镜">
      {SHIJING_PRIMARY_TAB_DESCRIPTORS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          aria-current={state.active_tab === tab.id ? 'page' : undefined}
          onClick={() => dispatch({ type: 'tab/activate', tab: tab.id })}
          data-mirror-kind={tab.id}
        >
          {tab.chinese_label}
        </button>
      ))}
    </nav>
  );
}

export type ActiveMirrorKind = ShijingPrimaryTabId;
