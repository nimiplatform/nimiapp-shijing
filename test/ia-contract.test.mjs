// SJG-IA-01..05 — IA tab contract tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SHIJING_FORBIDDEN_TAB_IDS,
  SHIJING_IA_TABS,
  SHIJING_PRIMARY_TAB_COUNT,
  isForbiddenTabId,
} from '../src/contracts/ia-contract.ts';

test('exactly four primary tabs', () => {
  assert.equal(SHIJING_PRIMARY_TAB_COUNT, 4);
  assert.equal(SHIJING_IA_TABS.length, 4);
});

test('canonical ordered ids match contract', () => {
  assert.deepEqual(
    SHIJING_IA_TABS.map((tab) => tab.id),
    ['today', 'views', 'consultation', 'me'],
  );
  assert.deepEqual(
    SHIJING_IA_TABS.map((tab) => tab.order),
    [1, 2, 3, 4],
  );
});

test('canonical chinese labels match product authority', () => {
  assert.deepEqual(
    SHIJING_IA_TABS.map((tab) => tab.chinese_label),
    ['今日', '关注', '问时镜', '我'],
  );
});

test('forbidden tab ids include all removed surfaces', () => {
  for (const id of ['history', 'huangli', 'reports', 'customers', 'clients', 'trends', 'consultants']) {
    assert.equal(isForbiddenTabId(id), true, `expected forbidden: ${id}`);
    assert.ok(SHIJING_FORBIDDEN_TAB_IDS.has(id));
  }
});

test('canonical tab ids are not forbidden', () => {
  for (const tab of SHIJING_IA_TABS) {
    assert.equal(isForbiddenTabId(tab.id), false, `canonical id should not be forbidden: ${tab.id}`);
  }
});
