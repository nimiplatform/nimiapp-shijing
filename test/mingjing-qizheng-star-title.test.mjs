import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const starSource = readFileSync(
  new URL('../src/product/tabs/mingjing/qizheng-stars.tsx', import.meta.url),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '');

const qizhengStyles = readFileSync(
  new URL('../src/product/tabs/mingjing/mingjing-qizheng.css', import.meta.url),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '');

function cssBlockFrom(source, selector) {
  const blocks = [];
  for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/gu)) {
    const selectorList = match[1].split(',').map((item) => item.trim());
    if (selectorList.includes(selector)) blocks.push(match[2]);
  }
  return blocks.join('\n');
}

function cssBlock(selector) {
  const block = cssBlockFrom(qizhengStyles, selector);
  assert.notEqual(block, '', `Missing CSS selector: ${selector}`);
  return block;
}

test('QiZheng star cards render a vertical title left-aligned to the module edge', () => {
  assert.match(starSource, /const glyphChars = Array\.from\(star\.label\)/);
  assert.match(starSource, /const glyphHead = glyphChars\[0\]/);
  assert.match(starSource, /const glyphTail = glyphChars\.slice\(1\)\.join\(''\)/);
  assert.match(starSource, /className="shijing-qz-glyph__swatch"/);
  assert.match(starSource, /className="shijing-qz-glyph__tail"/);

  const glyph = cssBlock('.shijing-qz-glyph');
  const swatch = cssBlock('.shijing-qz-glyph__swatch');
  const tail = cssBlock('.shijing-qz-glyph__tail');

  assert.match(glyph, /width:\s*46px/);
  assert.match(glyph, /display:\s*flex/);
  assert.match(glyph, /flex-direction:\s*column/);
  assert.match(glyph, /align-items:\s*flex-start/);
  assert.match(glyph, /justify-content:\s*center/);

  assert.match(swatch, /width:\s*46px/);
  assert.match(swatch, /height:\s*46px/);
  assert.match(swatch, /display:\s*grid/);
  // head glyph hugs the left edge of its tile (vertically centred)
  assert.match(swatch, /place-items:\s*center start/);

  assert.match(tail, /writing-mode:\s*vertical-rl/);
  assert.match(tail, /text-orientation:\s*upright/);
  assert.match(tail, /display:\s*grid/);
  // tail shrink-wraps (no fixed width / centring) so its left edge matches the head's
  assert.doesNotMatch(tail, /width:\s*46px/);
  assert.doesNotMatch(tail, /text-align:\s*center/);
  assert.doesNotMatch(tail, /margin-left:\s*(?!0\b)[^;]+/);
});
