import { createNimiNavigation } from '@nimiplatform/kit/core/navigation';
import { SHIJING_IA_TABS, SHIJING_SETTINGS_PAGES, type ShijingTabId, type ShijingSettingsPageId } from '../../contracts/ia-contract.ts';
import type { ShijingSettingsFocusTarget } from '../settings/settings-page-view.tsx';

export type ShijingDestination = {
  id: ShijingTabId | 'settings';
  page?: ShijingSettingsPageId;
  focusTarget?: ShijingSettingsFocusTarget;
  date?: string;
  conversationId?: string;
  newQuestion?: true;
};

// @nimi-authority: rule.shijing.ia.r011
export function createShijingNavigation() {
  return createNimiNavigation<ShijingDestination>({ initial: { id: 'mingjing' }, validate(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid ShiJing destination.');
    const input = value as Record<string, unknown>;
    if (!SHIJING_IA_TABS.some(tab => tab.id === input.id) && input.id !== 'settings') throw new Error('Unknown ShiJing destination.');
    const keys = input.id === 'settings' ? ['id', 'page', 'focusTarget']
      : input.id === 'yuejing' ? ['id', 'date']
      : input.id === 'shijing' ? ['id', 'conversationId', 'newQuestion'] : ['id'];
    if (Object.keys(input).some(key => !keys.includes(key))) throw new Error('Unsupported ShiJing position parameter.');
    if (input.id === 'settings' && !SHIJING_SETTINGS_PAGES.some(page => page.id === input.page)) throw new Error('Unknown Settings page.');
    if (input.focusTarget !== undefined && !['self_profile_editor','method_profile','privacy_local_data'].includes(String(input.focusTarget))) throw new Error('Unknown Settings focus.');
    if (input.focusTarget === 'self_profile_editor' && input.page !== 'profile' || input.focusTarget && input.focusTarget !== 'self_profile_editor' && input.page !== 'settings') throw new Error('Settings focus belongs to another page.');
    if (input.date !== undefined && (typeof input.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(input.date) || Number.isNaN(Date.parse(input.date)) || new Date(input.date).toISOString().slice(0,10) !== input.date)) throw new Error('Invalid day reference.');
    if (input.conversationId !== undefined && (typeof input.conversationId !== 'string' || !input.conversationId.trim() || input.conversationId.length > 512)) throw new Error('Invalid record reference.');
    if (input.newQuestion !== undefined && input.newQuestion !== true || input.newQuestion && input.conversationId) throw new Error('Invalid question position.');
    return Object.fromEntries(Object.entries(input).filter(([, item]) => item !== undefined)) as ShijingDestination;
  } });
}

