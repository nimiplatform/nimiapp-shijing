// W-c04 — NianJing visualization constraints.
//
// SJG-REMOVED-04 forbids authoritative curves, K-line bars, luck-score
// curves, rankable numeric series, and aggregatable scores. Source-level
// test: the NianJing tab module text must not include those tokens as
// CSS classes, JSX elements, or rendered visual primitives.

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

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

test('NianJing tab executable source contains no forbidden authoritative visualization tokens', () => {
  const raw = readFileSync(new URL('../src/product/tabs/nianjing-tab.tsx', import.meta.url), 'utf8');
  const src = stripJsComments(raw);
  for (const pattern of FORBIDDEN_PATTERNS) {
    assert.equal(
      pattern.test(src),
      false,
      `nianjing-tab.tsx executable code must not contain ${pattern}; found a match`,
    );
  }
});

test('NianJing CSS lane classes are present', () => {
  const css = readFileSync(new URL('../src/styles-mirror-v1.css', import.meta.url), 'utf8');
  assert.ok(css.includes('.shijing-nianjing__timeline'));
  assert.ok(css.includes('.shijing-nianjing__lane'));
  assert.ok(css.includes('.shijing-nianjing__band'));
  assert.ok(css.includes('.shijing-nianjing__marker'));
});

test('NianJing CSS contains no curve / k-line / luck-score / trend-chart selectors', () => {
  const css = readFileSync(new URL('../src/styles-mirror-v1.css', import.meta.url), 'utf8');
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
