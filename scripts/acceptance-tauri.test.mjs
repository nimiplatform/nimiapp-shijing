import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { chromium } from 'playwright';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(currentDir, '..');
const tauriCli = path.join(appRoot, 'node_modules', '@tauri-apps', 'cli', 'tauri.js');
const rendererUrl = 'http://127.0.0.1:1430';
const cdpEndpoint = 'http://127.0.0.1:9224';
const evidenceDir = path.resolve(
  process.env.NIMI_ACCEPTANCE_OUTPUT_DIR
    || path.join(appRoot, '.nimi', 'local', 'acceptance', 'shijing-tauri'),
);

test('real Tauri WebView2 shell matches the ShiJing installed fail-close posture', {
  timeout: 180_000,
  skip: process.platform !== 'win32',
}, async () => {
  await mkdir(evidenceDir, { recursive: true });
  runRendererPortPreflight();
  await assertCdpPortAvailable();

  const tauri = spawn(process.execPath, [
    tauriCli,
    'dev',
    '--config',
    'src-tauri/tauri.conf.json',
    '--no-watch',
  ], {
    cwd: appRoot,
    env: {
      ...process.env,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: '--remote-debugging-port=9224',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const tauriLogs = collectProcessOutput(tauri);
  let browser;

  try {
    await waitForUrl(`${cdpEndpoint}/json/version`, 120_000);
    browser = await chromium.connectOverCDP(cdpEndpoint);
    const page = await waitForTauriPage(browser, 30_000);
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

    const desktopMetrics = await setViewportAndInspect(page, 1366, 900);
    assert.equal(desktopMetrics.innerWidth, 1366);
    assert.ok(desktopMetrics.scrollWidth <= desktopMetrics.innerWidth, JSON.stringify(desktopMetrics));
    assert.match(desktopMetrics.bodyText, /ShiJing protected operations are not admitted yet/u);
    await page.screenshot({
      path: path.join(evidenceDir, 'tauri-desktop-1366x900.png'),
      fullPage: true,
    });

    const bridgeProof = await probeTauriBridge(page);
    assert.equal(bridgeProof.runtime.ok, false, JSON.stringify(bridgeProof.runtime));
    assert.match(
      `${bridgeProof.runtime.reasonCode} ${bridgeProof.runtime.message}`,
      /runtime_bridge_unary|not found|unknown|unregistered|not allowed/iu,
    );
    assertTypedArtifactFailure(bridgeProof.artifact);

    await page.getByTestId('shijing-protected-session-retry').click();
    await assertFailClosedPanel(page);
    await page.getByRole('button', { name: '中' }).click();
    await page.getByRole('heading', { name: '时镜受保护操作尚未准入' }).waitFor();
    const narrowMetrics = await setViewportAndInspect(page, 390, 844);
    assert.equal(narrowMetrics.innerWidth, 390);
    assert.ok(narrowMetrics.scrollWidth <= narrowMetrics.innerWidth, JSON.stringify(narrowMetrics));
    assert.match(narrowMetrics.bodyText, /时镜受保护操作尚未准入/u);
    assert.doesNotMatch(narrowMetrics.bodyText, /�/u);
    await page.screenshot({
      path: path.join(evidenceDir, 'tauri-narrow-390x844-zh.png'),
      fullPage: true,
    });

    assert.deepEqual(pageErrors, []);
    assert.deepEqual(consoleErrors, []);
    process.stdout.write(`${JSON.stringify({
      shell: 'tauri-webview2',
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
    const logs = tauriLogs.read();
    if (logs) process.stderr.write(`\n[tauri]\n${logs}\n`);
    throw error;
  } finally {
    if (browser) await browser.close().catch(() => undefined);
    await stopProcessTree(tauri);
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

async function probeTauriBridge(page) {
  return page.evaluate(async () => {
    const hook = globalThis.__NIMI_TAURI_RUNTIME__;
    if (!hook || typeof hook.invoke !== 'function') {
      throw new Error('Tauri renderer bridge is unavailable');
    }
    const probe = async (command, payload) => {
      try {
        return { ok: true, value: await hook.invoke(command, payload) };
      } catch (error) {
        let record = error && typeof error === 'object' ? error : {};
        const message = typeof record.message === 'string' ? record.message : String(error);
        try {
          const parsed = JSON.parse(message);
          if (parsed && typeof parsed === 'object') record = parsed;
        } catch {
          // Missing-command failures are intentionally plain strings.
        }
        const envelope = record.envelope && typeof record.envelope === 'object' ? record.envelope : {};
        return {
          ok: false,
          code: typeof record.code === 'string' ? record.code : typeof envelope.code === 'string' ? envelope.code : '',
          reasonCode: typeof record.reasonCode === 'string'
            ? record.reasonCode
            : typeof envelope.reasonCode === 'string' ? envelope.reasonCode : '',
          actionHint: typeof record.actionHint === 'string'
            ? record.actionHint
            : typeof envelope.actionHint === 'string' ? envelope.actionHint : '',
          message,
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
        payload: { artifactId: 'shijing-tauri-acceptance-probe' },
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

async function waitForTauriPage(browser, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const context of browser.contexts()) {
      const page = context.pages().find((candidate) => candidate.url().startsWith(rendererUrl));
      if (page) return page;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Tauri WebView2 page did not appear at ${rendererUrl}`);
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

async function assertCdpPortAvailable() {
  try {
    const response = await fetch(`${cdpEndpoint}/json/version`, { signal: AbortSignal.timeout(500) });
    if (response.ok) throw new Error('WebView2 CDP port 9224 is already in use');
  } catch (error) {
    if (error instanceof Error && error.message.includes('already in use')) throw error;
  }
}

function collectProcessOutput(child) {
  const chunks = [];
  const append = (chunk) => {
    chunks.push(String(chunk));
    if (chunks.length > 400) chunks.shift();
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
      lastError = new Error(`endpoint responded ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

async function stopProcessTree(child) {
  if (!child || child.exitCode !== null || !child.pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }
  child.kill('SIGTERM');
  const exited = await Promise.race([
    new Promise((resolve) => child.once('exit', () => resolve(true))),
    new Promise((resolve) => setTimeout(() => resolve(false), 2_000)),
  ]);
  if (!exited && child.exitCode === null) child.kill('SIGKILL');
}
