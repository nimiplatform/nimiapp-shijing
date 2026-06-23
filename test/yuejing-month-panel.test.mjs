// YueJing 30-day interpretation panel contract.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const tabSource = readFileSync(
  new URL('../src/product/tabs/yuejing-tab.tsx', import.meta.url),
  'utf8',
);
const interpretationSource = readFileSync(
  new URL('../src/product/tabs/yuejing-month-interpretation.ts', import.meta.url),
  'utf8',
);
const monthPanelSurface = `${tabSource}\n${interpretationSource}`;

test('YueJing 30-day drawer exposes the actionable interpretation sections', () => {
  // The numbered sections of the redesigned「30 日解读」panel
  // (① 本期主线 … ⑤ 收尾提醒) plus the per-concern action checklist and
  // the collapsible generation basis.
  for (const label of [
    '本期主线',
    '30 日节奏概览',
    '关键日期窗口',
    '30 日节奏',
    '关注行动',
    '本期行动清单',
    '收尾提醒',
    '不建议做的事',
    '复盘问题',
    '生成依据',
  ]) {
    assert.ok(monthPanelSurface.includes(label), `missing section label: ${label}`);
  }

  assert.match(
    tabSource,
    /<details\s+className="shijing-yuejing__month-evidence"/,
    'generation basis must stay collapsible',
  );
});

test('YueJing 30-day drawer copy avoids absolute prediction wording', () => {
  assert.doesNotMatch(tabSource, /必然|一定|注定/);
});
