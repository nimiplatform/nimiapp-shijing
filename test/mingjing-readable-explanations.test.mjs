import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { mingjingCssFiles, readCssBundle } from './css-bundles.mjs';
import { readI18nSource } from './i18n-source.mjs';

const componentFiles = [
  '../src/product/tabs/mingjing/mingjing-paipan.tsx',
  '../src/product/tabs/mingjing/mingjing-dayun.tsx',
  '../src/product/tabs/mingjing/mingjing-liunian.tsx',
  '../src/product/tabs/mingjing/mingjing-events.tsx',
  '../src/product/tabs/mingjing/mingjing-reading-view.tsx',
  '../src/product/tabs/mingjing/mingjing-relationship-reading-view.tsx',
  '../src/product/tabs/mingjing/mingjing-rectify.tsx',
];

const i18nCopySource = readI18nSource();

test('MingJing technical modules keep explanations behind title info controls', () => {
  for (const file of componentFiles) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.match(source, /MingJingInfo/, `${file} should use the shared info explanation control`);
    assert.match(source, /shijing-mingjing-panel__title-row/, `${file} should place info beside the module title`);
    assert.doesNotMatch(
      source,
      /shijing-mingjing-panel__explain/,
      `${file} should not render explanations as persistent text below the title`,
    );
  }
});

test('MingJing five-element submodule keeps its explanation behind an info control', () => {
  const source = readFileSync(
    new URL('../src/product/tabs/mingjing/mingjing-paipan.tsx', import.meta.url),
    'utf8',
  );

  assert.match(source, /shijing-mingjing-five__head/);
  assert.match(source, /MingJingInfo/);
  assert.doesNotMatch(source, /shijing-mingjing-five__explain/);
});

test('MingJing full-paipan detail uses the compact technical title', () => {
  const source = readFileSync(
    new URL('../src/product/tabs/mingjing/mingjing-paipan.tsx', import.meta.url),
    'utf8',
  );
  assert.match(source, /shijing-paipan__detail-title">\{m\.detailTitle\}/);
  assert.doesNotMatch(source, /MingJingInfo label=\{`\$\{m\.detailTitle\}说明`\}/);
  assert.doesNotMatch(source, /shijing-paipan__detail-head/);
  assert.doesNotMatch(i18nCopySource, /供懂行的人核对|for expert review/u);
});

test('MingJing info controls have dedicated visual styling', () => {
  const source = readCssBundle(mingjingCssFiles);

  assert.match(source, /\.shijing-mingjing-info__button/);
  assert.match(source, /\.shijing-mingjing-info__bubble/);
});

test('MingJing explanations avoid instructional or score-like phrasing', () => {
  assert.doesNotMatch(i18nCopySource, /先不用|逐字查术语|对得越准|当作每年的分数|你现在所在|你自己/u);
});

test('MingJing liunian cards lead with plain-language guidance and collapse evidence', () => {
  const source = readFileSync(
    new URL('../src/product/tabs/mingjing/mingjing-liunian.tsx', import.meta.url),
    'utf8',
  );
  assert.match(source, /useMingJingNarrative/u);
  assert.match(source, /windowBadge\(window\)/u);
  assert.match(source, /windowNarrative\(window\)/u);
  assert.match(source, /shijing-liunian__badge/u);
  assert.match(source, /shijing-liunian__plain/u);
  assert.match(source, /<details className="shijing-liunian__details">/u);
  assert.match(source, /\{l\.detailToggle\}/u);
  assert.doesNotMatch(source, /shijing-liunian__nature/u);

  assert.match(i18nCopySource, /这里不是给每一年打分/u);
  assert.match(i18nCopySource, /适合主动推进、稳步积累、放缓观察、守住边界或处理转折/u);
  assert.match(i18nCopySource, /查看算法依据/u);
  assert.match(i18nCopySource, /为什么被标出来/u);
});

test('MingJing dayun explains twelve-stage terms that users may misread', () => {
  const source = readFileSync(
    new URL('../src/product/tabs/mingjing/mingjing-dayun.tsx', import.meta.url),
    'utf8',
  );
  assert.match(source, /d\.terrainLabel\(period\.terrain\)/u);
  assert.match(i18nCopySource, /terrain:\s*'十二长生'/u);
  assert.match(i18nCopySource, /terrainLabel:\s*\(terrain\)\s*=>/u);
  assert.match(i18nCopySource, /死:\s*'死（收束）'/u);
  assert.match(i18nCopySource, /“死”是十二长生的阶段名/u);
  assert.match(i18nCopySource, /不是死亡或寿命判断/u);
});
