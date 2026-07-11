import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { _electron as electron } from 'playwright';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(currentDir, '..');
const rendererUrl = 'http://127.0.0.1:1430';
const viteBin = path.join(appRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const electronExecutable = resolveElectronExecutable();
const electronMain = path.join(appRoot, 'dist-electron', 'src-electron', 'main.js');
const evidenceDir = path.resolve(
  process.env.NIMI_ACCEPTANCE_OUTPUT_DIR
    || path.join(appRoot, '.nimi', 'local', 'acceptance', 'shijing-electron'),
);

test('real Electron shell keeps unadmitted ShiJing operations fail-closed', { timeout: 90_000 }, async () => {
  await mkdir(evidenceDir, { recursive: true });
  runRendererPortPreflight();

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
  let electronApp;

  try {
    await waitForUrl(rendererUrl, 30_000);
    electronApp = await electron.launch({
      executablePath: electronExecutable,
      args: [electronMain],
      cwd: appRoot,
      env: process.env,
    });

    const page = await electronApp.firstWindow();
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push({ text: message.text(), location: message.location() });
      }
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.getByTestId('shijing-protected-session-failure').waitFor();
    await assertFailClosedPanel(page);
    await page.getByRole('button', { name: 'EN' }).click();
    await page.getByRole('heading', {
      name: 'ShiJing protected operations are not admitted yet',
    }).waitFor();

    const desktopMetrics = await setContentSizeAndInspect(electronApp, page, 1366, 900);
    assert.equal(desktopMetrics.innerWidth, 1366);
    assert.ok(desktopMetrics.scrollWidth <= desktopMetrics.innerWidth, JSON.stringify(desktopMetrics));
    assert.match(desktopMetrics.bodyText, /ShiJing protected operations are not admitted yet/u);
    await page.screenshot({
      path: path.join(evidenceDir, 'electron-desktop-1366x900.png'),
      fullPage: true,
    });

    await page.getByTestId('shijing-protected-session-retry').click();
    await assertFailClosedPanel(page);

    const bridgeProof = await probeElectronBridge(page);
    assert.equal(bridgeProof.runtime.ok, false, JSON.stringify(bridgeProof.runtime));
    assert.equal(
      bridgeProof.runtime.reasonCode,
      'electron-standard-capability-not-in-host-set',
      JSON.stringify(bridgeProof.runtime),
    );
    assertTypedArtifactFailure(bridgeProof.artifact);

    await page.getByRole('button', { name: '中' }).click();
    await page.getByRole('heading', { name: '时镜受保护操作尚未准入' }).waitFor();
    const narrowMetrics = await setContentSizeAndInspect(electronApp, page, 390, 844);
    assert.equal(narrowMetrics.innerWidth, 390);
    assert.ok(narrowMetrics.scrollWidth <= narrowMetrics.innerWidth, JSON.stringify(narrowMetrics));
    assert.match(narrowMetrics.bodyText, /时镜受保护操作尚未准入/u);
    assert.doesNotMatch(narrowMetrics.bodyText, /�/u);
    await page.screenshot({
      path: path.join(evidenceDir, 'electron-narrow-390x844-zh.png'),
      fullPage: true,
    });

    assert.deepEqual(pageErrors, []);
    assert.deepEqual(consoleErrors, []);
    process.stdout.write(`${JSON.stringify({
      shell: 'electron',
      desktopMetrics,
      narrowMetrics: {
        innerWidth: narrowMetrics.innerWidth,
        innerHeight: narrowMetrics.innerHeight,
        scrollWidth: narrowMetrics.scrollWidth,
      },
      bridgeProof,
      consoleErrors,
      pageErrors,
    }, null, 2)}\n`);
  } catch (error) {
    const logs = rendererLogs.read();
    if (logs) process.stderr.write(`\n[renderer]\n${logs}\n`);
    throw error;
  } finally {
    if (electronApp) await electronApp.close().catch(() => undefined);
    await stopChild(renderer);
  }
});

async function assertFailClosedPanel(page) {
  const panel = page.getByTestId('shijing-protected-session-failure');
  assert.equal(await panel.getAttribute('data-protected-state'), 'capability-unavailable');
  assert.equal(await page.getByTestId('shijing-protected-operations-locked').isDisabled(), true);
  assert.equal(await page.locator('.shijing-shell').count(), 0);
  assert.equal(await page.getByRole('alert').count(), 1);
  assert.match(await panel.innerText(), /shijing-protected-operation-set-not-admitted/u);
}

async function probeElectronBridge(page) {
  return page.evaluate(async () => {
    const hook = globalThis.__NIMI_ELECTRON_RUNTIME__;
    if (!hook || typeof hook.invoke !== 'function') {
      throw new Error('Electron preload bridge is unavailable');
    }
    const probe = async (command, payload) => {
      try {
        return { ok: true, value: await hook.invoke(command, payload) };
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
      artifact: await probe('nimi.shell.artifacts.readRuntimeBytes', {
        payload: { artifactId: 'shijing-electron-acceptance-probe' },
      }),
    };
  });
}

function assertTypedArtifactFailure(result) {
  assert.equal(result.ok, false, JSON.stringify(result));
  assert.ok(new Set([
    'protected-carrier-required',
    'runtime-service-unavailable',
    'runtime-service-untrusted',
    'runtime-service-repair-required',
  ]).has(result.reasonCode), JSON.stringify(result));
}

async function setContentSizeAndInspect(electronApp, page, width, height) {
  let requestedWidth = width;
  let requestedHeight = height;
  let metrics;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await electronApp.evaluate(({ BrowserWindow }, size) => {
      const window = BrowserWindow.getAllWindows()[0];
      if (!window) throw new Error('ShiJing BrowserWindow unavailable');
      window.setContentSize(size.width, size.height);
    }, { width: requestedWidth, height: requestedHeight });
    await page.waitForTimeout(150);
    metrics = await page.evaluate(() => ({
      innerWidth: globalThis.innerWidth,
      innerHeight: globalThis.innerHeight,
      scrollWidth: globalThis.document.documentElement.scrollWidth,
      scrollHeight: globalThis.document.documentElement.scrollHeight,
      bodyText: globalThis.document.body.innerText,
    }));
    if (metrics.innerWidth === width && metrics.innerHeight === height) return metrics;
    requestedWidth += width - metrics.innerWidth;
    requestedHeight += height - metrics.innerHeight;
  }
  return metrics;
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
    if (chunks.length > 200) chunks.shift();
  };
  child.stdout?.on('data', append);
  child.stderr?.on('data', append);
  return { read: () => chunks.join('').trim() };
}

async function waitForUrl(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`renderer responded ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
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
