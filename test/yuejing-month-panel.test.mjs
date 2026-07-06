// YueJing 30-day interpretation panel contract.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { deriveYueJingMonthInterpretation } from '../src/product/tabs/yuejing-month-interpretation.ts';
import { CONCERN_ACTION_BY_LABEL } from '../src/product/tabs/yuejing/yuejing-month-language.ts';
import { YUEJING_COPY } from '../src/product/tabs/yuejing/yuejing-copy.ts';

const tabSource = readFileSync(
  new URL('../src/product/tabs/yuejing-tab.tsx', import.meta.url),
  'utf8',
);
const interpretationSource = readFileSync(
  new URL('../src/product/tabs/yuejing-month-interpretation.ts', import.meta.url),
  'utf8',
);
const monthPanelLanguageSource = readFileSync(
  new URL('../src/product/tabs/yuejing/yuejing-month-language.ts', import.meta.url),
  'utf8',
);
const monthPanelSource = readFileSync(
  new URL('../src/product/tabs/yuejing/yuejing-month-panel.tsx', import.meta.url),
  'utf8',
);
const monthPanelCopySource = readFileSync(
  new URL('../src/product/tabs/yuejing/yuejing-copy.ts', import.meta.url),
  'utf8',
);
const monthPanelSurface = `${tabSource}\n${interpretationSource}\n${monthPanelLanguageSource}\n${monthPanelSource}\n${monthPanelCopySource}`;

function datesFrom(start, count) {
  const startTime = Date.parse(`${start}T00:00:00Z`);
  return Array.from({ length: count }, (_, index) =>
    new Date(startTime + index * 86_400_000).toISOString().slice(0, 10),
  );
}

const actionGuideTags = [
  {
    id: 'c-career',
    label: '#事业',
    status: 'active',
    sort_order: 0,
    parsed_topics: ['career'],
    mention_refs: [],
    prompt_text: '',
    created_at: '2024-07-05T00:00:00Z',
    updated_at: '2024-07-05T00:00:00Z',
  },
  {
    id: 'c-body',
    label: '#身体',
    status: 'active',
    sort_order: 1,
    parsed_topics: ['body'],
    mention_refs: [],
    prompt_text: '',
    created_at: '2024-07-05T00:00:00Z',
    updated_at: '2024-07-05T00:00:00Z',
  },
];

const actionGuideDayTendencies = {
  '2024-07-05': 'watch',
  '2024-07-06': 'turning',
  '2024-07-07': 'turning',
  '2024-07-08': 'blocked',
  '2024-07-09': 'blocked',
  '2024-07-10': 'steady',
  '2024-07-11': 'supportive',
  '2024-07-12': 'supportive',
  '2024-07-13': 'supportive',
  '2024-07-14': 'supportive',
  '2024-07-15': 'watch',
  '2024-07-16': 'watch',
  '2024-07-17': 'steady',
  '2024-07-18': 'turning',
  '2024-07-19': 'turning',
  '2024-07-20': 'steady',
  '2024-07-21': 'supportive',
  '2024-07-22': 'supportive',
  '2024-07-23': 'supportive',
  '2024-07-24': 'supportive',
  '2024-07-25': 'watch',
  '2024-07-26': 'watch',
  '2024-07-27': 'blocked',
  '2024-07-28': 'blocked',
  '2024-07-29': 'steady',
  '2024-07-30': 'turning',
  '2024-07-31': 'turning',
  '2024-08-01': 'supportive',
  '2024-08-02': 'supportive',
  '2024-08-03': 'supportive',
};

function actionGuideFixture() {
  const dates = datesFrom('2024-07-05', 30);
  const cellsByDate = new Map(dates.map((date) => [
    date,
    actionGuideTags.map((tag) => ({
      date,
      concern_tag_ref: tag.id,
      tendency_class: actionGuideDayTendencies[date],
      summary: '',
    })),
  ]));
  return { dates, cellsByDate };
}

test('YueJing 30-day drawer is positioned as an action guide, not a long report', () => {
  for (const label of [
    '30日行动指南',
    '行动导向的解读，聚焦你接下来该做什么。',
    '本期结论',
    '三个关键窗口',
    '我的关注行动',
    '30日详细节奏',
    '每日分布',
    '生成依据',
  ]) {
    assert.ok(monthPanelSurface.includes(label), `missing section label: ${label}`);
  }

  assert.equal(
    monthPanelSurface.includes('展开更多'),
    false,
    'the fourth month-panel section must not expose the redundant expand-more heading',
  );

  for (const removedDefaultSection of [
    '30 日节奏概览',
    '关键日期窗口',
    '收尾提醒',
    '不建议做的事',
    '复盘问题',
  ]) {
    assert.equal(
      monthPanelCopySource.includes(removedDefaultSection),
      false,
      `legacy report section still exposed in default month-panel copy: ${removedDefaultSection}`,
    );
  }

  assert.match(
    monthPanelSource,
    /<details\s+className="shijing-yuejing__month-accordion"/,
    'expanded-more rows must use collapsed details rows',
  );
  assert.doesNotMatch(
    monthPanelSource,
    /<span className="shijing-yuejing__month-num" aria-hidden>4<\/span>/,
    'the month-panel no longer renders a numbered fourth heading for supplementary accordions',
  );
});

test('YueJing action guide copy answers mainline, windows, and concrete actions quickly', () => {
  for (const label of [
    '助力',
    '接下来30天适合稳步推进已确认的事情，不要急着换方向。',
    '主动推进窗口',
    '放慢判断窗口',
    '转向信号窗口',
    '适合沟通、提交、落实已确认事项。',
    '不急着下结论，先观察反馈。',
    '适合复盘与调整策略。',
    '事业',
    '把已明确的事项往前推，不要临时换方向。',
    '身体',
    '以恢复节律为主，维持可持续的作息与活动量。',
  ]) {
    assert.ok(monthPanelSurface.includes(label), `missing action-guide copy: ${label}`);
  }

  assert.equal(
    YUEJING_COPY.monthPanel.primaryAxis(CONCERN_ACTION_BY_LABEL['事业'].axis),
    '主轴：推进',
  );
  assert.equal(
    YUEJING_COPY.monthPanel.primaryAxis(CONCERN_ACTION_BY_LABEL['身体'].axis),
    '主轴：平衡',
  );
});

test('YueJing action guide derives the requested window and concern action dates', () => {
  const { dates, cellsByDate } = actionGuideFixture();
  const interpretation = deriveYueJingMonthInterpretation({
    dates,
    cellsByDate,
    activeTags: actionGuideTags,
  });

  assert.equal(interpretation.range_label, '7月5日–8月3日');
  assert.equal(interpretation.primary, 'supportive');
  assert.deepEqual(interpretation.day_counts, {
    supportive: 11,
    steady: 4,
    watch: 5,
    blocked: 4,
    turning: 6,
  });
  assert.deepEqual(
    interpretation.key_windows.map((window) => [window.title, window.date_ranges.map((range) => range.label)]),
    [
      ['主动推进窗口', ['7月11日–7月14日', '7月21日–7月24日', '8月1日–8月3日']],
      ['放慢判断窗口', ['7月5日', '7月15日–7月16日', '7月25日–7月26日']],
      ['转向信号窗口', ['7月6日–7月7日', '7月18日–7月19日', '7月30日–7月31日']],
    ],
  );

  const actionsByTag = new Map(
    interpretation.concern_interpretations.map((item) => [
      item.tag_label,
      item.action_items.map((action) => `${action.window}：${action.label}`),
    ]),
  );
  assert.deepEqual(actionsByTag.get('事业'), [
    '7月8日–8月3日：持续推进已确定事项',
    '7月15日–7月16日：避免做关键决策',
    '7月18日–7月19日：复盘当前方向是否需要调整',
  ]);
  assert.deepEqual(actionsByTag.get('身体'), [
    '7月11日–7月14日：恢复规律作息与轻运动',
    '7月15日–7月16日：避免突然加量或过度消耗',
    '7月18日–7月19日：观察睡眠、饮食与疲劳变化',
  ]);
});

test('YueJing 30-day drawer copy avoids absolute prediction wording', () => {
  assert.doesNotMatch(monthPanelSurface, /必然|一定|注定/);
});
