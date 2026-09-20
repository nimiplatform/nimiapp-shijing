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

const hejingPendingSource = readFileSync(
  new URL('../src/product/tabs/hejing/hejing-pending.tsx', import.meta.url),
  'utf8',
);

const hejingRecordDialogSource = readFileSync(
  new URL('../src/product/tabs/hejing/hejing-record-dialog.tsx', import.meta.url),
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

test('HeJing renders the pattern-reading sections in the admitted order', () => {
  const order = [
    '<HeJingOverviewSection',
    '<HeJingPatternsSection',
    '<HeJingRecentSection',
    '<HeJingActionSection',
  ].map((marker) => {
    const index = hejingTabSource.indexOf(marker);
    assert.notEqual(index, -1, `missing ${marker}`);
    return index;
  });
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'sections must render in proposal order');
});

test('HeJing recent section renders only when deterministic evidence admits a window', () => {
  assert.match(
    hejingTabSource,
    /relationshipOutput\.recent_status\.availability === 'available' \? \(\s*<HeJingRecentSection/u,
  );
  assert.match(hejingSectionsSource, /recentAvailable/u);
  assert.match(hejingSectionsSource, /copy\.recentUnavailableNote/u);
  assert.match(hejingContentSource, /本次暂无近期变化解读/u);
});

test('HeJing hard-cuts radar, metrics, quarters and the removed sections everywhere', () => {
  for (const source of [hejingTabSource, hejingSectionsSource, hejingModelSource, hejingContentSource, hejingPendingSource]) {
    assert.doesNotMatch(source, /HeJingRadar|radar/u);
    assert.doesNotMatch(source, /buildGeneratedMetrics|METRIC_BLUEPRINT|HeJingMetric/u);
    assert.doesNotMatch(source, /buildGeneratedQuarters|QUARTER_META|HeJingQuarterWindow|Q1|Q2|Q3|Q4/u);
    assert.doesNotMatch(source, /HeJingFocusSection|focusCards/u);
    assert.doesNotMatch(source, /HeJingWaysSection|HeJingBasisSection|HeJingRecordsSection/u);
    assert.doesNotMatch(source, /HEJING_RELATIONSHIP_WORKSPACES|SNOW_SELF|SNOW_OTHER|SNOW_RECORDS|HEJING_DEFAULT_BASIS/u);
    assert.doesNotMatch(source, /buildGeneratedHeJingWorkspace/u);
    assert.doesNotMatch(source, /repairWindow|futureWindows|weeklyAdvice|relationshipStatus/u);
  }
  // The workbench never falls back to sample workspaces in the real path.
  assert.doesNotMatch(hejingTabSource, /HEJING_RELATIONSHIP_WORKSPACES/u);
  assert.match(hejingTabSource, /state\.snapshot\.persons\.map\(buildHeJingWorkspaceFromPerson\)/u);
});

test('HeJing overview section renders admitted overview wording only', () => {
  assert.match(hejingSectionsSource, /output\.overview\.title/u);
  assert.match(hejingSectionsSource, /output\.overview\.summary/u);
  assert.match(hejingSectionsSource, /output\.overview\.keywords\.slice\(0, 3\)/u);
  assert.doesNotMatch(hejingSectionsSource, /总分|评级|稳定性/u);
});

test('HeJing pattern item labels both-side tendencies and renders the admitted fields', () => {
  assert.match(hejingSectionsSource, /copy\.selfTendencyLabel/u);
  assert.match(hejingSectionsSource, /relatedName/u);
  assert.match(hejingSectionsSource, /pattern\.self_tendency/u);
  assert.match(hejingSectionsSource, /pattern\.related_tendency/u);
  assert.match(hejingSectionsSource, /pattern\.scenario/u);
  assert.match(hejingSectionsSource, /pattern\.aligned_expression/u);
  assert.match(hejingSectionsSource, /pattern\.friction_expression/u);
  assert.match(hejingSectionsSource, /pattern\.signals\.map/u);
  assert.match(hejingContentSource, /值得观察的具体场景/u);
  assert.match(hejingContentSource, /配合顺利时/u);
  assert.match(hejingContentSource, /发生分歧时/u);
  assert.match(hejingContentSource, /可识别的行为信号/u);
});

test('HeJing per-pattern 解读依据 drawer shows method, verbatim evidence, rule basis and limitation', () => {
  assert.match(hejingSectionsSource, /<details className="shijing-hejing__basis">/u);
  assert.match(hejingSectionsSource, /relationshipPatternRuleBasis\(pattern\.rule_ref\)/u);
  assert.match(hejingSectionsSource, /pattern\.evidence_summary/u);
  assert.match(hejingSectionsSource, /methodLabel/u);
  assert.match(hejingSectionsSource, /basis\.title/u);
  assert.match(hejingSectionsSource, /basis\.body/u);
  assert.match(hejingSectionsSource, /copy\.basisLimitation/u);
  assert.match(hejingContentSource, /依据存在并不自动证明解释成立/u);
  // driver_refs stay opaque: the UI never parses them.
  assert.doesNotMatch(hejingSectionsSource, /driver_refs/u);
  assert.doesNotMatch(hejingTabSource, /driver_refs/u);
});

test('HeJing action block renders situation, step, quoted phrase, rationale and observation', () => {
  assert.match(hejingSectionsSource, /action\.situation/u);
  assert.match(hejingSectionsSource, /action\.step/u);
  assert.match(hejingSectionsSource, /<blockquote className="shijing-hejing__action-phrase">\{action\.example_phrase\}<\/blockquote>/u);
  assert.match(hejingSectionsSource, /action\.rationale/u);
  assert.match(hejingSectionsSource, /action\.observation/u);
  assert.match(hejingContentSource, /下一次,可以试这一件事/u);
  assert.doesNotMatch(hejingContentSource, /本周建议|本月建议/u);
});

test('HeJing toolbar shows person, relation label, method and generation status with a subtle action group', () => {
  assert.match(hejingTabSource, /workspace\.displayName/u);
  assert.match(hejingTabSource, /workspace\.relationLabel/u);
  assert.match(hejingTabSource, /copy\.methodLabel/u);
  assert.match(hejingTabSource, /copy\.statusPending/u);
  assert.match(hejingTabSource, /copy\.statusStale/u);
  assert.match(hejingTabSource, /copy\.statusGenerated/u);
  assert.match(hejingTabSource, /shijing-hejing__toolbar-actions/u);
  assert.match(hejingTabSource, /copy\.regenerate/u);
  assert.match(hejingTabSource, /copy\.recordEntry/u);
});

test('HeJing consultation entry wires the current reading into ImportToShiJingButton when fresh', () => {
  assert.match(hejingTabSource, /import \{ ImportToShiJingButton \} from '\.\/shared\/import-to-shijing-button\.tsx'/u);
  assert.match(hejingTabSource, /relationshipReading && !readingStale \? \(\s*<ImportToShiJingButton readingId=\{relationshipReading\.id\} \/>/u);
  assert.match(hejingTabSource, /inputsSummaryExpired\(relationshipReading, new Date\(\)\)/u);
  assert.doesNotMatch(hejingTabSource, /handleChat/u);
  assert.doesNotMatch(hejingContentSource, /chatStatus/u);
});

test('HeJing record entry is a real dialog saving through upsertEventMemory, not a toast stub', () => {
  assert.match(hejingTabSource, /<HeJingRecordDialog/u);
  assert.doesNotMatch(hejingTabSource, /handleWriteRecord|recordStatus/u);
  assert.match(hejingRecordDialogSource, /upsertEventMemory/u);
  assert.match(hejingRecordDialogSource, /buildHeJingEventMemoryDraft/u);
  assert.match(hejingRecordDialogSource, /nimiToast\.success\(props\.editing \? copy\.recordUpdatedToast : copy\.recordSavedToast\)/u);
  assert.match(hejingRecordDialogSource, /type="date"/u);
  assert.match(hejingRecordDialogSource, /<textarea/u);
  // The target person is shown fixed for confirmation, not editable.
  assert.match(hejingRecordDialogSource, /copy\.recordDialogPersonLabel/u);
  assert.match(hejingRecordDialogSource, /props\.personDisplayName/u);
});

test('HeJing track view lists real records with badges, note and empty state', () => {
  assert.match(hejingTabSource, /hejingTrackRecords\(state\.snapshot, selectedPersonRef\)/u);
  assert.match(hejingTabSource, /<HeJingTrackView/u);
  assert.match(hejingSectionsSource, /copy\.trackNote/u);
  assert.match(hejingSectionsSource, /copy\.trackEventBadge/u);
  assert.match(hejingSectionsSource, /copy\.trackPlanBadge/u);
  assert.match(hejingSectionsSource, /copy\.trackEmptyTitle/u);
  assert.match(hejingContentSource, /不代表对方参与、确认或收到通知/u);
});

test('HeJing pattern gate replaces the generate CTA for methods without admitted pattern rules', () => {
  assert.match(hejingModelSource, /methodProfileId === 'bazi_ziping_v1'/u);
  assert.match(hejingTabSource, /hejingPatternSupportState\(currentMethodProfileId\)/u);
  assert.match(hejingTabSource, /patternSupported=\{patternSupport\.supported\}/u);
  assert.match(hejingPendingSource, /shijing-hejing__pattern-unsupported/u);
  assert.match(hejingContentSource, /该方法暂无准入的合镜模式规则/u);
  // No silent method auto-switching.
  assert.doesNotMatch(hejingTabSource, /method_profile_id = 'bazi_ziping_v1'/u);
});

test('HeJing patterns_unavailable failure keeps the typed banner plus evidence guidance', () => {
  assert.match(hejingTabSource, /<FailureBanner failure=\{failure\} \/>/u);
  assert.match(hejingTabSource, /failure\?\.kind === 'patterns_unavailable'/u);
  assert.match(hejingTabSource, /copy\.patternFailureGuidance/u);
});

test('HeJing tab carries the HeJing workbench authority marker', () => {
  assert.match(hejingTabSource, /\/\/ @nimi-authority: rule\.shijing\.ia\.r009\n/u);
});

test('HeJing copy avoids fate claims, invented shared history and improvement promises', () => {
  for (const source of [hejingContentSource, hejingModelSource, hejingSectionsSource]) {
    assert.doesNotMatch(source, /大凶|天作之合|注定分离|上等婚配/u);
    assert.doesNotMatch(source, /你们曾经/u);
    assert.doesNotMatch(source, /保证改善|一定会变好|必然/u);
  }
});

test('HeJing pending preview cards describe the pattern-reading sections', () => {
  for (const title of ['关系概览', '主要相处模式', '近期变化', '下一次,可以试这一件事']) {
    assert.ok(hejingContentSource.includes(title), `missing pending preview card ${title}`);
  }
  assert.doesNotMatch(hejingContentSource, /关系雷达|理解度|沟通顺畅度|未来时间窗口/u);
  assert.doesNotMatch(hejingPendingSource, /relationshipStatus/u);
  assert.doesNotMatch(hejingPendingSource, /workspace\.keywords/u);
});

test('HeJing styles carry no radar, metric, quarter or focus selectors and stay responsive', () => {
  assert.doesNotMatch(hejingStyles, /radar|metric|quarter|timeline|focus-grid|__ways|__index-body/u);
  assert.match(cssBlock('.shijing-hejing'), /max-width:\s*1120px/);
  assert.match(cssBlock('.shijing-hejing'), /gap:\s*22px/);
  assert.match(cssBlock('.shijing-hejing__toolbar'), /display:\s*flex/);
  assert.match(cssBlock('.shijing-hejing__pattern-list'), /display:\s*flex/);
  assert.match(cssBlock('.shijing-hejing__track-item'), /display:\s*grid/);
  assert.match(cssBlock('.shijing-hejing .shijing-hejing__action-phrase'), /border-left:\s*3px solid/);
  assert.match(hejingStyles, /@media\s*\(max-width:\s*960px\)/);
  assert.match(hejingStyles, /@media\s*\(max-width:\s*760px\)/);
  assert.match(hejingStyles, /@media\s*\(max-width:\s*460px\)/);
});
