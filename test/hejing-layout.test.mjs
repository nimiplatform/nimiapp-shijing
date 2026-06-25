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

test('HeJing self and other profile card copy is centered as a left-aligned text group', () => {
  assert.match(hejingSource, /className="shijing-hejing__profile-content"/);

  const card = cssBlock('.shijing-hejing__profile-card');
  const content = cssBlock('.shijing-hejing__profile-content');

  assert.match(card, /align-items:\s*center/);
  assert.match(content, /width:\s*fit-content/);
  assert.match(content, /max-width:\s*100%/);
  assert.match(content, /text-align:\s*left/);
});
