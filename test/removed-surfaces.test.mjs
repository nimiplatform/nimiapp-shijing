// SJG-REMOVED-02 — Removed-surface guard tests plus yaml-source-of-truth
// coverage and admitted-name allowlist coverage.

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  READING_OWNER_SCOPED_REMOVED_FIELDS,
  REMOVED_SURFACE_NAMES,
  REMOVED_SURFACE_NAME_ALLOWLIST,
  isAdmittedSurfaceName,
  isReadingOwnerScopedRemovedField,
  isRemovedSurfaceName,
  rejectIfRemovedSurface,
} from '../src/contracts/removed-surfaces.ts';

const EXPECTED_REMOVED = [
  'Profile',
  'Venture',
  'ViewWorkspace',
  'View',
  'view',
  'views',
  'Focus',
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
  'ShiJingCatalog',
  'catalog_snapshot',
  'roster',
  'History',
  'TrendChart',
  'LuckScore',
  'luck_curve',
  'KLine',
  'curve',
  'numeric_series',
  'global_instructions',
  'project_memory',
  'Customer',
  'Consultant',
  'task',
  'tasks',
  'project',
  'projects',
  'Gantt',
  'deadline',
  'overdue',
  'priority',
  'progress',
  'assignee',
];

const EXPECTED_ALLOWED = [
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

const ACCEPTED_NEUTRAL = ['ShiJingSpace', 'SubjectRef', 'self_subject', 'Person', 'Reading', 'Settings'];

test('each expected removed name is rejected by guard', () => {
  for (const name of EXPECTED_REMOVED) {
    assert.equal(isRemovedSurfaceName(name), true, `expected removed: ${name}`);
    const reject = rejectIfRemovedSurface(name);
    assert.equal(reject.ok, false);
    if (!reject.ok) assert.equal(reject.offendingName, name);
  }
});

test('admitted v1 names are NOT flagged as removed', () => {
  for (const name of EXPECTED_ALLOWED) {
    assert.equal(isAdmittedSurfaceName(name), true, `should be allowlisted: ${name}`);
    assert.equal(isRemovedSurfaceName(name), false, `should NOT be removed: ${name}`);
  }
});

test('canonical neutral identifiers are not flagged', () => {
  for (const name of ACCEPTED_NEUTRAL) {
    assert.equal(isRemovedSurfaceName(name), false, `should NOT be removed: ${name}`);
  }
});

test('guard set exactly mirrors yaml authority `removed_names`', () => {
  const yamlPath = new URL(
    '../.nimi/spec/shijing/kernel/tables/removed-surface-names.yaml',
    import.meta.url,
  );
  const yamlText = readFileSync(yamlPath, 'utf8');
  const lines = yamlText.split('\n');
  const yamlNames = new Set();
  let section = '';
  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    if (line.startsWith('removed_names:')) {
      section = 'removed_names';
      continue;
    }
    if (line.startsWith('guard_semantics:')) {
      section = 'guard_semantics';
      continue;
    }
    if (line.match(/^[a-z_]+:/) && !line.startsWith('  ')) {
      section = '';
      continue;
    }
    if (section === 'removed_names') {
      const m = /^\s+-\s+(.+)$/.exec(line);
      if (m) yamlNames.add(m[1].trim());
    }
  }
  for (const yamlName of yamlNames) {
    assert.equal(
      REMOVED_SURFACE_NAMES.has(yamlName),
      true,
      `yaml-only name missing in TS guard: ${yamlName}`,
    );
  }
  for (const tsName of REMOVED_SURFACE_NAMES) {
    assert.ok(yamlNames.has(tsName), `TS-only name missing in yaml authority: ${tsName}`);
  }
});

test('allowlist exactly mirrors yaml `admitted_names_allowlist`', () => {
  const yamlPath = new URL(
    '../.nimi/spec/shijing/kernel/tables/removed-surface-names.yaml',
    import.meta.url,
  );
  const yamlText = readFileSync(yamlPath, 'utf8');
  const lines = yamlText.split('\n');
  const yamlAllowed = new Set();
  let inSection = false;
  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    if (line.match(/^\s*admitted_names_allowlist:\s*$/)) {
      inSection = true;
      continue;
    }
    if (inSection) {
      const m = /^\s+-\s+(.+)$/.exec(line);
      if (m) {
        yamlAllowed.add(m[1].trim());
      } else if (line.match(/^\s*[a-z_]+:/) || line.match(/^[^\s-]/)) {
        inSection = false;
      }
    }
  }
  for (const yamlName of yamlAllowed) {
    assert.equal(
      REMOVED_SURFACE_NAME_ALLOWLIST.has(yamlName),
      true,
      `yaml-only allowed name missing in TS allowlist: ${yamlName}`,
    );
  }
  for (const tsName of REMOVED_SURFACE_NAME_ALLOWLIST) {
    assert.ok(
      yamlAllowed.has(tsName),
      `TS-only allowed name missing in yaml allowlist: ${tsName}`,
    );
  }
});

test('owner-scoped removed Reading fields are recognized', () => {
  for (const field of READING_OWNER_SCOPED_REMOVED_FIELDS) {
    assert.equal(isReadingOwnerScopedRemovedField(field), true);
  }
  assert.equal(isReadingOwnerScopedRemovedField('mirror_kind'), false);
  assert.equal(isReadingOwnerScopedRemovedField('mirror_scope'), false);
});

test('guard does not use substring matching', () => {
  // The substring 'view' appears inside admitted names like 'preview' or
  // 'overview' (e.g., 'daily_overview'); exact-symbol matching must let those
  // through.
  assert.equal(isRemovedSurfaceName('preview'), false);
  assert.equal(isRemovedSurfaceName('overview'), false);
  assert.equal(isRemovedSurfaceName('daily_overview'), false);
});
