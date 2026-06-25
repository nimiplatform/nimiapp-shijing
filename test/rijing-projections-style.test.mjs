import assert from 'node:assert/strict';
import test from 'node:test';

import { readCssBundle, rijingCssFiles } from './css-bundles.mjs';

const rijingStyles = stripCssComments(readCssBundle(rijingCssFiles));

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

function cssBlock(selector) {
  const block = cssBlockFromSource(rijingStyles, selector);
  assert.notEqual(block, '', `Missing CSS selector: ${selector}`);
  return block;
}

test('RiJing concern frame hover stays light instead of inheriting the global green button hover', () => {
  const row = cssBlock('.shijing-tab .shijing-rijing__frame-row');
  const hover = cssBlock('.shijing-tab .shijing-rijing__frame-row:hover');

  assert.match(row, /transition:[^;]*background/);
  assert.match(hover, /color-mix\(in srgb,\s*var\(--rijing-accent\)\s+10%,\s*rgba\(255,\s*255,\s*255,\s*0\.72\)\)/);
  assert.doesNotMatch(hover, /var\(--shijing-brand-primary\)/);
});
