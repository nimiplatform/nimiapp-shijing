// Renders the body for the currently-active tab. Tab descriptors come
// exclusively from `SHIJING_IA_TABS` (wave-0 IA contract); this module
// must not host a parallel tab list.

import type { ShijingTabId } from '../../contracts/ia-contract.ts';
import { TodayTab } from '../tabs/today.tsx';
import { ViewsTab } from '../tabs/views.tsx';
import { ConsultationTab } from '../tabs/consultation.tsx';
import { MeTab } from '../tabs/me.tsx';

interface TabRouterProps {
  readonly active_tab: ShijingTabId;
}

export function TabRouter({ active_tab }: TabRouterProps) {
  switch (active_tab) {
    case 'today':
      return <TodayTab />;
    case 'views':
      return <ViewsTab />;
    case 'consultation':
      return <ConsultationTab />;
    case 'me':
      return <MeTab />;
    default: {
      const exhaustive: never = active_tab;
      void exhaustive;
      return null;
    }
  }
}
