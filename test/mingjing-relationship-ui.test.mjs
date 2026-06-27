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

const hejingSectionsSource = readFileSync(
  new URL('../src/product/tabs/hejing/hejing-sections.tsx', import.meta.url),
  'utf8',
);

const hejingContentSource = readFileSync(
  new URL('../src/product/tabs/hejing/hejing-content.ts', import.meta.url),
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

test('HeJing renders the redesigned relationship sections in order', () => {
  for (const component of [
    'HeJingOverview',
    'HeJingFocusSection',
    'HeJingRadarSection',
    'HeJingWindowsSection',
    'HeJingWaysSection',
    'HeJingRecordsSection',
    'HeJingBasisSection',
  ]) {
    assert.match(hejingTabSource, new RegExp(`<${component}`, 'u'));
  }
});

test('HeJing overview leads with relationship status, keywords, reminder and today actions', () => {
  assert.match(hejingSectionsSource, /shijing-hejing__overview/u);
  assert.match(hejingSectionsSource, /shijing-hejing__pair-link/u);
  assert.match(hejingSectionsSource, /relationshipStatus/u);
  assert.match(hejingSectionsSource, /copy\.statusLabel/u);
  assert.match(hejingSectionsSource, /copy\.keywordsLabel/u);
  assert.match(hejingSectionsSource, /copy\.reminderLabel/u);
  assert.match(hejingSectionsSource, /copy\.todayLabel/u);
});

test('HeJing uses parent-friendly relationship metrics, not partner-only ones', () => {
  for (const label of ['理解度', '沟通顺畅度', '规则一致性', '情绪安全感', '成长支持度', '修复能力']) {
    assert.match(hejingContentSource, new RegExp(label, 'u'));
  }
  assert.doesNotMatch(hejingContentSource, /吸引力|心动|暧昧|亲密指数/u);
  // Every metric pairs a score with a one-line explanation.
  assert.match(hejingSectionsSource, /metric\.explanation/u);
});

test('HeJing exposes the relationship radar without technical engine titles', () => {
  assert.match(hejingSectionsSource, /HeJingRadar/u);
  assert.match(hejingSectionsSource, /shijing-hejing__radar-frame/u);
  assert.doesNotMatch(hejingContentSource, /ENGINE OUTPUT/u);
  assert.doesNotMatch(hejingTabSource, /ENGINE OUTPUT/u);
});

test('HeJing future window timeline carries 状态/注意点/建议行动 per quarter', () => {
  assert.match(hejingSectionsSource, /copy\.windowsStateLabel/u);
  assert.match(hejingSectionsSource, /copy\.windowsWatchLabel/u);
  assert.match(hejingSectionsSource, /copy\.windowsActionLabel/u);
  assert.match(hejingSectionsSource, /shijing-hejing__quarter/u);
});

test('HeJing keeps the astrology basis in a collapsed bottom drawer', () => {
  assert.match(hejingSectionsSource, /<details className="shijing-hejing__basis">/u);
  assert.match(hejingContentSource, /HEJING_DEFAULT_BASIS/u);
  for (const chip of ['五行', '十神', '冲合', '流年', '大运']) {
    assert.match(hejingContentSource, new RegExp(chip, 'u'));
  }
});

test('HeJing copy avoids absolute fate language', () => {
  assert.doesNotMatch(hejingModelSource, /大凶|天作之合|注定分离|上等婚配/u);
  assert.doesNotMatch(hejingContentSource, /大凶|天作之合|注定分离|上等婚配/u);
});

test('HeJing styles match the green relationship workbench language responsively', () => {
  assert.match(cssBlock('.shijing-hejing'), /max-width:\s*1120px/);
  assert.match(cssBlock('.shijing-hejing'), /gap:\s*22px/);
  assert.match(cssBlock('.shijing-hejing__overview-card'), /grid-template-columns:\s*minmax\(0,\s*0\.82fr\)\s+minmax\(0,\s*1\.18fr\)/);
  assert.match(cssBlock('.shijing-hejing__unsupported'), /background:\s*rgba\(184,\s*105,\s*79,\s*0\.1\)/);
  assert.match(cssBlock('.shijing-hejing__index-body'), /grid-template-columns:\s*minmax\(260px,\s*0\.82fr\)\s+minmax\(0,\s*1\.18fr\)/);
  assert.match(cssBlock('.shijing-hejing__metric-readouts'), /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(cssBlock('.shijing-hejing__focus-grid'), /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(cssBlock('.shijing-hejing__timeline'), /grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(hejingStyles, /@media\s*\(max-width:\s*760px\)/);
});
