// W-c04 — NianJing visualization constraints.
//
// SJG-REMOVED-04 forbids authoritative curves, K-line bars, luck-score
// curves, rankable numeric series, and aggregatable scores. Source-level
// test: the NianJing tab module text must not include those tokens as
// CSS classes, JSX elements, or rendered visual primitives.

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { nianjingCssFiles, readCssBundle } from './css-bundles.mjs';

const FORBIDDEN_PATTERNS = [
  /\bcurve\b/i,
  /\bk[-_]?line\b/i,
  /luck[-_]?score/i,
  /luck[-_]?rank/i,
  /trend[-_]?chart/i,
];

const ALLOWED_NEIGHBORS = [
  // The forbidden-tokens guard string in `removed-surfaces.ts` itself
  // legitimately enumerates these strings; this test reads
  // `nianjing-tab.tsx` only.
];

void ALLOWED_NEIGHBORS;

function stripJsComments(src) {
  // Remove block comments (/* … */) then single-line // comments. This
  // lets the SJG-REMOVED-04 guard wording live in a comment block
  // without tripping the executable-code constraint.
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

test('NianJing tab executable source contains no forbidden authoritative visualization tokens', () => {
  const raw = [
    '../src/product/tabs/nianjing-tab.tsx',
    '../src/product/tabs/nianjing/nianjing-ready-view.tsx',
    '../src/product/tabs/nianjing/nianjing-filter-row.tsx',
    '../src/product/tabs/nianjing/nianjing-year-overview.tsx',
    '../src/product/tabs/nianjing/nianjing-timeline.tsx',
    '../src/product/tabs/nianjing/nianjing-detail-drawer.tsx',
    '../src/product/tabs/nianjing/nianjing-view-model.ts',
  ]
    .map((file) => readFileSync(new URL(file, import.meta.url), 'utf8'))
    .join('\n');
  const src = stripJsComments(raw);
  for (const pattern of FORBIDDEN_PATTERNS) {
    assert.equal(
      pattern.test(src),
      false,
      `nianjing-tab.tsx executable code must not contain ${pattern}; found a match`,
    );
  }
});

test('NianJing phase drawer reads as a narrative guidance flow instead of modular template cards', () => {
  const source = readFileSync(new URL('../src/product/tabs/nianjing/nianjing-detail-drawer.tsx', import.meta.url), 'utf8');

  assert.match(source, /className="shijing-nianjing__band-detail-story"/);
  assert.match(source, /className="shijing-nianjing__band-detail-signals"/);
  assert.match(source, /className="shijing-nianjing__band-detail-guidance"/);
  assert.match(source, /className="shijing-nianjing__band-detail-footnotes"/);
  assert.doesNotMatch(
    source,
    /shijing-nianjing__band-detail-card shijing-nianjing__band-detail-(meaning|suggestions|cautions)/,
  );
  assert.doesNotMatch(source, />这一阶段代表什么\?</);
  assert.doesNotMatch(source, />适合做</);
});

test('NianJing phase drawer styles use a continuous reading surface', () => {
  const css = stripCssComments(readCssBundle(nianjingCssFiles));
  const drawer = cssBlock(css, '.shijing-nianjing__inflection-drawer[data-kind="band"]');
  const story = cssBlock(css, '.shijing-nianjing__band-detail-story');
  const guidance = cssBlock(css, '.shijing-nianjing__band-detail-guidance');

  assert.match(drawer, /gap:\s*18px/);
  assert.match(story, /padding:\s*2px 4px 0/);
  assert.match(story, /border-left:\s*2px solid/);
  assert.match(guidance, /grid-template-columns:\s*1fr/);
  assert.doesNotMatch(guidance, /border-radius:\s*18px/);
});

test('NianJing tab renders annual modules as a derived overview before the detailed timeline', () => {
  const source = [
    '../src/product/tabs/nianjing/nianjing-ready-view.tsx',
    '../src/product/tabs/nianjing/nianjing-year-overview.tsx',
    '../src/product/tabs/nianjing/nianjing-year-modules.ts',
  ]
    .map((file) => readFileSync(new URL(file, import.meta.url), 'utf8'))
    .join('\n');

  assert.match(source, /buildNianJingYearModules/);
  assert.match(source, /buildNianJingSelectedYearDetail/);
  assert.match(source, /<NianJingYearOverview/);
  assert.match(source, /className="shijing-nianjing__year-overview"/);
  assert.match(source, /className="shijing-nianjing__path-card"/);
  assert.match(source, /className="shijing-nianjing__path-line"/);
  assert.match(source, /className="shijing-nianjing__year-selector"/);
  assert.match(source, /className="shijing-nianjing__year-selected"/);
  assert.match(source, /className="shijing-nianjing__year-concern-card"/);
  assert.match(source, /className="shijing-nianjing__year-months"/);
  assert.match(source, /className="shijing-nianjing__year-basis"/);
  assert.doesNotMatch(
    source,
    /className="shijing-nianjing__year-grid"/,
    'redesigned annual overview should not render the old matrix grid',
  );
});

test('NianJing year overview separates overall annual summary from focus detail', () => {
  const source = [
    '../src/product/tabs/nianjing/nianjing-ready-view.tsx',
    '../src/product/tabs/nianjing/nianjing-year-overview.tsx',
    '../src/product/tabs/nianjing/nianjing-year-modules.ts',
  ]
    .map((file) => readFileSync(new URL(file, import.meta.url), 'utf8'))
    .join('\n');

  assert.match(source, /buildNianJingAnnualOverview/);
  assert.match(source, /className="shijing-nianjing__path-plot"/);
  assert.match(source, /className="shijing-nianjing__year-selector"/);
  assert.match(source, /className="shijing-nianjing__year-summary-card"/);
  assert.match(source, /className="shijing-nianjing__year-selected-head"/);
});

test('NianJing annual module CSS is a selected-year workbench, not a score chart', () => {
  const css = stripCssComments(readCssBundle(nianjingCssFiles));
  const overview = cssBlock(css, '.shijing-nianjing__year-overview');
  const pathCard = cssBlock(css, '.shijing-nianjing__path-card');
  const pathLine = cssBlock(css, '.shijing-nianjing__path-line');
  const selector = cssBlock(css, '.shijing-nianjing__year-selector');
  const summaryCard = cssBlock(css, '.shijing-nianjing__year-summary-card');
  const selected = cssBlock(css, '.shijing-nianjing__year-selected');
  const concernGrid = cssBlock(css, '.shijing-nianjing__year-concerns');
  const monthButton = cssBlock(css, '.shijing-nianjing__year-months button');
  const basisGrid = cssBlock(css, '.shijing-nianjing__year-basis-grid');

  assert.match(overview, /flex-direction:\s*column/);
  assert.match(pathCard, /padding:\s*26px 28px 20px/);
  assert.match(pathLine, /stroke-linecap:\s*round/);
  assert.match(selector, /display:\s*flex/);
  assert.match(summaryCard, /flex-direction:\s*column/);
  assert.match(selected, /padding:\s*30px 30px 28px/);
  assert.match(concernGrid, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(monthButton, /min-height:\s*32px/);
  assert.match(basisGrid, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
});

test('NianJing CSS lane classes are present', () => {
  const css = readCssBundle(nianjingCssFiles);
  assert.ok(css.includes('.shijing-nianjing__timeline'));
  assert.ok(css.includes('.shijing-nianjing__lane'));
  assert.ok(css.includes('.shijing-nianjing__band'));
  assert.ok(css.includes('.shijing-nianjing__marker'));
});

test('NianJing CSS contains no curve / k-line / luck-score / trend-chart selectors', () => {
  const css = stripCssComments(readCssBundle(nianjingCssFiles));
  // Only consult the NianJing-prefixed CSS block; other blocks may
  // include forbidden tokens as guard strings.
  const nianjingBlocks = css
    .split('\n\n')
    .filter((block) => block.includes('shijing-nianjing'));
  const joined = nianjingBlocks.join('\n\n');
  for (const pattern of [/curve/i, /k-?line/i, /luck-?score/i, /trend-?chart/i]) {
    assert.equal(
      pattern.test(joined),
      false,
      `NianJing CSS block contains forbidden ${pattern}`,
    );
  }
});

test('styles-mirror-v1 no longer owns NianJing timeline selectors', () => {
  const css = readFileSync(new URL('../src/styles-mirror-v1.css', import.meta.url), 'utf8');

  assert.equal(css.includes('.shijing-nianjing__timeline'), false);
  assert.equal(css.includes('.shijing-nianjing__lane'), false);
  assert.equal(css.includes('.shijing-nianjing__band'), false);
  assert.equal(css.includes('.shijing-nianjing__marker'), false);
});
