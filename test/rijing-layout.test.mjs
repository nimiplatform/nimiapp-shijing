import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { readCssBundle, rijingCssFiles, sharedPrimitiveCssFiles } from './css-bundles.mjs';

const rijingStyles = stripCssComments(
  readCssBundle(rijingCssFiles),
);
const sharedSurfaceStyles = stripCssComments(
  readCssBundle(sharedPrimitiveCssFiles),
);

function stripJsComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '');
}

function stripCssComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

function cssBlockFromSource(source, selector) {
  const blocks = [];
  for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/gu)) {
    const selectorList = match[1].split(',').map((item) => item.trim());
    if (selectorList.includes(selector)) {
      blocks.push(match[2]);
    }
  }
  return blocks.join('\n');
}

function cssBlock(source, selector) {
  const block = cssBlockFromSource(source, selector);
  assert.notEqual(block, '', `Missing CSS selector: ${selector}`);
  return block;
}

test('RiJing tab orders the progressive-disclosure modules top to bottom', () => {
  const src = stripJsComments(
    readFileSync(new URL('../src/product/tabs/rijing-tab.tsx', import.meta.url), 'utf8'),
  );

  const heroIndex = src.indexOf('<RiJingHero');
  const projectionsIndex = src.indexOf('<RiJingProjections');
  const eventInputIndex = src.indexOf('<RiJingEventInput');
  const actionsIndex = src.indexOf('<RiJingActions');
  const dataIndex = src.indexOf('<RiJingDataSection');

  assert.ok(heroIndex >= 0, 'RiJingHero is mounted');
  assert.ok(projectionsIndex >= 0, 'RiJingProjections is mounted');
  assert.ok(eventInputIndex >= 0, 'RiJingEventInput is mounted');
  assert.ok(actionsIndex >= 0, 'RiJingActions is mounted');
  assert.ok(dataIndex >= 0, 'RiJingDataSection is mounted');

  assert.ok(heroIndex < projectionsIndex, '今日总览 banner precedes the concern frames');
  assert.ok(projectionsIndex < eventInputIndex, '今日关注分镜 precedes 今日参照');
  assert.ok(eventInputIndex < actionsIndex, '今日参照 precedes 今日行动');
  assert.ok(actionsIndex < dataIndex, '今日行动 precedes 推演依据与数据说明');
});

test('RiJing hero does not render duplicate 专属视角解读 details', () => {
  const src = stripJsComments(
    readFileSync(new URL('../src/product/tabs/rijing/rijing-hero.tsx', import.meta.url), 'utf8'),
  );

  assert.doesNotMatch(src, /shijing-rijing__hero-perspectives/);
  assert.doesNotMatch(src, /content\.perspectives\.map/);
  assert.doesNotMatch(src, /rijing\.hero\.perspectivesLabel/);
});

test('RiJing hero shows full interpretation directly and places tendency pills beside the subtitle', () => {
  const src = stripJsComments(
    readFileSync(new URL('../src/product/tabs/rijing/rijing-hero.tsx', import.meta.url), 'utf8'),
  );
  const copyContract = [
    readFileSync(new URL('../src/product/i18n/schema/rijing.ts', import.meta.url), 'utf8'),
    readFileSync(new URL('../src/product/i18n/zh/rijing.ts', import.meta.url), 'utf8'),
    readFileSync(new URL('../src/product/i18n/en/rijing.ts', import.meta.url), 'utf8'),
  ].join('\n');

  assert.doesNotMatch(src, /ChevronDownIcon/);
  assert.doesNotMatch(src, /const \[expanded, setExpanded\]/);
  assert.doesNotMatch(src, /overview\.expandLabel|overview\.collapseLabel/);
  assert.doesNotMatch(copyContract, /expandLabel|collapseLabel/);
  assert.doesNotMatch(src, /content\.theme/);
  assert.doesNotMatch(copyContract, /themeLabel/);
  assert.doesNotMatch(src, /aria-expanded=\{expanded\}/);
  assert.doesNotMatch(src, /shijing-rijing__hero-toggle/);
  assert.doesNotMatch(src, /expanded\s*\?\s*\(/);

  const subtitleIndex = src.indexOf('className="shijing-rijing__hero-subtitle"');
  const leaningsIndex = src.indexOf('content.leanings.map');
  const meterIndex = src.indexOf('{meter ?');

  assert.ok(subtitleIndex >= 0, 'subtitle is rendered');
  assert.ok(leaningsIndex >= 0, 'tendency pills are rendered');
  assert.ok(meterIndex >= 0, 'energy meter is rendered');
  assert.ok(subtitleIndex < leaningsIndex, 'tendency pills follow the subtitle inline');
  assert.ok(leaningsIndex < meterIndex, 'tendency pills sit above the meter');
  assert.match(src, /className="shijing-rijing__hero-subtitle-row"/);
  assert.match(src, /className="shijing-rijing__hero-leanings"/);
  assert.match(src, /className="shijing-rijing__hero-full"/);

  const subtitleRow = cssBlock(rijingStyles, '.shijing-rijing__hero-subtitle-row');
  const leanings = cssBlock(rijingStyles, '.shijing-rijing__hero-leanings');

  assert.match(subtitleRow, /display:\s*flex/);
  assert.match(subtitleRow, /align-items:\s*center/);
  assert.match(subtitleRow, /justify-content:\s*center/);
  assert.match(leanings, /display:\s*inline-flex/);
  assert.equal(cssBlockFromSource(rijingStyles, '.shijing-tab .shijing-rijing__hero-toggle'), '');
  assert.equal(cssBlockFromSource(rijingStyles, '.shijing-rijing__hero-toggle-chevron'), '');
});

test('RiJing hero owns a reversible generic almanac back face without reintroducing removed symbols', () => {
  const src = stripJsComments(
    readFileSync(new URL('../src/product/tabs/rijing/rijing-hero.tsx', import.meta.url), 'utf8'),
  );
  const tabSrc = stripJsComments(
    readFileSync(new URL('../src/product/tabs/rijing-tab.tsx', import.meta.url), 'utf8'),
  );
  const almanacSrc = stripJsComments(
    readFileSync(new URL('../src/product/tabs/rijing/rijing-daily-almanac.ts', import.meta.url), 'utf8'),
  );

  assert.match(src, /const \[riteOpen, setRiteOpen\] = useState\(false\)/);
  assert.match(src, /const riteFlipText = riteOpen/);
  assert.match(src, /import \{ AlmanacIcon, HeartIcon \}/);
  assert.match(src, /<AlmanacIcon \/>/);
  assert.doesNotMatch(src, /FlipIcon/);
  assert.match(src, /className="shijing-rijing__hero-flip"/);
  assert.match(src, /className="shijing-rijing__hero-flip-text"/);
  assert.match(src, /className="shijing-rijing__hero-flip-icon"/);
  assert.match(src, /aria-pressed=\{riteOpen\}/);
  assert.match(src, /data-rite-open=\{riteOpen\}/);
  assert.match(src, /className="shijing-rijing__hero-face shijing-rijing__hero-face--front"/);
  assert.match(src, /className="shijing-rijing__hero-face shijing-rijing__hero-face--back"/);
  assert.match(tabSrc, /const dailyAlmanac = deriveRiJingDailyAlmanac/);
  assert.match(tabSrc, /dailyAlmanac=\{dailyAlmanac\}/);
  assert.match(src, /shijing-rijing__almanac-recommends/);
  assert.match(src, /shijing-rijing__almanac-grid/);
  assert.match(src, /shijing-rijing__almanac-hours-heading/);
  assert.match(src, /copy\.rijing\.dayRite\.hoursTitle/);
  assert.match(src, /shijing-rijing__almanac-hours/);
  assert.doesNotMatch(`${src}\n${tabSrc}\n${almanacSrc}`, /huangli|Huangli|HuangliDaily|huangli_daily/u);

  const hero = cssBlock(rijingStyles, '.shijing-rijing .shijing-rijing__hero');
  const button = cssBlock(rijingStyles, '.shijing-tab .shijing-rijing__hero-flip');
  const stage = cssBlock(rijingStyles, '.shijing-rijing__hero-stage');
  const face = cssBlock(rijingStyles, '.shijing-rijing__hero-face');
  const front = cssBlock(rijingStyles, '.shijing-rijing__hero-face--front');
  const back = cssBlock(rijingStyles, '.shijing-rijing__hero-face--back');
  const openBack = cssBlock(rijingStyles, '.shijing-rijing__hero[data-rite-open="true"] .shijing-rijing__hero-face--back');
  const almanacGrid = cssBlock(rijingStyles, '.shijing-rijing__almanac-grid');
  const hourGrid = cssBlock(rijingStyles, '.shijing-rijing__almanac-hours');

  assert.match(hero, /perspective:\s*1200px/);
  assert.match(button, /position:\s*absolute/);
  assert.match(button, /right:\s*clamp\(14px,\s*2vw,\s*22px\)/);
  assert.match(button, /gap:\s*8px/);
  assert.match(button, /padding:\s*0 12px 0 16px/);
  assert.match(button, /font-weight:\s*700/);
  assert.doesNotMatch(button, /(?:^|\n)\s*width:\s*40px/);
  assert.doesNotMatch(button, /(?:^|\n)\s*height:\s*40px/);
  assert.match(stage, /display:\s*grid/);
  assert.match(face, /backface-visibility:\s*hidden/);
  assert.match(front, /rotateY\(0deg\)/);
  assert.match(back, /rotateY\(180deg\)/);
  assert.match(openBack, /rotateY\(0deg\)/);
  assert.match(almanacGrid, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(hourGrid, /grid-template-columns:\s*repeat\(12,\s*minmax\(34px,\s*1fr\)\)/);
});

test('RiJing concern frames expose the inline concern editor beside lens pills', () => {
  const src = stripJsComments(
    readFileSync(new URL('../src/product/tabs/rijing/rijing-projections.tsx', import.meta.url), 'utf8'),
  );

  assert.match(src, /import \{ InlineConcernEditorPopover \}/);
  assert.match(src, /const \[editorOpen, setEditorOpen\] = useState\(false\)/);
  assert.match(src, /aria-haspopup="dialog"/);
  assert.match(src, /className="shijing-rijing__lens-manage"/);
  assert.match(src, /copy\.rijing\.projections\.manage/);
  assert.match(src, /<InlineConcernEditorPopover\b/);
  assert.match(src, /classNamePrefix="shijing-rijing-concern-editor"/);
  assert.match(src, /subtitle=\{copy\.rijing\.projections\.editorSubtitle\}/);

  const lens = cssBlock(rijingStyles, '.shijing-rijing__lens');
  const manage = cssBlock(rijingStyles, '.shijing-tab .shijing-rijing__lens-manage');
  const anchor = cssBlock(rijingStyles, '.shijing-rijing__editor-anchor');
  const editor = cssBlock(rijingStyles, '.shijing-rijing-concern-editor');
  const editorList = cssBlock(sharedSurfaceStyles, '.shijing-rijing .shijing-rijing-concern-editor__section ul');
  const custom = cssBlock(rijingStyles, '.shijing-rijing-concern-editor__custom');

  assert.match(lens, /align-items:\s*center/);
  assert.match(lens, /position:\s*relative/);
  assert.match(manage, /display:\s*inline-flex/);
  assert.match(manage, /border:\s*1px dashed var\(--shijing-border-default\)/);
  assert.match(anchor, /position:\s*relative/);
  assert.match(anchor, /display:\s*inline-block/);
  assert.match(editor, /position:\s*absolute/);
  assert.match(editor, /z-index:\s*70/);
  assert.match(editorList, /flex-direction:\s*column/);
  assert.match(custom, /display:\s*flex/);
});

test('RiJing data section folds in the 资料完整度 readiness signal', () => {
  const src = stripJsComments(
    readFileSync(new URL('../src/product/tabs/rijing/rijing-evidence.tsx', import.meta.url), 'utf8'),
  );

  assert.match(src, /readiness/, 'data section consumes readiness');
  assert.match(src, /onCompleteProfile/, 'data section exposes a 完善资料 affordance');
});
