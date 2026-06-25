import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  deriveYueJingCalendarDetails,
  deriveYueJingLunisolarMarker,
} from '../src/product/tabs/yuejing/yuejing-model.ts';
import { YUEJING_COPY } from '../src/product/tabs/yuejing/yuejing-copy.ts';

const dayPanelSource = readFileSync(
  new URL('../src/product/tabs/yuejing/yuejing-day-panel.tsx', import.meta.url),
  'utf8',
);
const calendarSource = readFileSync(
  new URL('../src/product/tabs/yuejing/yuejing-calendar.tsx', import.meta.url),
  'utf8',
);
const dayPanelCssSource = readFileSync(
  new URL('../src/product/tabs/yuejing/yuejing-day-panel.css', import.meta.url),
  'utf8',
);
const calendarCssSource = readFileSync(
  new URL('../src/product/tabs/yuejing/yuejing-calendar.css', import.meta.url),
  'utf8',
);

test('deriveYueJingLunisolarMarker: marks solar terms ahead of ordinary lunar day labels', () => {
  assert.deepEqual(deriveYueJingLunisolarMarker('2026-07-23'), {
    kind: 'solar_term',
    label: '大暑',
    lunar_label: '初十',
  });
});

test('deriveYueJingLunisolarMarker: marks lunar festivals from the deterministic calendar', () => {
  assert.deepEqual(deriveYueJingLunisolarMarker('2026-06-19'), {
    kind: 'festival',
    label: '端午节',
    lunar_label: '初五',
  });
});

test('deriveYueJingLunisolarMarker: marks solar festivals and admitted fixed observances', () => {
  assert.deepEqual(deriveYueJingLunisolarMarker('2026-07-01'), {
    kind: 'festival',
    label: '建党节',
    lunar_label: '十七',
  });
  assert.deepEqual(deriveYueJingLunisolarMarker('2026-07-11'), {
    kind: 'festival',
    label: '中国航海日',
    lunar_label: '廿七',
  });
});

test('deriveYueJingLunisolarMarker: uses lunar month names on lunar month start', () => {
  assert.deepEqual(deriveYueJingLunisolarMarker('2026-07-14'), {
    kind: 'lunar_month',
    label: '六月',
    lunar_label: '六月',
  });
});

test('deriveYueJingLunisolarMarker: uses ordinary lunar day labels and fails closed for invalid dates', () => {
  assert.deepEqual(deriveYueJingLunisolarMarker('2026-07-24'), {
    kind: 'lunar_day',
    label: '十一',
    lunar_label: '十一',
  });
  assert.equal(deriveYueJingLunisolarMarker('not-a-date'), null);
});

test('deriveYueJingCalendarDetails: exposes generic calendar details without fortune payloads', () => {
  assert.deepEqual(deriveYueJingCalendarDetails('2026-06-19'), {
    lunar_label: '农历五月初五',
    ganzhi_label: '丙午年 甲午月 甲子日',
    solar_term_label: null,
    festival_labels: ['端午节'],
  });
  assert.deepEqual(deriveYueJingCalendarDetails('2026-07-23'), {
    lunar_label: '农历六月初十',
    ganzhi_label: '丙午年 乙未月 戊戌日',
    solar_term_label: '大暑',
    festival_labels: [],
  });
  assert.deepEqual(deriveYueJingCalendarDetails('2026-07-11')?.festival_labels, ['中国航海日']);
  assert.equal(deriveYueJingCalendarDetails('not-a-date'), null);
});

test('YueJing calendar day cards render the lunisolar marker as visible cell metadata', () => {
  assert.match(calendarSource, /deriveYueJingLunisolarMarker/);
  assert.match(calendarSource, /shijing-yuejing__day-lunisolar/);
  assert.match(calendarSource, /data-marker-kind=\{marker\.kind\}/);
});

test('YueJing day drawer renders generic calendar details without reintroducing Huangli surface names', () => {
  assert.match(dayPanelSource, /deriveYueJingCalendarDetails/);
  assert.equal(YUEJING_COPY.dayPanel.calendarDetails.title, '通用历法');
  assert.match(dayPanelSource, /YUEJING_COPY\.dayPanel\.calendarDetails\.title/);
  assert.match(dayPanelSource, /YUEJING_COPY\.dayPanel\.calendarDetails\.lunar/);
  assert.match(dayPanelSource, /shijing-yuejing__panel-calendar/);
  assert.match(dayPanelCssSource, /\.shijing-yuejing__panel-calendar/);
  assert.doesNotMatch(dayPanelSource, /黄历|宜忌|吉凶|冲煞/);
});

test('YueJing calendar tendency chip is anchored to the lower-right of the day block', () => {
  const match = /\.shijing-yuejing__day-tendency\s*\{(?<body>[^}]+)\}/.exec(calendarCssSource);
  assert.ok(match?.groups?.body, 'missing day tendency CSS rule');
  const body = match.groups.body;
  assert.match(body, /grid-row:\s*3;/);
  assert.match(body, /align-self:\s*end;/);
  assert.match(body, /justify-self:\s*end;/);
});
