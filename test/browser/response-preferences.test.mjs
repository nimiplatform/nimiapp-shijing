import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

test('response preferences retain failed drafts, serialize saves, and flush before leaving', async () => {
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
    await page.goto(`${server.resolvedUrls.local[0]}test/browser/response-preferences.html`);
    const extra = page.locator('#resp-extra');
    await extra.waitFor();

    await page.evaluate(() => { window.preferencesTest.failNext = true; });
    await extra.fill('Keep this after a failed write');
    await page.waitForFunction(() => window.preferencesTest.attempts === 1);
    await page.waitForFunction(() => !document.querySelector('#resp-extra').disabled);
    assert.equal(await extra.inputValue(), 'Keep this after a failed write');
    assert.equal(await page.evaluate(() => window.preferencesTest.peek().settings.response_preferences.extra_instructions), undefined);
    await page.getByRole('button', { name: '保存回应偏好', exact: true }).click();
    await page.waitForFunction(() => window.preferencesTest.peek().settings.response_preferences.extra_instructions === 'Keep this after a failed write');

    await extra.fill('New instructions with a new tone');
    await page.locator('#resp-tone').click();
    await page.waitForFunction(() => !document.querySelector('#resp-extra').disabled);
    const warm = page.getByRole('option', { name: '温和', exact: true });
    if (!(await warm.isVisible())) await page.locator('#resp-tone').click();
    await warm.click();
    await page.waitForFunction(() => window.preferencesTest.peek().settings.response_preferences.tone === 'warm');
    await page.waitForFunction(() => document.querySelector('#resp-tone').textContent.includes('温和') && !document.querySelector('#resp-extra').disabled);
    assert.equal(await page.evaluate(() => window.preferencesTest.peek().settings.response_preferences.extra_instructions), 'New instructions with a new tone');

    await extra.click();
    await extra.press('ControlOrMeta+A');
    await extra.press('Backspace');
    await extra.pressSequentially('Trailing text before leaving');
    assert.equal(await extra.inputValue(), 'Trailing text before leaving');
    await page.getByRole('button', { name: 'Toggle editor', exact: true }).click();
    await page.waitForFunction(() => window.preferencesTest.peek().settings.response_preferences.extra_instructions === 'Trailing text before leaving');
    await page.getByRole('button', { name: 'Toggle editor', exact: true }).click();
    assert.equal(await extra.inputValue(), 'Trailing text before leaving');
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
});
