// SJG-REMOVED-02 — Removed-surface guard tests plus
// yaml-source-of-truth coverage.

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  REMOVED_SURFACE_NAMES,
  isRemovedSurfaceName,
  rejectIfRemovedSurface,
} from '../src/contracts/removed-surfaces.ts';

const EXPECTED_NAMES = [
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
  'ProjectMemory',
  'project_memory',
  'LongLine',
  'long_line',
  'long_lines',
  'GlobalInstructions',
  'global_instructions',
];

const ACCEPTED_NAMES = [
  'ShiJingSpace',
  'SubjectRef',
  'self_subject',
  'Person',
  'View',
  'Reading',
  'ShiJingCatalog',
  'ViewTemplate',
  'Settings',
  'response_preferences',
  'NimiUser',
];

test('each expected removed name is rejected by guard', () => {
  for (const name of EXPECTED_NAMES) {
    assert.equal(isRemovedSurfaceName(name), true, `expected removed: ${name}`);
    const reject = rejectIfRemovedSurface(name);
    assert.equal(reject.ok, false);
    if (!reject.ok) assert.equal(reject.offendingName, name);
  }
});

test('canonical ShiJing identifiers are not flagged as removed', () => {
  for (const name of ACCEPTED_NAMES) {
    assert.equal(isRemovedSurfaceName(name), false, `should NOT be removed: ${name}`);
    const reject = rejectIfRemovedSurface(name);
    assert.equal(reject.ok, true);
  }
});

test('guard set exactly mirrors yaml authority', () => {
  const yamlPath = new URL('../spec/kernel/tables/removed-surface-names.yaml', import.meta.url);
  const yamlText = readFileSync(yamlPath, 'utf8');
  const yamlNames = new Set();
  for (const line of yamlText.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) {
      yamlNames.add(trimmed.slice(2).trim());
    }
  }
  for (const expected of EXPECTED_NAMES) {
    assert.ok(yamlNames.has(expected), `yaml missing: ${expected}`);
  }
  for (const yamlName of yamlNames) {
    assert.equal(REMOVED_SURFACE_NAMES.has(yamlName), true, `yaml-only name missing in TS guard: ${yamlName}`);
  }
  for (const tsName of REMOVED_SURFACE_NAMES) {
    assert.ok(yamlNames.has(tsName), `TS-only name missing in yaml authority: ${tsName}`);
  }
});

test('REMOVED_SURFACE_NAMES has all expected names', () => {
  for (const name of EXPECTED_NAMES) {
    assert.equal(REMOVED_SURFACE_NAMES.has(name), true, `missing in guard set: ${name}`);
  }
});
