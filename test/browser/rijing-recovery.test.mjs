import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

test('RiJing exposes a working manual retry after a failed save and publishes only after recovery', async () => {
  const server = await createServer({
    root: fileURLToPath(new URL('../../', import.meta.url)),
    server: { host: '127.0.0.1', port: 0 },
  });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({
      headless: true,
      ...(process.platform === 'win32' ? { channel: 'msedge' } : {}),
    });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-09-23T00:30:00Z'));
    await page.goto(`${server.resolvedUrls.local[0]}test/browser/rijing-recovery.html`);
    const generate = page.locator('.shijing-rijing__generate');
    await generate.waitFor();
    assert.equal(await page.evaluate(() => window.rijingTest.observed.aiCalls), 0);
    await generate.click();
    await page.waitForFunction(() => document.querySelector('[data-testid="rijing-generation-status"]').textContent === 'save_failed');
    assert.equal(await page.evaluate(() => window.rijingTest.persistence.peek().readings.length), 0);
    assert.deepEqual(await page.evaluate(() => window.rijingTest.observed.publishedAfterSave), []);
    assert.equal(await generate.isEnabled(), true);
    assert.equal(await generate.textContent(), '重新生成今日');

    await generate.click();
    await page.waitForFunction(() => document.querySelector('[data-testid="rijing-generation-status"]').textContent === 'saved');
    await page.waitForFunction(() => window.rijingTest.observed.publishedAfterSave.length === 1);
    assert.equal(await page.evaluate(() => window.rijingTest.persistence.attempts), 2);
    assert.equal(await page.evaluate(() => window.rijingTest.observed.aiCalls), 2);
    assert.equal(await page.evaluate(() => window.rijingTest.persistence.peek().readings.length), 1);
    assert.deepEqual(await page.evaluate(() => window.rijingTest.observed.publishedAfterSave), [1]);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
});

async function withRecoveryScenario(scenario, run) {
  const server = await createServer({
    root: fileURLToPath(new URL('../../', import.meta.url)),
    server: { host: '127.0.0.1', port: 0 },
  });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-09-23T00:30:00Z'));
    await page.goto(`${server.resolvedUrls.local[0]}test/browser/rijing-recovery.html?scenario=${scenario}`);
    await page.locator('.shijing-rijing__generate').click();
    await page.locator('[data-failure-kind="runtime_ai_failed"]').waitFor();
    assert.equal(await page.evaluate(() => window.rijingTest.persistence.peek().readings.length), 0);
    assert.deepEqual(await page.evaluate(() => window.rijingTest.observed.publishedAfterSave), []);
    await run(page);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
}

test('RiJing AI configuration recovery reports rejected navigation and permits generation after repair', () => withRecoveryScenario('configuration', async (page) => {
  const banner = page.locator('[data-failure-kind="runtime_ai_failed"]');
  const recovery = banner.getByRole('button', { name: '检查 AI 模型', exact: true });
  await recovery.click();
  await banner.getByText('desktop_navigation_denied', { exact: true }).waitFor();
  assert.equal(await banner.getByRole('status').count(), 0);
  await page.evaluate(() => { window.rijingTest.observed.rejectNavigation = false; });
  await recovery.click();
  await banner.getByRole('status').waitFor();
  assert.deepEqual(await page.evaluate(() => window.rijingTest.observed.recoveryTargets), ['model_configuration', 'model_configuration']);
  await page.evaluate(() => window.rijingTest.recoverAi());
  await page.locator('.shijing-rijing__generate').click();
  await page.waitForFunction(() => document.querySelector('[data-testid="rijing-generation-status"]').textContent === 'saved');
  assert.equal(await page.locator('[data-failure-kind="runtime_ai_failed"]').count(), 0);
  assert.equal(await page.evaluate(() => window.rijingTest.persistence.peek().readings.length), 1);
}));

test('RiJing invalid AI output offers a direct retry and never saves the rejected output', () => withRecoveryScenario('parse', async (page) => {
  const retry = page.locator('[data-failure-kind="runtime_ai_failed"]').getByRole('button', { name: '重新生成', exact: true });
  await page.evaluate(() => window.rijingTest.recoverAi());
  await retry.click();
  await page.waitForFunction(() => document.querySelector('[data-testid="rijing-generation-status"]').textContent === 'saved');
  assert.equal(await page.evaluate(() => window.rijingTest.persistence.attempts), 1);
  assert.deepEqual(await page.evaluate(() => window.rijingTest.observed.recoveryTargets), []);
}));
