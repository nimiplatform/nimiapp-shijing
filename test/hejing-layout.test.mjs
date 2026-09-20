import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { hejingCssFiles, readCssBundle } from './css-bundles.mjs';

const hejingSource = readFileSync(
  new URL('../src/product/tabs/hejing-tab.tsx', import.meta.url),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '');

const hejingStyles = readCssBundle(hejingCssFiles).replace(/\/\*[\s\S]*?\*\//g, '');

function cssBlockFrom(source, selector) {
  const blocks = [];
  for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/gu)) {
    const selectorList = match[1].split(',').map((item) => item.trim());
    if (selectorList.includes(selector)) {
      blocks.push(match[2]);
    }
  }
  return blocks.join('\n');
}

function cssBlock(selector) {
  const block = cssBlockFrom(hejingStyles, selector);
  assert.notEqual(block, '', `Missing CSS selector: ${selector}`);
  return block;
}

test('HeJing toolbar pairs person context with one subtle action group', () => {
  assert.match(hejingSource, /shijing-hejing__toolbar-meta/u);
  assert.match(hejingSource, /shijing-hejing__toolbar-actions/u);
  assert.match(hejingSource, /shijing-hejing__view-switch/u);

  const toolbar = cssBlock('.shijing-hejing__toolbar');
  assert.match(toolbar, /display:\s*flex/);
  assert.match(toolbar, /justify-content:\s*space-between/);

  const statusGenerated = cssBlock(".shijing-hejing__toolbar-status[data-state='generated']");
  assert.match(statusGenerated, /var\(--hejing-green-soft\)/);
  const statusStale = cssBlock(".shijing-hejing__toolbar-status[data-state='stale']");
  assert.match(statusStale, /var\(--hejing-red-soft\)/);
});

test('HeJing reading sections keep a comfortable measure and clear structure', () => {
  const overviewSummary = cssBlock('.shijing-hejing .shijing-hejing__overview-summary');
  assert.match(overviewSummary, /max-width:\s*68ch/);
  assert.match(overviewSummary, /line-height:\s*1\.8/);

  const tendencies = cssBlock('.shijing-hejing__tendencies');
  assert.match(tendencies, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);

  const expressionGrid = cssBlock('.shijing-hejing__expression-grid');
  assert.match(expressionGrid, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);

  const basisBody = cssBlock('.shijing-hejing__basis-body');
  assert.notEqual(basisBody, '');

  const phrase = cssBlock('.shijing-hejing .shijing-hejing__action-phrase');
  assert.match(phrase, /border-left:\s*3px solid var\(--hejing-acc-mid\)/);
});

test('HeJing track view uses a bounded grid with type badges', () => {
  const item = cssBlock('.shijing-hejing__track-item');
  assert.match(item, /display:\s*grid/);
  assert.match(item, /grid-template-columns:\s*auto auto minmax\(0,\s*1fr\) auto/);

  const eventBadge = cssBlock(".shijing-hejing__track-badge[data-kind='event']");
  assert.match(eventBadge, /var\(--hejing-green-soft\)/);
  const planBadge = cssBlock(".shijing-hejing__track-badge[data-kind='plan']");
  assert.match(planBadge, /var\(--hejing-blue-soft\)/);
});

test('HeJing responsive rules collapse the multi-column structures on small screens', () => {
  assert.match(hejingStyles, /@media\s*\(max-width:\s*960px\)/);
  assert.match(hejingStyles, /@media\s*\(max-width:\s*760px\)/);
  assert.match(hejingStyles, /@media\s*\(max-width:\s*460px\)/);

  const at960 = hejingStyles.slice(hejingStyles.indexOf('@media (max-width: 960px)'));
  assert.match(at960, /\.shijing-hejing__expression-grid,\s*\n\s*\.shijing-hejing__tendencies\s*\{\s*grid-template-columns:\s*1fr/);

  const at760 = hejingStyles.slice(hejingStyles.indexOf('@media (max-width: 760px)'));
  assert.match(at760, /\.shijing-hejing__track-item\s*\{\s*grid-template-columns:\s*auto minmax\(0,\s*1fr\)/);
});

test('HeJing keyboard focus is visible on interactive controls', () => {
  assert.match(hejingStyles, /\.shijing-hejing__view-switch button:focus-visible/u);
  assert.match(hejingStyles, /\.shijing-hejing__basis summary:focus-visible/u);
  assert.match(hejingStyles, /\.shijing-hejing__track-actions button:focus-visible/u);
  assert.match(hejingStyles, /outline:\s*2px solid var\(--hejing-acc\)/u);
});

test('HeJing bundle carries no radar, metric or quarter selectors', () => {
  assert.doesNotMatch(hejingStyles, /radar/u);
  assert.doesNotMatch(hejingStyles, /metric/u);
  assert.doesNotMatch(hejingStyles, /quarter/u);
  assert.doesNotMatch(hejingStyles, /__timeline/u);
  assert.doesNotMatch(hejingStyles, /__focus/u);
  assert.doesNotMatch(hejingStyles, /__ways/u);
  assert.doesNotMatch(hejingStyles, /__index/u);
});
