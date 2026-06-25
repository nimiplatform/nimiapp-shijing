// W05 - shell + IA contract surface tests.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  SHIJING_PRIMARY_TAB_DESCRIPTORS,
} from '../src/product/navigation/tab-descriptor.ts';
import { MIRROR_KIND_LABELS, TAB_LABELS, getProductCopy } from '../src/product/i18n/copy.ts';

test('primary tab descriptors match six-mirror IA', () => {
  assert.deepEqual(
    SHIJING_PRIMARY_TAB_DESCRIPTORS.map((tab) => tab.id),
    ['rijing', 'yuejing', 'nianjing', 'mingjing', 'hejing', 'shijing'],
  );
});

test('primary tab labels are Ri/Yue/Nian/Ming/He/Shi mirrors', () => {
  assert.deepEqual(
    SHIJING_PRIMARY_TAB_DESCRIPTORS.map((tab) => tab.chinese_label),
    ['日镜', '月镜', '年镜', '命镜', '合镜', '问镜'],
  );
});

test('i18n labels cover every persisted mirror kind', () => {
  for (const kind of ['rijing', 'yuejing', 'nianjing', 'mingjing', 'shijing']) {
    assert.ok(MIRROR_KIND_LABELS[kind], `missing label for ${kind}`);
  }
});

test('tab labels cover every primary tab including MingJing and HeJing', () => {
  for (const tab of SHIJING_PRIMARY_TAB_DESCRIPTORS) {
    assert.ok(TAB_LABELS[tab.id], `missing tab label for ${tab.id}`);
  }
  assert.ok(TAB_LABELS.mingjing);
  assert.ok(TAB_LABELS.hejing);
});

test('zh shijing tab and page title use 问镜 copy', () => {
  const copy = getProductCopy('zh');

  assert.equal(copy.tabLabels.shijing, '问镜');
  assert.equal(copy.mirrorKindLabels.shijing, '问镜');
  assert.equal(copy.shijing.title, '问镜');
});

test('cross-mirror ask entrypoints use 问镜 naming', () => {
  const yuejingCopySource = readFileSync(
    new URL('../src/product/tabs/yuejing/yuejing-copy.ts', import.meta.url),
    'utf8',
  );
  const nianjingRecorderSource = readFileSync(
    new URL('../src/product/tabs/nianjing/nianjing-event-recorder.tsx', import.meta.url),
    'utf8',
  );
  const readingFormatSource = readFileSync(
    new URL('../src/product/reading/reading-format.ts', import.meta.url),
    'utf8',
  );

  assert.match(yuejingCopySource, /askThisRecord:\s*'去问镜问这条'/u);
  assert.doesNotMatch(yuejingCopySource, /去时镜问这条/u);
  assert.match(nianjingRecorderSource, /Tooltip content="去问镜问这条"/u);
  assert.doesNotMatch(nianjingRecorderSource, /去时镜问这条/u);
  assert.match(readingFormatSource, /shijing:\s*'问镜'/u);
});

test('shell lazy-loads the independent HeJing tab', () => {
  const shellSource = readFileSync(
    new URL('../src/product/shell/shijing-shell.tsx', import.meta.url),
    'utf8',
  );

  assert.match(shellSource, /HeJingTab/);
  assert.match(shellSource, /tabs\/hejing-tab\.tsx/);
  assert.match(shellSource, /case ['"]hejing['"]/);
});

test('topbar does not render the compact UI language switch', () => {
  const shellSource = readFileSync(
    new URL('../src/product/shell/shijing-shell.tsx', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(shellSource, /<UiLanguageSwitch\s*\/>/);
});

test('topbar owns the global method profile selector', () => {
  const shellSource = readFileSync(
    new URL('../src/product/shell/shijing-shell.tsx', import.meta.url),
    'utf8',
  );
  const mingjingSource = readFileSync(
    new URL('../src/product/tabs/mingjing-tab.tsx', import.meta.url),
    'utf8',
  );

  assert.match(shellSource, /MethodProfileSelect/u);
  assert.match(shellSource, /commitMethodProfile/u);
  assert.match(shellSource, /shijing-topbar__method/u);
  assert.match(shellSource, /id="shijing-global-method-profile"/u);
  assert.doesNotMatch(mingjingSource, /MethodProfileSelect/u);
  assert.doesNotMatch(mingjingSource, /mingjing-method-profile/u);
});

test('startup onboarding is not mounted as a RiJing shell interstitial', () => {
  const shellSource = readFileSync(
    new URL('../src/product/shell/shijing-shell.tsx', import.meta.url),
    'utf8',
  );

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
