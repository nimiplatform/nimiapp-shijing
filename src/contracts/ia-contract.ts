// SJG-IA-01..07 - Information architecture contract.
// Renderer surfaces must consume SHIJING_IA_TABS instead of hardcoding
// parallel tab lists.

export type ShijingTabId =
  | 'rijing'
  | 'yuejing'
  | 'nianjing'
  | 'mingjing'
  | 'hejing'
  | 'shijing';

export interface ShijingTabDescriptor {
  readonly id: ShijingTabId;
  readonly order: 1 | 2 | 3 | 4 | 5 | 6;
  readonly chinese_label: string;
  readonly english_anchor: string;
}

// SJG-IA-01 - widening-horizon order: day -> month -> decade ->
// whole-life natal -> relationship -> consultation.
export const SHIJING_IA_TABS: readonly ShijingTabDescriptor[] = [
  { id: 'rijing', order: 1, chinese_label: '日镜', english_anchor: 'Daily Mirror' },
  { id: 'yuejing', order: 2, chinese_label: '月镜', english_anchor: 'Monthly Mirror' },
  { id: 'nianjing', order: 3, chinese_label: '年镜', english_anchor: 'Yearly Mirror' },
  { id: 'mingjing', order: 4, chinese_label: '命镜', english_anchor: 'Destiny Mirror' },
  { id: 'hejing', order: 5, chinese_label: '合镜', english_anchor: 'Relationship Mirror' },
  { id: 'shijing', order: 6, chinese_label: '问镜', english_anchor: 'Consultation Mirror' },
] as const;

export const SHIJING_PRIMARY_TAB_COUNT = SHIJING_IA_TABS.length;

export const SHIJING_FORBIDDEN_TAB_IDS: ReadonlySet<string> = new Set<string>([
  'today',
  'views',
  'consultation',
  'me',
  'history',
  'huangli',
  'reports',
  'customers',
  'clients',
  'trends',
  'consultants',
]);

export const SHIJING_FORBIDDEN_TAB_LABELS: ReadonlySet<string> = new Set<string>([
  '今日',
  '关注',
  '问时镜',
  '我',
]);

export function isForbiddenTabId(id: string): boolean {
  return SHIJING_FORBIDDEN_TAB_IDS.has(id);
}

export function isForbiddenTabLabel(label: string): boolean {
  return SHIJING_FORBIDDEN_TAB_LABELS.has(label);
}

export type ShijingSettingsSurfaceId =
  | 'self'
  | 'people'
  | 'concern_tags'
  | 'memory_and_plans'
  | 'response_preferences'
  | 'privacy_local_data'
  | 'diagnostics';

export const SHIJING_SECONDARY_SETTINGS_SURFACES: readonly ShijingSettingsSurfaceId[] = [
  'self',
  'people',
  'concern_tags',
  'memory_and_plans',
  'response_preferences',
  'privacy_local_data',
  'diagnostics',
] as const;

// SJG-IA-04 - the seven settings surfaces are grouped into ordered sub-pages
// inside the secondary Settings surface. This is a presentation grouping only:
// every surface in `SHIJING_SECONDARY_SETTINGS_SURFACES` appears in exactly one
// page (the union is total and disjoint). Renderer code must consume this
// constant rather than hardcoding a parallel page list (SJG-IA-07).
export type ShijingSettingsPageId = 'profile' | 'concerns' | 'memory' | 'settings';

export interface ShijingSettingsPageDescriptor {
  readonly id: ShijingSettingsPageId;
  readonly order: 1 | 2 | 3 | 4;
  readonly surfaces: readonly ShijingSettingsSurfaceId[];
}

export const SHIJING_SETTINGS_PAGES: readonly ShijingSettingsPageDescriptor[] = [
  { id: 'profile', order: 1, surfaces: ['self', 'people'] },
  { id: 'memory', order: 2, surfaces: ['memory_and_plans'] },
  { id: 'concerns', order: 3, surfaces: ['concern_tags'] },
  {
    id: 'settings',
    order: 4,
    surfaces: ['response_preferences', 'privacy_local_data', 'diagnostics'],
  },
] as const;

export type ShijingReadinessBlockerCode =
  | 'missing_self_natal_inputs'
  | 'invalid_self_natal_inputs'
  | 'unresolved_person_mention'
  | 'incomplete_related_person_natal_inputs'
  | 'stale_reading_inputs'
  | 'runtime_ai_failure'
  | 'persistence_failure'
  | 'hash_mismatch';

export const SHIJING_READINESS_BLOCKER_CODES: readonly ShijingReadinessBlockerCode[] = [
  'missing_self_natal_inputs',
  'invalid_self_natal_inputs',
  'unresolved_person_mention',
  'incomplete_related_person_natal_inputs',
  'stale_reading_inputs',
  'runtime_ai_failure',
  'persistence_failure',
  'hash_mismatch',
] as const;
