// W05 — shell + IA contract surface tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SHIJING_PRIMARY_TAB_DESCRIPTORS,
} from '../src/product/navigation/tab-descriptor.ts';
import { MIRROR_KIND_LABELS } from '../src/product/i18n/copy.ts';

test('primary tab descriptors match four-mirror IA', () => {
  assert.deepEqual(
    SHIJING_PRIMARY_TAB_DESCRIPTORS.map((tab) => tab.id),
    ['rijing', 'yuejing', 'nianjing', 'shijing'],
  );
});

test('primary tab labels are 日镜/月镜/年镜/时镜', () => {
  assert.deepEqual(
    SHIJING_PRIMARY_TAB_DESCRIPTORS.map((tab) => tab.chinese_label),
    ['日镜', '月镜', '年镜', '时镜'],
  );
});

test('i18n labels cover every mirror kind', () => {
  for (const kind of ['rijing', 'yuejing', 'nianjing', 'shijing']) {
    assert.ok(MIRROR_KIND_LABELS[kind], `missing label for ${kind}`);
  }
});
