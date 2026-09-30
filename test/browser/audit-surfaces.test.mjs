import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

async function withFixture(query, run) {
  const server = await createServer({
    root: fileURLToPath(new URL('../../', import.meta.url)),
    server: { host: '127.0.0.1', port: 0 },
  });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-09-30T00:30:00Z'));
    await page.goto(`${server.resolvedUrls.local[0]}test/browser/audit-surfaces.html${query}`);
    await run(page);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
}

async function assertMainFits(page) {
  const dimensions = await page.locator('.shijing-shell__main').evaluate((el) => ({ client: el.clientWidth, scroll: el.scrollWidth }));
  assert.ok(dimensions.scroll <= dimensions.client + 1, JSON.stringify(dimensions));
}

async function openPersonEditor(page) {
  await page.getByRole('button', { name: '账户菜单', exact: true }).click();
  await page.getByRole('menuitem', { name: '档案', exact: true }).click();
  const people = page.locator('.sjp-card').filter({
    has: page.getByRole('heading', { name: '关系人物', exact: true }),
  });
  await people.getByRole('button', { name: '添加', exact: true }).click();
  return page.getByRole('dialog', { name: '添加关系人物', exact: true });
}

test('lunar Escape preserves the real person editor and its unsaved draft', () => withFixture('', async (page) => {
  const editor = await openPersonEditor(page);
  const name = editor.getByRole('textbox', { name: '称呼', exact: true });
  await name.fill('Unsaved person');
  await editor.getByRole('combobox', { name: '出生日期类型', exact: true }).click();
  await page.getByRole('option', { name: '农历', exact: true }).click();
  const trigger = editor.getByRole('button', { name: '选择农历日期', exact: true });
  const previousDate = await trigger.textContent();
  await trigger.focus();
  await trigger.press('Enter');
  const year = page.getByRole('listbox', { name: '农历年份', exact: true });
  await year.waitFor();
  await year.press('ArrowUp');
  await page.keyboard.press('Escape');
  assert.equal(await editor.isVisible(), true);
  assert.equal(await name.inputValue(), 'Unsaved person');
  assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
  assert.equal(await trigger.textContent(), previousDate);
  assert.equal(await trigger.evaluate((el) => el === document.activeElement), true);
  assert.equal(await page.evaluate(() => window.auditTest.peek().persons.length), 1);

  await page.keyboard.press('Escape');
  await editor.waitFor({ state: 'hidden' });
  assert.equal(await page.getByRole('dialog', { name: '档案', exact: true }).isVisible(), true);
}));

test('unknown birth time disables keyboard entry and closes an open time panel', () => withFixture('', async (page) => {
  const editor = await openPersonEditor(page);
  const unknown = editor.getByRole('checkbox', { name: '我不知道确切时间', exact: true });
  const time = editor.getByRole('textbox', { name: '出生时间', exact: true });
  const hour = page.getByRole('listbox', { name: '小时', exact: true });
  await unknown.check();
  assert.equal(await time.evaluate((el) => el.disabled), true);
  await unknown.focus();
  await unknown.press('Shift+Tab');
  assert.equal(await time.evaluate((el) => el === document.activeElement), false);
  assert.equal(await unknown.isChecked(), true);
  assert.equal(await time.inputValue(), '');
  assert.equal(await hour.count(), 0);

  await unknown.uncheck();
  assert.equal(await time.isEnabled(), true);
  await time.focus();
  await time.press('Enter');
  await hour.waitFor();
  await hour.press('ArrowDown');
  assert.equal(await time.inputValue(), '13:00');
  await unknown.check();
  assert.equal(await time.evaluate((el) => el.disabled), true);
  assert.equal(await time.inputValue(), '');
  assert.equal(await hour.count(), 0);

  await unknown.uncheck();
  await time.focus();
  await time.press('Enter');
  await hour.waitFor();
  assert.equal(await hour.isVisible(), true);
}));

test('lunar birth date supports keyboard selection, commit, Escape and focus return inside a parent dialog', () => withFixture('?surface=keyboard', async (page) => {
  const trigger = page.getByRole('button', { name: '选择农历日期', exact: true });
  await trigger.focus();
  await trigger.press('Enter');
  await page.getByRole('dialog', { name: '农历出生日期', exact: true }).waitFor();
  const year = page.getByRole('listbox', { name: '农历年份', exact: true });
  assert.equal(await year.evaluate((el) => el === document.activeElement), true);
  await year.press('ArrowDown');
  await year.press('Tab');
  const month = page.getByRole('listbox', { name: '农历月份', exact: true });
  assert.equal(await month.evaluate((el) => el === document.activeElement), true);
  await month.press('Tab');
  await page.getByRole('listbox', { name: '农历日期', exact: true }).press('ArrowDown');
  await page.keyboard.press('Tab');
  await page.getByRole('button', { name: '确定', exact: true }).press('Enter');
  const selected = JSON.parse(await page.getByTestId('lunar-selection').textContent());
  assert.deepEqual(selected, {
    local_date_text: '1988-02-18', lunar_year: '1988', lunar_month: '1', lunar_day: '2', lunar_is_leap_month: 'normal',
  });
  assert.equal(await trigger.evaluate((el) => el === document.activeElement), true);
  await trigger.press('Space');
  await page.getByRole('dialog', { name: '农历出生日期', exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 620 });
  await page.waitForFunction(() => {
    const panel = document.querySelector('.sjp-birth-wheel-panel--lunar');
    return panel && panel.getBoundingClientRect().right <= innerWidth - 8;
  });
  await page.keyboard.press('Escape');
  assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
  assert.equal(await trigger.evaluate((el) => el === document.activeElement), true);
  assert.equal(await page.getByRole('dialog', { name: 'Birth details', exact: true }).isVisible(), true);
}));

test('Settings exposes all saved Plans across periods as a read-only archive', () => withFixture('', async (page) => {
  await page.getByRole('button', { name: '账户菜单', exact: true }).click();
  await page.getByRole('menuitem', { name: '发生过的事', exact: true }).click();
  const archive = page.getByRole('region', { name: '计划档案', exact: true });
  await archive.waitFor();
  assert.deepEqual(await archive.locator('.sjp-record__body').allTextContents(), ['Future intention', 'Current intention', 'Past intention']);
  assert.equal(await archive.getByRole('button').count(), 0);
  assert.equal(await archive.getByRole('textbox').count(), 0);
  assert.equal(await page.evaluate(() => window.auditTest.peek().plan_items.length), 3);
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await page.getByRole('radio', { name: 'English', exact: true }).check();
  await page.getByRole('button', { name: 'Life records', exact: true }).click();
  await page.getByRole('region', { name: 'Plan archive', exact: true }).waitFor();
}));

test('English switches monthly, yearly, relationship and Ziwei UI copy without changing saved natal inputs', () => withFixture('', async (page) => {
  const natal = await page.evaluate(() => window.auditTest.peek().self_subject.natal_inputs);
  await page.getByRole('button', { name: '账户菜单', exact: true }).click();
  await page.getByRole('menuitem', { name: '设置', exact: true }).click();
  await page.getByRole('radio', { name: 'English', exact: true }).check();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  assert.equal(await page.getByRole('combobox', { name: 'Astrology algorithm', exact: true }).textContent(), 'BaZi (Ziping)');
  await page.setViewportSize({ width: 390, height: 620 });
  await page.getByRole('button', { name: 'Monthly Mirror', exact: true }).click();
  const calendar = page.getByRole('grid', { name: '30-day calendar grid', exact: true });
  await calendar.waitFor();
  assert.equal(await calendar.getByRole('gridcell').count(), 30);
  await assertMainFits(page);
  await calendar.getByRole('button', { name: /^2026-10-01/ }).click();
  await page.getByRole('heading', { name: 'Record an intention', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Yearly Mirror', exact: true }).click();
  await page.getByRole('heading', { name: 'Annual rhythm · phase guide', exact: true }).waitFor();
  await assertMainFits(page);
  await page.getByRole('button', { name: 'Relationship Mirror', exact: true }).click();
  await page.getByRole('button', { name: 'Record an experience', exact: true }).waitFor();
  await assertMainFits(page);
  await page.getByRole('button', { name: 'Record an experience', exact: true }).click();
  await page.getByRole('dialog', { name: 'Record an experience', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('combobox', { name: 'Astrology algorithm', exact: true }).click();
  await page.getByRole('option', { name: 'Ziwei (Sanhe)', exact: true }).click();
  await page.getByRole('button', { name: 'Destiny Mirror', exact: true }).click();
  await page.getByRole('heading', { name: 'Palace interpretation', exact: true }).waitFor();
  await page.getByRole('heading', { name: 'My natal chart', exact: true }).waitFor();
  await page.getByText('Self · life direction', { exact: true }).waitFor();
  await assertMainFits(page);
  await page.getByRole('button', { name: 'Consultation Mirror', exact: true }).click();
  await page.locator('.shijing-ask').waitFor();
  await assertMainFits(page);
  assert.deepEqual(await page.evaluate(() => window.auditTest.peek().self_subject.natal_inputs), natal);
  assert.equal(await page.evaluate(() => window.auditTest.peek().settings.ui_language), 'en');
}));
