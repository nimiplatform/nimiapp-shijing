import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const rijingStyles = stripCssComments(
  readFileSync(new URL('../src/styles-rijing-rich.css', import.meta.url), 'utf8'),
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
  const editorList = cssBlock(rijingStyles, '.shijing-rijing .shijing-rijing-concern-editor__section ul');
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
