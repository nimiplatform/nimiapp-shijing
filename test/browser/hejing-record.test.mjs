import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

test('HeJing edits preserve shared memory metadata and failed saves retain the draft', async () => {
  const server = await createServer({
    root: fileURLToPath(new URL('../../', import.meta.url)),
    server: { host: '127.0.0.1', port: 0 },
  });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${server.resolvedUrls.local[0]}test/browser/hejing-record.html`);
    await page.getByRole('button', { name: '轨迹', exact: true }).click();
    const original = await page.evaluate(() => window.hejingTest.peek().event_memories[0]);
    await page.getByRole('button', { name: '编辑这条记录', exact: true }).click();
    await page.getByRole('textbox', { name: '发生了什么', exact: true }).fill('保留所有参与者的新描述');
    await page.evaluate(() => { window.hejingTest.failNext = true; });
    await page.getByRole('button', { name: '保存记录', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: '没能保存' }).waitFor();
    assert.deepEqual(await page.evaluate(() => window.hejingTest.peek().event_memories[0]), original);
    assert.equal(await page.getByRole('textbox', { name: '发生了什么', exact: true }).inputValue(), '保留所有参与者的新描述');
    await page.getByRole('button', { name: '保存记录', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    const saved = await page.evaluate(() => window.hejingTest.peek().event_memories[0]);
    assert.equal(saved.body, '保留所有参与者的新描述');
    for (const key of ['id', 'person_refs', 'occurred_at', 'source', 'admissible_use', 'concern_tag_refs', 'created_at']) {
      assert.deepEqual(saved[key], original[key], `editing prose must preserve ${key}`);
    }
    await page.reload();
    await page.getByRole('button', { name: '轨迹', exact: true }).click();
    await page.getByRole('button', { name: '编辑这条记录', exact: true }).click();
    await page.getByLabel('发生日期', { exact: true }).fill('2026-05-03');
    await page.getByRole('button', { name: '保存记录', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => window.hejingTest.peek().event_memories[0].occurred_at), '2026-05-03T00:00:00Z');
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
});
