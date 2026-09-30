import assert from 'node:assert/strict';
import test from 'node:test';
import { extractI18nLiterals } from '../scripts/i18n-literals.mjs';

test('i18n extraction includes nested copy objects, functions and template text', () => {
  const source = "const PAGE_COPY = { nested: { close: '关闭' }, count: (n) => `已保存 ${n} 条` }; const actionLabel = ready ? '生成' : '等待'; const view = <button aria-label=\"关闭面板\">打开</button>;";
  const text = extractI18nLiterals(source).map((item) => item.text);
  for (const expected of ['关闭', '已保存 条', '生成', '等待', '关闭面板', '打开']) assert.ok(text.includes(expected), expected);
});

test('i18n extraction ignores calculation identifiers, property names and comments', () => {
  const source = "// 显示说明\nconst METHOD = 'bazi_ziping_v1'; const COPY = { id: 'daily', icon: 'overview', title: 'Daily view' }; const shape = { '夫妻': 1 };";
  assert.deepEqual(extractI18nLiterals(source, 'surface.ts').map((item) => item.text), ['Daily view']);
});

test('typed paired locale tables are allowed while a zh-only table remains visible', () => {
  const paired = "const ZH: Copy = { title: '中文标题' }; const EN: Copy = { title: 'English title' }; const OTHER_COPY = { title: '尚未翻译' };";
  assert.deepEqual(extractI18nLiterals(paired, 'surface.ts').map((item) => item.text), ['尚未翻译']);
  assert.deepEqual(extractI18nLiterals("const ZH: Copy = { title: '中文标题' };", 'surface.ts').map((item) => item.text), ['中文标题']);
});
