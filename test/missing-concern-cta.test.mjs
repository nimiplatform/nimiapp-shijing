import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { readI18nSource } from './i18n-source.mjs';

function stripJsComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '');
}

const rijingTabSource = stripJsComments(
  readFileSync(new URL('../src/product/tabs/rijing-tab.tsx', import.meta.url), 'utf8'),
);
const yuejingTabSource = stripJsComments(
  readFileSync(new URL('../src/product/tabs/yuejing-tab.tsx', import.meta.url), 'utf8'),
);
const nianjingTabSource = stripJsComments(
  readFileSync(new URL('../src/product/tabs/nianjing-tab.tsx', import.meta.url), 'utf8'),
);
const shellSource = stripJsComments(
  readFileSync(new URL('../src/product/shell/shijing-shell.tsx', import.meta.url), 'utf8'),
);
const copySource = stripJsComments(readI18nSource());

test('RiJing missing-concern status exposes a direct Settings concerns CTA', () => {
  assert.match(rijingTabSource, /className="shijing-rijing__empty-tags"/);
  assert.match(rijingTabSource, /className="shijing-rijing__empty-tags-title"/);
  assert.match(rijingTabSource, /className="shijing-rijing__empty-tags-action"/);
  assert.match(rijingTabSource, /onClick=\{\(\) => props\.onRequestOpenSettings\?\.\('concerns'\)\}/);
  assert.doesNotMatch(rijingTabSource, /<p className="shijing-rijing__empty-tags"/);
  assert.doesNotMatch(copySource, /设置\s*→\s*关注标签/);
  assert.doesNotMatch(copySource, /Settings\s*->\s*Concern tags/);
});

test('YueJing missing-concern status routes directly to Settings concerns', () => {
  assert.match(yuejingTabSource, /export interface YueJingTabProps/);
  assert.match(yuejingTabSource, /className="shijing-yuejing__notice shijing-yuejing__notice--action"/);
  assert.match(yuejingTabSource, /className="shijing-yuejing__notice-action"/);
  assert.match(yuejingTabSource, /onClick=\{\(\) => props\.onRequestOpenSettings\?\.\('concerns'\)\}/);
  assert.match(shellSource, /<YueJingTab onRequestOpenSettings=\{onRequestOpenSettings\} \/>/);
});

test('NianJing missing-concern status routes directly to Settings concerns', () => {
  assert.match(nianjingTabSource, /className="shijing-nianjing__notice shijing-nianjing__notice--action"/);
  assert.match(nianjingTabSource, /className="shijing-nianjing__notice-action"/);
  assert.match(nianjingTabSource, /onClick=\{\(\) => props\.onRequestOpenSettings\?\.\('concerns'\)\}/);
});

test('NianJing missing natal inputs use the same readable notice pattern as YueJing', () => {
  assert.match(nianjingTabSource, /subjectMirrorReadiness\(\{/);
  assert.match(nianjingTabSource, /mirror_kind: 'nianjing'/);
  assert.match(
    nianjingTabSource,
    /请先在「设置 → 本人」中填写出生信息,年镜会据此自动推算。/,
  );
  assert.match(
    nianjingTabSource,
    /selfNatalReady && activeTags\.length > 0\s*\? buildNianJingDirectDisplayOutput/,
  );
  // Generation failures surface unconditionally — the old `selfNatalReady ?`
  // gate swallowed the banner, leaving manual-generate clicks feedback-free.
  assert.match(nianjingTabSource, /const displayFailure =\s*failure \?\?/);
  assert.doesNotMatch(nianjingTabSource, /selfNatalReady\s*\?\s*failure/);
  assert.match(
    nianjingTabSource,
    /disabled=\{loading \|\| !selfNatalReady \|\| activeTagIds\.length === 0\}/,
  );
});
