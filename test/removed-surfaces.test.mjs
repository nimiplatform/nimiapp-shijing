// rule.shijing.removed-surfaces.r002 — Removed-surface guard tests plus
// canonical-authority source coverage and admitted-name allowlist coverage.

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

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

const removedAuthority = parse(
  readFileSync(
    new URL('../.nimi/spec/shijing/canonical/removed-surfaces.authority.yaml', import.meta.url),
    'utf8',
  ),
);

function parseExactNameList(value) {
  return value.replace(/,? and /g, ', ').split(', ').map((name) => name.trim());
}

function canonicalRemovedNames() {
  const names = [];
  for (const unit of removedAuthority.units) {
    const match = /^The exact removed(?:-name group is| name is) (.+)\.$/.exec(unit.meaning ?? '');
    if (match) names.push(...parseExactNameList(match[1]));
  }
  return new Set(names);
}

function canonicalAllowedNames() {
  const guard = removedAuthority.units.find(
    (unit) => unit.id === 'definition.shijing.removed-surfaces.guard-semantics',
  );
  const match = /admitted exact names are (.+?); Reading/.exec(guard?.meaning ?? '');
  assert.ok(match, 'canonical removed-surface guard must enumerate admitted exact names');
  return new Set(parseExactNameList(match[1]));
}

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

test('guard set exactly mirrors canonical removed-surface definitions', () => {
  const authorityNames = canonicalRemovedNames();
  for (const authorityName of authorityNames) {
    assert.equal(
      REMOVED_SURFACE_NAMES.has(authorityName),
      true,
      `authority-only name missing in TS guard: ${authorityName}`,
    );
  }
  for (const tsName of REMOVED_SURFACE_NAMES) {
    assert.ok(authorityNames.has(tsName), `TS-only name missing in canonical authority: ${tsName}`);
  }
});

test('allowlist exactly mirrors canonical guard semantics', () => {
  const authorityAllowed = canonicalAllowedNames();
  for (const authorityName of authorityAllowed) {
    assert.equal(
      REMOVED_SURFACE_NAME_ALLOWLIST.has(authorityName),
      true,
      `authority-only allowed name missing in TS allowlist: ${authorityName}`,
    );
  }
  for (const tsName of REMOVED_SURFACE_NAME_ALLOWLIST) {
    assert.ok(
      authorityAllowed.has(tsName),
      `TS-only allowed name missing in canonical authority: ${tsName}`,
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
