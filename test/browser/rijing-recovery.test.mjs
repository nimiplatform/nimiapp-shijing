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
