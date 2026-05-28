// SJG-IA-01..05 — Information architecture contract.
// Renderer surfaces must consume SHIJING_IA_TABS instead of hardcoding
// parallel tab lists.

export type ShijingTabId = 'today' | 'views' | 'consultation' | 'me';

export interface ShijingTabDescriptor {
  readonly id: ShijingTabId;
  readonly order: 1 | 2 | 3 | 4;
  readonly chinese_label: string;
  readonly english_anchor: string;
}

export const SHIJING_IA_TABS: readonly ShijingTabDescriptor[] = [
  { id: 'today', order: 1, chinese_label: '今日', english_anchor: 'Today' },
  { id: 'views', order: 2, chinese_label: '关注', english_anchor: 'Views' },
  { id: 'consultation', order: 3, chinese_label: '问时镜', english_anchor: 'Consultation' },
  { id: 'me', order: 4, chinese_label: '我', english_anchor: 'Me' },
] as const;

export const SHIJING_PRIMARY_TAB_COUNT = SHIJING_IA_TABS.length;

export const SHIJING_FORBIDDEN_TAB_IDS: ReadonlySet<string> = new Set<string>([
  'history',
  'huangli',
  'reports',
  'customers',
  'clients',
  'trends',
  'consultants',
]);

export function isForbiddenTabId(id: string): boolean {
  return SHIJING_FORBIDDEN_TAB_IDS.has(id);
}
