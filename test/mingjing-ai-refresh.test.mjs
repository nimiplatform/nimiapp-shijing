import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { shouldRefreshMingJingReadingForAiReady } from '../src/product/tabs/mingjing/mingjing-ai-refresh.ts';
import { readI18nSource } from './i18n-source.mjs';

function read(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

const READY_INPUT = {
  previous: false,
  current: true,
  loading: false,
  projectionReady: true,
  persistenceReady: true,
  hasReading: false,
  stale: false,
  hasFailure: false,
};

test('AI-ready edge refreshes a missing MingJing reading', () => {
  assert.equal(shouldRefreshMingJingReadingForAiReady(READY_INPUT), true);
});

test('AI-ready edge refreshes a stale or failed MingJing reading', () => {
  assert.equal(
    shouldRefreshMingJingReadingForAiReady({ ...READY_INPUT, hasReading: true, stale: true }),
    true,
  );
  assert.equal(
    shouldRefreshMingJingReadingForAiReady({ ...READY_INPUT, hasReading: true, hasFailure: true }),
    true,
  );
});

test('AI-ready edge leaves a fresh MingJing reading untouched', () => {
  assert.equal(
    shouldRefreshMingJingReadingForAiReady({ ...READY_INPUT, hasReading: true }),
    false,
  );
});

test('only an observed not-ready -> ready edge qualifies', () => {
  assert.equal(
    shouldRefreshMingJingReadingForAiReady({ ...READY_INPUT, previous: null }),
    false,
  );
  assert.equal(
    shouldRefreshMingJingReadingForAiReady({ ...READY_INPUT, previous: true }),
    false,
  );
  assert.equal(
    shouldRefreshMingJingReadingForAiReady({ ...READY_INPUT, current: null }),
    false,
  );
  assert.equal(
    shouldRefreshMingJingReadingForAiReady({ ...READY_INPUT, current: false }),
    false,
  );
});

test('generation gates still block the refresh', () => {
  assert.equal(
    shouldRefreshMingJingReadingForAiReady({ ...READY_INPUT, loading: true }),
    false,
  );
  assert.equal(
    shouldRefreshMingJingReadingForAiReady({ ...READY_INPUT, projectionReady: false }),
    false,
  );
  assert.equal(
    shouldRefreshMingJingReadingForAiReady({ ...READY_INPUT, persistenceReady: false }),
    false,
  );
});

test('app store exposes tri-state AIConfig readiness', () => {
  const appStore = read('src/shell/app-shell/app-store.ts');
  assert.match(appStore, /aiConfigReady: boolean \| null/);
  assert.match(appStore, /setAiConfigReady: \(ready: boolean \| null\) => void/);
  assert.match(appStore, /aiConfigReady: null/);
});

test('bootstrap mirrors projected AIConfig readiness into the app store', () => {
  const bootstrap = read('src/shell/infra/shijing-bootstrap.ts');
  assert.match(bootstrap, /projectShijingAIConfig/);
  assert.match(bootstrap, /store\.setAiConfigReady\(projectShijingAIConfig\(aiConfigSnapshot\)\.state === 'ready'\)/);
  assert.match(bootstrap, /store\.setAiConfigReady\(null\)/);
});

test('settings card publishes in-app AI setup readiness without waiting for a poll', () => {
  const status = read('src/shell/local-development/shijing-local-development-status.tsx');
  assert.match(status, /useAppStore\.getState\(\)\.setAiConfigReady\(evidence\.state === 'ready'\)/);
  assert.match(status, /useAppStore\.getState\(\)\.setAiConfigReady\(null\)/);
});

test('AIConfig readiness reaches the product store context', () => {
  const provider = read('src/product/state/shijing-store.tsx');
  const productArea = read('src/shell/routes/product-area.tsx');
  assert.match(provider, /ai_config_ready: boolean \| null/);
  assert.match(provider, /aiConfigReady\?: boolean \| null/);
  assert.match(provider, /ai_config_ready: props\.aiConfigReady \?\? null/);
  assert.match(productArea, /useAppStore\(\(state\) => state\.aiConfigReady\)/);
  assert.match(productArea, /aiConfigReady=\{aiConfigReady\}/);
});

test('MingJing tab refreshes and announces on the AI-ready edge', () => {
  const tab = read('src/product/tabs/mingjing-tab.tsx');
  assert.match(tab, /shouldRefreshMingJingReadingForAiReady/);
  assert.match(tab, /persistenceReadyForAutoGeneration/);
  assert.match(tab, /nimiToast\.info\(toastCopy\.refreshing\)/);
  assert.match(tab, /nimiToast\.success\(toastCopy\.updated\)/);
});

test('AI-ready refresh copy exists in the schema and both locales', () => {
  const schema = read('src/product/i18n/schema/mingjing.ts');
  const i18nSource = readI18nSource();
  assert.match(schema, /aiReadyRefresh: \{/);
  assert.match(i18nSource, /refreshing: '检测到 AI 已配置完成，正在刷新命镜解读…'/);
  assert.match(i18nSource, /updated: '命镜解读已根据新的 AI 配置更新。'/);
  assert.match(i18nSource, /refreshing: 'AI setup detected — refreshing the Destiny Mirror reading…'/);
  assert.match(i18nSource, /updated: 'Destiny Mirror reading updated with the new AI configuration\.'/);
});
