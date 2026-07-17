import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, utimes, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { chromium } from 'playwright';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(currentDir, '..');
const rendererUrl = 'http://127.0.0.1:1430';
const cdpEndpoint = 'http://127.0.0.1:9225';
const viteBin = path.join(appRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const electronMain = path.join(appRoot, 'dist-electron', 'main.js');
const evidenceDir = path.resolve(
  process.env.NIMI_ACCEPTANCE_OUTPUT_DIR
    || path.join(appRoot, '.nimi', 'local', 'acceptance', 'shijing-electron'),
);

test('real Electron shell keeps unadmitted ShiJing operations fail-closed', {
  timeout: 90_000,
}, async () => {
  await mkdir(evidenceDir, { recursive: true });
  await markProgress('started');
  runRendererPortPreflight();
  await assertCdpPortAvailable();

  const renderer = spawn(process.execPath, [
    viteBin,
    '--host',
    '127.0.0.1',
    '--port',
    '1430',
    '--strictPort',
  ], {
    cwd: appRoot,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const rendererLogs = collectProcessOutput(renderer);
  let electronProcess;
  let electronLogs;
  let browser;

  try {
    await waitForUrl(rendererUrl, 30_000);
    await markProgress('renderer-ready');
    electronProcess = spawn(resolveElectronExecutable(), [
      electronMain,
      `--nimi-dev-renderer-url=${rendererUrl}`,
    ], {
      cwd: appRoot,
      env: {
        ...process.env,
        NIMI_SHIJING_ELECTRON_ACCEPTANCE_CDP_PORT: '9225',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    electronLogs = collectProcessOutput(electronProcess);
    await markProgress('electron-spawned', { pid: electronProcess.pid });
    await waitForUrl(`${cdpEndpoint}/json/version`, 30_000);
    browser = await chromium.connectOverCDP(cdpEndpoint);
    const page = await waitForElectronPage(browser, 30_000);
    await markProgress('first-window', { url: page.url() });

    const consoleEvents = [];
    const pageErrors = [];
    page.on('console', (message) => {
      consoleEvents.push({
        type: message.type(),
        text: message.text(),
        location: message.location(),
      });
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.getByTestId('shijing-protected-session-failure').waitFor();
    await assertFailClosedPanel(page);
    await page.getByRole('button', { name: 'EN' }).click();
    await page.getByRole('heading', {
      name: 'ShiJing must be launched by Nimi Desktop',
    }).waitFor();

    const desktopMetrics = await setViewportAndInspect(page, 1366, 900);
    assert.equal(desktopMetrics.innerWidth, 1366);
    assert.ok(desktopMetrics.scrollWidth <= desktopMetrics.innerWidth, JSON.stringify(desktopMetrics));
    assert.match(desktopMetrics.bodyText, /ShiJing must be launched by Nimi Desktop/u);
    await page.screenshot({
      path: path.join(evidenceDir, 'electron-desktop-1366x900.png'),
      fullPage: true,
    });

    const hmrEvidence = await verifyRendererHmr(page, consoleEvents);
    await page.getByTestId('shijing-protected-session-retry').click();
    await assertFailClosedPanel(page);

    const bridgeProof = await probeElectronBridge(page);
    assert.equal(bridgeProof.runtime.ok, false, JSON.stringify(bridgeProof.runtime));
    assert.equal(
      bridgeProof.runtime.reasonCode,
      'electron-standard-capability-not-in-host-set',
      JSON.stringify(bridgeProof.runtime),
    );
    assertTypedLocalFailure(bridgeProof.session);
    assertTypedLocalFailure(bridgeProof.storage);

    await page.getByRole('button', { name: '中' }).click();
    await page.getByRole('heading', { name: '时镜需要由 Nimi Desktop 启动' }).waitFor();
    const narrowMetrics = await setViewportAndInspect(page, 390, 844);
    assert.equal(narrowMetrics.innerWidth, 390);
    assert.ok(narrowMetrics.scrollWidth <= narrowMetrics.innerWidth, JSON.stringify(narrowMetrics));
    assert.match(narrowMetrics.bodyText, /时镜需要由 Nimi Desktop 启动/u);
    assert.doesNotMatch(narrowMetrics.bodyText, /�/u);
    await page.screenshot({
      path: path.join(evidenceDir, 'electron-narrow-390x844-zh.png'),
      fullPage: true,
    });

    assert.deepEqual(pageErrors, []);
    assert.deepEqual(consoleEvents.filter((event) => event.type === 'error'), []);
    const evidence = {
      shell: 'electron',
      mode: 'plain-negative',
      desktopMetrics,
      narrowMetrics: {
        innerWidth: narrowMetrics.innerWidth,
        innerHeight: narrowMetrics.innerHeight,
        scrollWidth: narrowMetrics.scrollWidth,
      },
      bridgeProof,
      hmrEvidence,
      consoleEvents,
      pageErrors,
      processLogs: electronLogs.read(),
    };
    await writeFile(
      path.join(evidenceDir, 'electron-evidence.json'),
      `${JSON.stringify(evidence, null, 2)}\n`,
      'utf8',
    );
    process.stdout.write(`${JSON.stringify({
      shell: evidence.shell,
      mode: evidence.mode,
      desktop: `${desktopMetrics.innerWidth}x${desktopMetrics.innerHeight}`,
      narrow: `${narrowMetrics.innerWidth}x${narrowMetrics.innerHeight}`,
      hmr: hmrEvidence.event.text,
      runtimeReason: bridgeProof.runtime.reasonCode,
      sessionReason: bridgeProof.session.reasonCode,
      storageReason: bridgeProof.storage.reasonCode,
      consoleErrors: 0,
      pageErrors: 0,
    }, null, 2)}\n`);
  } catch (error) {
    const logs = rendererLogs.read();
    if (logs) process.stderr.write(`\n[renderer]\n${logs}\n`);
    const hostLogs = electronLogs?.read();
    if (hostLogs) process.stderr.write(`\n[electron]\n${hostLogs}\n`);
    throw error;
  } finally {
    if (browser) await browser.close().catch(() => undefined);
    stopProcessTree(electronProcess);
    await stopChild(renderer);
  }
});

async function markProgress(step, detail = {}) {
  await writeFile(
    path.join(evidenceDir, 'electron-acceptance-progress.json'),
    `${JSON.stringify({ step, at: new Date().toISOString(), detail }, null, 2)}\n`,
    'utf8',
  );
}

async function assertFailClosedPanel(page) {
  const panel = page.getByTestId('shijing-protected-session-failure');
  await page.waitForTimeout(500);
  const state = await panel.getAttribute('data-protected-state');
  assert.ok(
    new Set(['capability-unavailable', 'repair-required', 'runtime-unavailable']).has(state),
    `unexpected protected state: ${state}`,
  );
  assert.equal(await page.getByTestId('shijing-protected-operations-locked').isDisabled(), true);
  assert.equal(await page.locator('.shijing-shell').count(), 0);
  assert.equal(await page.getByRole('alert').count(), 1);
  assert.match(
    await panel.innerText(),
    /protected-carrier|runtime-service|shijing-protected-operation-set-not-admitted/u,
  );
}

async function probeElectronBridge(page) {
  return page.evaluate(async () => {
    const hook = globalThis.__NIMI_ELECTRON_RUNTIME__;
    if (!hook || typeof hook.invoke !== 'function') {
      throw new Error('Electron preload bridge is unavailable');
    }
    const probe = async (command, payload) => {
      try {
        const value = await Promise.race([
          hook.invoke(command, payload),
          new Promise((_, reject) => setTimeout(() => reject(Object.assign(
            new Error(`Timed out probing ${command}`),
            { reasonCode: 'runtime-service-unavailable' },
          )), 5_000)),
        ]);
        return { ok: true, value };
      } catch (error) {
        const record = error && typeof error === 'object' ? error : {};
        return {
          ok: false,
          code: typeof record.code === 'string' ? record.code : '',
          reasonCode: typeof record.reasonCode === 'string' ? record.reasonCode : '',
          actionHint: typeof record.actionHint === 'string' ? record.actionHint : '',
          message: typeof record.message === 'string' ? record.message : String(error),
        };
      }
    };
    return {
      runtime: await probe('nimi.shell.runtime.unary', {
        payload: {
          service: 'nimi.runtime.v1.RuntimeAccountService',
          method: 'GetAccountSessionStatus',
          request: {},
        },
      }),
      session: await probe('nimi.shell.localApp.sessionStatus', {}),
      storage: await probe('nimi.shell.storage.writeJson', {
        payload: {
          relativePath: 'launch-migration/direct-shell-negative.json',
          value: { source: 'direct-electron-negative-acceptance' },
        },
      }),
    };
  });
}

function assertTypedLocalFailure(result) {
  assert.equal(result.ok, false, JSON.stringify(result));
  assert.ok(new Set([
    'protected-carrier-required',
    'runtime-service-unavailable',
    'runtime-service-untrusted',
    'runtime-service-repair-required',
  ]).has(result.reasonCode), JSON.stringify(result));
}

async function setViewportAndInspect(page, width, height) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(150);
  return page.evaluate(() => ({
    innerWidth: globalThis.innerWidth,
    innerHeight: globalThis.innerHeight,
    scrollWidth: globalThis.document.documentElement.scrollWidth,
    scrollHeight: globalThis.document.documentElement.scrollHeight,
    bodyText: globalThis.document.body.innerText,
  }));
}

async function verifyRendererHmr(page, consoleEvents) {
  const baseline = consoleEvents.length;
  const probePath = path.join(appRoot, 'src', 'shell', 'App.tsx');
  const now = new Date();
  await utimes(probePath, now, now);
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const event = consoleEvents.slice(baseline).find((entry) => /hot updated|hmr update/iu.test(entry.text));
    if (event) {
      await page.getByTestId('shijing-protected-session-failure').waitFor();
      return { probePath, event };
    }
    await page.waitForTimeout(100);
  }
  throw new Error(`Renderer HMR did not emit an update for ${probePath}`);
}

function resolveElectronExecutable() {
  const result = spawnSync(process.execPath, ['-e', "process.stdout.write(require('electron'))"], {
    cwd: appRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0 || !result.stdout.trim()) {
    throw new Error(`Electron executable unavailable: ${result.stderr || result.status}`);
  }
  return result.stdout.trim();
}

function runRendererPortPreflight() {
  const result = spawnSync(process.execPath, ['scripts/ensure-dev-renderer-port.mjs'], {
    cwd: appRoot,
    env: process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'renderer port preflight failed');
  }
}

function collectProcessOutput(child) {
  const chunks = [];
  const append = (chunk) => {
    chunks.push(String(chunk));
    if (chunks.length > 300) chunks.shift();
  };
  child.stdout?.on('data', append);
  child.stderr?.on('data', append);
  return { read: () => chunks.join('').trim() };
}

async function waitForElectronPage(browser, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const context of browser.contexts()) {
      const page = context.pages().find((candidate) => candidate.url().startsWith(rendererUrl));
      if (page) return page;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Electron page did not appear at ${rendererUrl}`);
}

async function assertCdpPortAvailable() {
  try {
    const response = await fetch(`${cdpEndpoint}/json/version`, { signal: AbortSignal.timeout(500) });
    if (response.ok) throw new Error('Electron CDP port 9225 is already in use');
  } catch (error) {
    if (error instanceof Error && error.message.includes('already in use')) throw error;
  }
}

async function waitForUrl(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`endpoint responded ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

function stopProcessTree(child) {
  if (!child || child.exitCode !== null || !child.pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }
  child.kill('SIGKILL');
}

async function stopChild(child) {
  if (!child || child.exitCode !== null || !child.pid) return;
  child.kill('SIGTERM');
  const exited = await Promise.race([
    new Promise((resolve) => child.once('exit', () => resolve(true))),
    new Promise((resolve) => setTimeout(() => resolve(false), 2_000)),
  ]);
  if (!exited && child.exitCode === null) child.kill('SIGKILL');
}
