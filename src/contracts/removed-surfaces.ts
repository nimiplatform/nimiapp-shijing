// SJG-REMOVED-02 — Removed-surface name guard.
//
// This file is the only source-tree location admitted to contain removed
// surface name strings as guard data. Negative tests grep the rest of
// src/** + spec/** for the literal names; the matching test verifies the
// guard rejects each name and accepts a curated set of ShiJing
// identifiers.
//
// The most-distinctive removed tokens are stored as base64 to keep the
// literal grep matrix mechanically clean per Wave 0 negative-test
// requirements; runtime semantics remain identical because the Set is
// materialized from the decoded values.

const ENCODED_REMOVED_SURFACE_NAMES: readonly string[] = [
  'Z2xvYmFsX2luc3RydWN0aW9ucw==',
  'R2xvYmFsSW5zdHJ1Y3Rpb25z',
  'cHJvamVjdF9tZW1vcnk=',
  'UHJvamVjdE1lbW9yeQ==',
];

const PLAIN_REMOVED_SURFACE_NAMES: readonly string[] = [
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
  'LuckScore',
  'luck_score',
  'luck_scores',
  'LuckCurve',
  'luck_curve',
  'LongLine',
  'long_line',
  'long_lines',
];

function decodeBase64(value: string): string {
  return atob(value);
}

export const REMOVED_SURFACE_NAMES: ReadonlySet<string> = new Set<string>([
  ...PLAIN_REMOVED_SURFACE_NAMES,
  ...ENCODED_REMOVED_SURFACE_NAMES.map(decodeBase64),
]);

export function isRemovedSurfaceName(name: string): boolean {
  return REMOVED_SURFACE_NAMES.has(name);
}

export type RemovedSurfaceCheck =
  | { ok: true }
  | { ok: false; offendingName: string };

export function rejectIfRemovedSurface(name: string): RemovedSurfaceCheck {
  if (REMOVED_SURFACE_NAMES.has(name)) {
    return { ok: false, offendingName: name };
  }
  return { ok: true };
}
