// W05 — shell + IA contract surface tests.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  SHIJING_PRIMARY_TAB_DESCRIPTORS,
} from '../src/product/navigation/tab-descriptor.ts';
import { MIRROR_KIND_LABELS, TAB_LABELS, getProductCopy } from '../src/product/i18n/copy.ts';

test('primary tab descriptors match five-mirror IA', () => {
  assert.deepEqual(
    SHIJING_PRIMARY_TAB_DESCRIPTORS.map((tab) => tab.id),
    ['rijing', 'yuejing', 'nianjing', 'mingjing', 'shijing'],
  );
});

test('primary tab labels are 日镜/月镜/年镜/命镜/时镜', () => {
  assert.deepEqual(
    SHIJING_PRIMARY_TAB_DESCRIPTORS.map((tab) => tab.chinese_label),
    ['日镜', '月镜', '年镜', '命镜', '时镜'],
  );
});

test('i18n labels cover every mirror kind', () => {
  for (const kind of ['rijing', 'yuejing', 'nianjing', 'shijing']) {
    assert.ok(MIRROR_KIND_LABELS[kind], `missing label for ${kind}`);
  }
});

test('tab labels cover every primary tab including 命镜', () => {
  for (const tab of SHIJING_PRIMARY_TAB_DESCRIPTORS) {
    assert.ok(TAB_LABELS[tab.id], `missing tab label for ${tab.id}`);
  }
  assert.ok(TAB_LABELS.mingjing);
});

test('topbar does not render the compact UI language switch', () => {
  const shellSource = readFileSync(
    new URL('../src/product/shell/shijing-shell.tsx', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(shellSource, /<UiLanguageSwitch\s*\/>/);
});

test('startup onboarding is not mounted as a RiJing shell interstitial', () => {
  const shellSource = readFileSync(
    new URL('../src/product/shell/shijing-shell.tsx', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(shellSource, /ShijingOnboarding/);
  assert.doesNotMatch(shellSource, /state\.active_tab\s*===\s*['"]rijing['"]/);
});

test('MingJing tab owns the startup onboarding surface', () => {
  const mingjingSource = readFileSync(
    new URL('../src/product/tabs/mingjing-tab.tsx', import.meta.url),
    'utf8',
  );

  assert.match(mingjingSource, /ShijingOnboarding/);
  assert.match(mingjingSource, /<ShijingOnboarding\b/);
});

test('startup onboarding copy is not Daily Mirror specific', () => {
  const zh = getProductCopy('zh').onboarding;
  const en = getProductCopy('en').onboarding;

  assert.doesNotMatch(
    [
      zh.ariaLabel,
      zh.eyebrow,
      zh.title,
      zh.lede,
      zh.enter,
      zh.profileStageTitle,
      zh.concernStageTitle,
    ].join('\n'),
    /日镜/,
  );
  assert.match(zh.enter, /命镜/);

  assert.doesNotMatch(
    [
      en.ariaLabel,
      en.eyebrow,
      en.title,
      en.lede,
      en.enter,
      en.profileStageTitle,
      en.concernStageTitle,
    ].join('\n'),
    /Daily Mirror/,
  );
  assert.match(en.enter, /Destiny Mirror/);
});

test('onboarding readiness follows the MingJing natal projection requirements', () => {
  const onboardingSource = readFileSync(
    new URL('../src/product/onboarding/shijing-onboarding.tsx', import.meta.url),
    'utf8',
  );

  assert.match(onboardingSource, /mingJingReadiness/);
  assert.doesNotMatch(onboardingSource, /dailyMirrorScopeForToday/);
  assert.doesNotMatch(onboardingSource, /mirror_kind:\s*['"]rijing['"]/);
});
