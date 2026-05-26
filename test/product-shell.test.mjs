// Wave-1 — structural sanity tests for the renderer shell module
// surface. Node 24 native TS strip does not load `.tsx`, so SSR/DOM
// rendering is covered by the wave-4 e2e acceptance pass. Wave-1
// asserts the source-tree contract: each tab body file exists, reads
// its descriptor from SHIJING_IA_TABS, and does not hardcode the
// canonical Chinese labels in JSX.

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { SHIJING_IA_TABS } from '../src/contracts/ia-contract.ts';
import { describeTab } from '../src/product/navigation/tab-descriptor.ts';

const SHELL_PATH = new URL('../src/product/shell/shijing-shell.tsx', import.meta.url);
const ROUTER_PATH = new URL('../src/product/navigation/tab-router.tsx', import.meta.url);
const STYLES_PATH = new URL('../src/styles.css', import.meta.url);
const TAB_FILES = {
  today: new URL('../src/product/tabs/today.tsx', import.meta.url),
  views: new URL('../src/product/tabs/views.tsx', import.meta.url),
  consultation: new URL('../src/product/tabs/consultation.tsx', import.meta.url),
  me: new URL('../src/product/tabs/me.tsx', import.meta.url),
};

test('describeTab returns canonical descriptor for every admitted id', () => {
  for (const tab of SHIJING_IA_TABS) {
    assert.deepEqual(describeTab(tab.id), tab);
  }
});

test('describeTab throws for unknown ids', () => {
  assert.throws(() => describeTab('history'), /SHIJING_IA_TABS descriptor/);
});

test('shell renders the SHIJING_IA_TABS through kit NimiTabs (one tab per admitted id)', () => {
  const shellSource = readFileSync(SHELL_PATH, 'utf8');
  // SJG-IA-01..03: the four admitted tabs come from SHIJING_IA_TABS, not
  // a parallel literal list, and labels come from the contract's
  // chinese_label.
  assert.match(shellSource, /SHIJING_IA_TABS\.map/);
  assert.match(shellSource, /tab\.id/);
  assert.match(shellSource, /tab\.chinese_label/);
  // SJG-IA-05: kit's NimiTabs is the tab primitive.
  assert.match(shellSource, /NimiTabs/);
  assert.match(shellSource, /onValueChange/);
});

test('shell short-circuits on invalid snapshot status', () => {
  const shellSource = readFileSync(SHELL_PATH, 'utf8');
  assert.match(shellSource, /snapshot_status\.kind === 'invalid'/);
  assert.match(shellSource, /snapshot_status\.error\.code/);
  assert.match(shellSource, /shijing-shell--error/);
});

test('shell routes invalid self natal inputs into a repair form', () => {
  const shellSource = readFileSync(SHELL_PATH, 'utf8');
  assert.match(shellSource, /space_self_subject_natal_inputs_invalid/);
  assert.match(shellSource, /NatalInputsForm/);
  assert.match(shellSource, /shijing-shell--repair/);
});

test('repair shell receives the same product form styling scope as tabs', () => {
  const stylesSource = readFileSync(STYLES_PATH, 'utf8');
  assert.match(stylesSource, /:where\(\.shijing-tab, \.shijing-shell--repair, \.shijing-conversation-thread\) form/);
  assert.match(stylesSource, /:where\(\.shijing-tab, \.shijing-shell--repair, \.shijing-conversation-thread\) label/);
  assert.match(stylesSource, /:where\(\.shijing-tab, \.shijing-shell--repair, \.shijing-conversation-thread\) input\[type="text"\]/);
  assert.match(stylesSource, /:where\(\.shijing-tab, \.shijing-shell--repair, \.shijing-conversation-thread\) select/);
  assert.match(stylesSource, /:where\(\.shijing-tab, \.shijing-shell--repair, \.shijing-conversation-thread\) button/);
});

test('tab router has a branch for every admitted tab id and never iterates SHIJING_IA_TABS', () => {
  const routerSource = readFileSync(ROUTER_PATH, 'utf8');
  for (const tab of SHIJING_IA_TABS) {
    assert.match(routerSource, new RegExp(`case '${tab.id}'`));
  }
  assert.doesNotMatch(routerSource, /SHIJING_IA_TABS\.(map|forEach|filter|reduce)/);
});

test('each tab body imports describeTab and uses TAB.chinese_label, not a literal', () => {
  for (const [id, url] of Object.entries(TAB_FILES)) {
    const source = readFileSync(url, 'utf8');
    assert.match(source, new RegExp(`describeTab\\('${id}'\\)`), `${id}: must call describeTab('${id}')`);
    assert.match(source, /TAB\.chinese_label/, `${id}: must render TAB.chinese_label`);
    for (const tab of SHIJING_IA_TABS) {
      const literalLabelPattern = new RegExp(`>${tab.chinese_label}<`);
      assert.doesNotMatch(source, literalLabelPattern, `${id} tab must not hardcode literal label ${tab.chinese_label} in JSX`);
    }
  }
});

test('no tab body imports a persistence / network primitive', () => {
  const FORBIDDEN_PATTERNS = [/fetch\s*\(/, /XMLHttpRequest/, /localStorage/, /sessionStorage/, /IndexedDB/, /sqlite/];
  for (const url of Object.values(TAB_FILES)) {
    const source = readFileSync(url, 'utf8');
    for (const pattern of FORBIDDEN_PATTERNS) {
      assert.doesNotMatch(source, pattern, `${url.href} contains forbidden primitive ${pattern}`);
    }
  }
});
