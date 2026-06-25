import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { hejingCssFiles, readCssBundle } from './css-bundles.mjs';

const mingjingTabSource = readFileSync(
  new URL('../src/product/tabs/mingjing-tab.tsx', import.meta.url),
  'utf8',
);

const baziMingjingRouteSource = readFileSync(
  new URL('../src/product/tabs/mingjing/bazi-mingjing-route.tsx', import.meta.url),
  'utf8',
);

const hejingTabSource = readFileSync(
  new URL('../src/product/tabs/hejing-tab.tsx', import.meta.url),
  'utf8',
);

const hejingModelSource = readFileSync(
  new URL('../src/product/tabs/hejing/hejing-model.ts', import.meta.url),
  'utf8',
);

const hejingStyles = readCssBundle(hejingCssFiles).replace(/\/\*[\s\S]*?\*\//g, '');

function cssBlock(selector) {
  const blocks = [];
  for (const match of hejingStyles.matchAll(/([^{}]+)\{([^{}]*)\}/gu)) {
    const selectorList = match[1].split(',').map((item) => item.trim());
    if (selectorList.includes(selector)) blocks.push(match[2]);
  }
  return blocks.join('\n');
}

test('MingJing no longer renders the relationship HePan module', () => {
  assert.doesNotMatch(baziMingjingRouteSource, /MingJingRelationshipReadingView/u);
  assert.doesNotMatch(baziMingjingRouteSource, /relationshipReading/u);
  assert.doesNotMatch(mingjingTabSource, /latestMingJingRelationshipReading/u);
  assert.doesNotMatch(mingjingTabSource, /relationshipNatalMirrorScopeForToday/u);
});

test('HeJing page is data-driven and exposes the requested interaction anchors', () => {
  assert.match(hejingModelSource, /HEJING_RELATIONSHIP_WORKSPACES/u);
  assert.match(hejingModelSource, /HEJING_RELATIONSHIP_TYPES/u);
  assert.match(hejingModelSource, /metrics/u);
  assert.match(hejingModelSource, /futureWindows/u);
  assert.match(hejingModelSource, /repairWindow/u);
  assert.match(hejingTabSource, /useState/u);
  assert.match(hejingTabSource, /setSelectedWorkspaceId/u);
  assert.match(hejingTabSource, /handleCreateHejing/u);
  assert.match(hejingTabSource, /handleGenerateAdvice/u);
  assert.match(hejingTabSource, /handleWriteRecord/u);
});

test('HeJing renders every requested relationship workbench module', () => {
  for (const marker of [
    'shijing-hejing__intro',
    'shijing-hejing__hero',
    'shijing-hejing__metrics',
    'shijing-hejing__structure',
    'shijing-hejing__interaction',
    'shijing-hejing__windows',
    'shijing-hejing__advice',
    'shijing-hejing__history',
  ]) {
    assert.match(hejingTabSource, new RegExp(marker, 'u'));
  }
});

test('HeJing exposes the relationship-index radar and bilingual section heads', () => {
  assert.match(hejingTabSource, /HeJingRadar/u);
  assert.match(hejingTabSource, /shijing-hejing__radar-frame/u);
  assert.match(hejingTabSource, /copy\.indexTitleEn/u);
  assert.match(hejingModelSource, /RELATIONSHIP INDEX/u);
  assert.match(hejingModelSource, /CHART INTERSECTION/u);
});

test('HeJing hero banner uses names and a three-field relationship summary', () => {
  assert.match(hejingTabSource, /shijing-hejing__pair-link/u);
  assert.match(hejingTabSource, /PersonCircle/u);
  assert.match(hejingTabSource, /copy\.basisLabel/u);
  assert.match(hejingTabSource, /copy\.phaseLabel/u);
  assert.match(hejingTabSource, /copy\.futureHintLabel/u);
  assert.doesNotMatch(hejingTabSource, /shijing-hejing__avatar/u);
  assert.doesNotMatch(hejingTabSource, /summary-progress/u);
  assert.doesNotMatch(hejingTabSource, /completeness/u);
});

test('HeJing copy avoids absolute fate language', () => {
  assert.doesNotMatch(hejingModelSource, /大凶|天作之合|注定分离|上等婚配/u);
});

test('HeJing styles match the green relationship workbench language responsively', () => {
  assert.match(cssBlock('.shijing-hejing'), /max-width:\s*1080px/);
  assert.match(cssBlock('.shijing-hejing'), /gap:\s*16px/);
  assert.match(cssBlock('.shijing-hejing .shijing-hejing__hero'), /linear-gradient\(150deg/);
  assert.match(cssBlock('.shijing-hejing__unsupported'), /background:\s*rgba\(184,\s*105,\s*79,\s*0\.1\)/);
  assert.match(cssBlock('.shijing-hejing__generated-grid'), /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(280px,\s*0\.88fr\)/);
  assert.match(cssBlock('.shijing-hejing__index-body'), /grid-template-columns:\s*minmax\(260px,\s*0\.78fr\)\s+minmax\(0,\s*1fr\)/);
  assert.match(cssBlock('.shijing-hejing__metric-readouts'), /grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(cssBlock('.shijing-hejing__structure-grid'), /grid-template-columns:\s*minmax\(180px,\s*1fr\)\s+minmax\(240px,\s*1\.1fr\)\s+minmax\(180px,\s*1fr\)/);
  assert.match(cssBlock('.shijing-hejing__timeline'), /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(hejingStyles, /@media\s*\(max-width:\s*760px\)/);
});
