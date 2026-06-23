import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const mingjingTabSource = readFileSync(
  new URL('../src/product/tabs/mingjing-tab.tsx', import.meta.url),
  'utf8',
);

const relationshipViewSource = readFileSync(
  new URL('../src/product/tabs/mingjing/mingjing-relationship-reading-view.tsx', import.meta.url),
  'utf8',
);

const mingjingStyles = readFileSync(
  new URL('../src/styles-mingjing-rich.css', import.meta.url),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '');

function cssBlock(selector) {
  const blocks = [];
  for (const match of mingjingStyles.matchAll(/([^{}]+)\{([^{}]*)\}/gu)) {
    const selectorList = match[1].split(',').map((item) => item.trim());
    if (selectorList.includes(selector)) blocks.push(match[2]);
  }
  return blocks.join('\n');
}

test('MingJing page wires a real relationship HePan generation surface', () => {
  assert.match(mingjingTabSource, /MingJingRelationshipReadingView/u);
  assert.match(mingjingTabSource, /latestMingJingNatalReading/u);
  assert.match(mingjingTabSource, /latestMingJingRelationshipReading/u);
  assert.match(mingjingTabSource, /relationshipNatalMirrorScopeForToday/u);
  assert.match(mingjingTabSource, /related_person_refs:\s*\[selectedRelationshipPersonRef\]/u);
  assert.match(mingjingTabSource, /inputsSummaryStalenessForSpace/u);
});

test('relationship HePan view renders every admitted output section', () => {
  assert.match(relationshipViewSource, /output\.summary/u);
  assert.match(relationshipViewSource, /STRUCTURE_ORDER\.map/u);
  assert.match(relationshipViewSource, /output\.timing_windows\.map/u);
  assert.match(relationshipViewSource, /PRACTICE_ORDER\.map/u);
  assert.match(relationshipViewSource, /window\.driver_refs/u);
  assert.match(relationshipViewSource, /MingJingInfo/u);
  assert.match(relationshipViewSource, /ImportToShiJingButton/u);
  assert.match(relationshipViewSource, /readingId/u);
});

test('relationship HePan styles keep selector and result grids stable', () => {
  assert.match(cssBlock('.shijing-mj-relationship__controls'), /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/);
  assert.match(cssBlock('.shijing-mj-relationship__grid'), /grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(220px,\s*1fr\)\)/);
  assert.match(cssBlock('.shijing-mj-relationship__windows'), /display:\s*grid/);
});
