// SJG-IA-01 + SJG-IA-07 — Primary tab descriptors derived from the IA
// contract. Renderer must consume SHIJING_PRIMARY_TAB_DESCRIPTORS
// rather than hardcoding a parallel primary tab list.

import { SHIJING_IA_TABS, type ShijingTabId } from '../../contracts/ia-contract.ts';

export type ShijingPrimaryTabId = ShijingTabId;

export interface PrimaryTabDescriptor {
  readonly id: ShijingPrimaryTabId;
  readonly chinese_label: string;
  readonly english_anchor: string;
  readonly order: 1 | 2 | 3 | 4 | 5;
}

export const SHIJING_PRIMARY_TAB_DESCRIPTORS: readonly PrimaryTabDescriptor[] = SHIJING_IA_TABS;
