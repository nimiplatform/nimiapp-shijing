// SJG-IA-01..08 - IA tab contract tests for the six-mirror IA.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SHIJING_FORBIDDEN_TAB_IDS,
  SHIJING_FORBIDDEN_TAB_LABELS,
  SHIJING_IA_TABS,
  SHIJING_PRIMARY_TAB_COUNT,
  SHIJING_READINESS_BLOCKER_CODES,
  SHIJING_SECONDARY_SETTINGS_SURFACES,
  SHIJING_SETTINGS_PAGES,
  isForbiddenTabId,
  isForbiddenTabLabel,
} from '../src/contracts/ia-contract.ts';

test('exactly six primary tabs', () => {
  assert.equal(SHIJING_PRIMARY_TAB_COUNT, 6);
  assert.equal(SHIJING_IA_TABS.length, 6);
});

test('canonical ordered ids are RiJing/YueJing/NianJing/MingJing/HeJing/ShiJing', () => {
  assert.deepEqual(
    SHIJING_IA_TABS.map((tab) => tab.id),
    ['rijing', 'yuejing', 'nianjing', 'mingjing', 'hejing', 'shijing'],
  );
  assert.deepEqual(
    SHIJING_IA_TABS.map((tab) => tab.order),
    [1, 2, 3, 4, 5, 6],
  );
});

test('canonical chinese labels are Ri/Yue/Nian/Ming/He/Shi mirrors', () => {
  assert.deepEqual(
    SHIJING_IA_TABS.map((tab) => tab.chinese_label),
    ['日镜', '月镜', '年镜', '命镜', '合镜', '问镜'],
  );
});

test('forbidden tab ids include all removed surfaces', () => {
  for (const id of [
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
  ]) {
    assert.equal(isForbiddenTabId(id), true, `expected forbidden: ${id}`);
    assert.ok(SHIJING_FORBIDDEN_TAB_IDS.has(id));
  }
});

test('forbidden labels include removed chinese primary labels', () => {
  for (const label of ['今日', '关注', '问时镜', '我']) {
    assert.equal(isForbiddenTabLabel(label), true, `expected forbidden label: ${label}`);
    assert.ok(SHIJING_FORBIDDEN_TAB_LABELS.has(label));
  }
});

test('canonical tab ids and labels are not forbidden', () => {
  for (const tab of SHIJING_IA_TABS) {
    assert.equal(isForbiddenTabId(tab.id), false, `canonical id should not be forbidden: ${tab.id}`);
    assert.equal(
      isForbiddenTabLabel(tab.chinese_label),
      false,
      `canonical label should not be forbidden: ${tab.chinese_label}`,
    );
  }
});

test('secondary settings surfaces include all required entries', () => {
  for (const surface of [
    'self',
    'people',
    'concern_tags',
    'memory_and_plans',
    'response_preferences',
    'privacy_local_data',
    'diagnostics',
  ]) {
    assert.ok(
      SHIJING_SECONDARY_SETTINGS_SURFACES.includes(surface),
      `secondary settings missing: ${surface}`,
    );
  }
});

test('settings pages partition the seven surfaces exactly', () => {
  assert.deepEqual(
    SHIJING_SETTINGS_PAGES.map((page) => page.id),
    ['profile', 'memory', 'concerns', 'settings'],
  );
  assert.deepEqual(
    SHIJING_SETTINGS_PAGES.map((page) => page.order),
    [1, 2, 3, 4],
  );

  const grouped = SHIJING_SETTINGS_PAGES.flatMap((page) => page.surfaces);
  for (const surface of SHIJING_SECONDARY_SETTINGS_SURFACES) {
    assert.ok(grouped.includes(surface), `surface not placed in any page: ${surface}`);
  }
  assert.equal(grouped.length, SHIJING_SECONDARY_SETTINGS_SURFACES.length);
  assert.equal(new Set(grouped).size, grouped.length, 'a surface appears in more than one page');
});

test('readiness blocker codes cover required cases', () => {
  for (const code of [
    'missing_self_natal_inputs',
    'invalid_self_natal_inputs',
    'unresolved_person_mention',
    'incomplete_related_person_natal_inputs',
    'stale_reading_inputs',
    'runtime_ai_failure',
    'persistence_failure',
    'hash_mismatch',
  ]) {
    assert.ok(SHIJING_READINESS_BLOCKER_CODES.includes(code));
  }
});
