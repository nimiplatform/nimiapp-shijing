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

test('HeJing first screen pairs the two charts above status and reminder', () => {
  assert.match(hejingSource, /<HeJingOverview/);

  const overviewCard = cssBlock('.shijing-hejing__overview-card');
  const pair = cssBlock('.shijing-hejing__pair');
  const statusRow = cssBlock('.shijing-hejing__status-row');

  assert.match(overviewCard, /display:\s*grid/);
  assert.match(pair, /grid-template-columns:\s*1fr auto 1fr/);
  assert.match(statusRow, /border-bottom:\s*1px solid/);
});

test('HeJing focus cards and metric readouts use multi-column, bounded layouts', () => {
  const focusGrid = cssBlock('.shijing-hejing__focus-grid');
  const metricReadouts = cssBlock('.shijing-hejing__metric-readouts');
  const metricBody = cssBlock('.shijing-hejing__metric-body p');

  assert.match(focusGrid, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(metricReadouts, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  // The metric explanation line is present and styled.
  assert.notEqual(metricBody, '');
});
