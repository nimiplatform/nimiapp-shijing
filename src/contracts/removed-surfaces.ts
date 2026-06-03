// SJG-REMOVED-02 — Removed-surface name guard.
//
// Mirrors `.nimi/spec/shijing/kernel/tables/removed-surface-names.yaml`.
// Source/spec guards must reject every removed name as active product/source
// truth. The guard is exact-symbol / exact-field / exact-surface matching.
// Admitted v1 names (EventMemory, PlanItem, ConcernTag, …) are kept in the
// allowlist so they cannot accidentally be classified as removed. Owner-scoped
// removed Reading fields (legacy kind / scope / view_id / …) are checked
// separately so they can be guarded only when they appear on a Reading-shaped
// payload.

export const REMOVED_SURFACE_NAMES_RAW: readonly string[] = [
  'Profile',
  'profile',
  'profiles',
  'ProfileRef',
  'Venture',
  'venture',
  'ventures',
  'VentureNode',
  'venture_node',
  'venture_nodes',
  'Huangli',
  'huangli',
  'HuangliDaily',
  'huangli_daily',
  'huangli_mode',
  'Report',
  'report',
  'reports',
  'MonthlyReport',
  'monthly_report',
  'monthly_reports',
  'YearlyReport',
  'yearly_report',
  'yearly_reports',
  'TrendChart',
  'trend_chart',
  'trend_charts',
  'trend',
  'trends',
  'score_trend',
  'LuckScore',
  'luck_score',
  'luck_scores',
  'LuckCurve',
  'luck_curve',
  'LuckRank',
  'luck_rank',
  'percentile',
  'KLine',
  'kline',
  'k_line',
  'k_line_bar',
  'curve',
  'numeric_series',
  'ProjectMemory',
  'project_memory',
  'LongLine',
  'long_line',
  'long_lines',
  'GlobalInstructions',
  'global_instructions',
  'View',
  'view',
  'views',
  'ViewTemplate',
  'view_template',
  'view_templates',
  'ViewWorkspace',
  'view_workspace',
  'ViewMemory',
  'view_memory',
  'ViewSnapshot',
  'view_snapshot',
  'Focus',
  'focus',
  'Event',
  'event',
  'events',
  'recap',
  'Relation',
  'relation',
  'relations',
  'relation_hint',
  'subject_context',
  'CurrentObservationTarget',
  'current_observation_target',
  'ShiJingCatalog',
  'shijing_catalog',
  'catalog_snapshot',
  'roster',
  'context_item',
  'context_items',
  'History',
  'history',
  'history_tab',
  'Customer',
  'customer',
  'customers',
  'Client',
  'client',
  'clients',
  'CRM',
  'crm',
  'customer_management',
  'Consultant',
  'consultant',
  'consultants',
  'consultant_booking',
  'booking',
  'commerce',
  'batch_import',
  'batch_export',
  'Task',
  'task',
  'tasks',
  'Project',
  'project',
  'projects',
  'deadline',
  'due',
  'overdue',
  'dependency',
  'dependencies',
  'board',
  'boards',
  'milestone',
  'priority',
  'priorities',
  'progress',
  'assignee',
  'workflow',
  'Gantt',
  'gantt',
];

export const REMOVED_SURFACE_NAME_ALLOWLIST_RAW: readonly string[] = [
  'EventMemory',
  'event_memory',
  'event_memories',
  'cited_event_memory_refs',
  'PlanItem',
  'plan_item',
  'plan_items',
  'cited_plan_item_refs',
  'ConcernTag',
  'concern_tag',
  'concern_tags',
  'concern_tag_refs',
];

export const REMOVED_SURFACE_NAMES: ReadonlySet<string> = new Set(REMOVED_SURFACE_NAMES_RAW);

export const REMOVED_SURFACE_NAME_ALLOWLIST: ReadonlySet<string> = new Set(
  REMOVED_SURFACE_NAME_ALLOWLIST_RAW,
);

export const READING_OWNER_SCOPED_REMOVED_FIELDS_RAW: readonly string[] = [
  'kind',
  'scope',
  'anchor_subject',
  'subjects',
  'time_window',
  'view_id',
  'ad_hoc_context',
];

export const READING_OWNER_SCOPED_REMOVED_FIELDS: ReadonlySet<string> = new Set(
  READING_OWNER_SCOPED_REMOVED_FIELDS_RAW,
);

export function isRemovedSurfaceName(name: string): boolean {
  if (REMOVED_SURFACE_NAME_ALLOWLIST.has(name)) return false;
  return REMOVED_SURFACE_NAMES.has(name);
}

export function isAdmittedSurfaceName(name: string): boolean {
  return REMOVED_SURFACE_NAME_ALLOWLIST.has(name);
}

export function isReadingOwnerScopedRemovedField(field: string): boolean {
  return READING_OWNER_SCOPED_REMOVED_FIELDS.has(field);
}

export type RemovedSurfaceCheck =
  | { ok: true }
  | { ok: false; offendingName: string };

export function rejectIfRemovedSurface(name: string): RemovedSurfaceCheck {
  if (isRemovedSurfaceName(name)) {
    return { ok: false, offendingName: name };
  }
  return { ok: true };
}
