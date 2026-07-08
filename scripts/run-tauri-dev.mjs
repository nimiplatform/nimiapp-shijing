import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolveShijingRuntimeAppStorageRoots,
  resolveShijingRuntimeEndpoint,
} from './runtime-app-storage-projection.mjs';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(currentDir, '..');
const runtimeEndpoint = resolveShijingRuntimeEndpoint(
  'NIMI_RUNTIME_GRPC_ADDR',
  'NIMI_SHIJING_TAURI_RUNTIME_ENDPOINT',
);
const tauriBin = path.join(appRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'tauri.cmd' : 'tauri');
const children = new Set();
const SIGNAL_EXIT_CODES = new Map([
  ['SIGINT', 130],
  ['SIGTERM', 143],
]);

for (const signal of SIGNAL_EXIT_CODES.keys()) {
  process.on(signal, () => shutdownFromSignal(signal));
}

try {
  ensureRendererPortAvailable();
  const storageRoots = await resolveShijingRuntimeAppStorageRoots({
    runtimeEndpoint,
    label: 'ShiJing Tauri dev',
    sessionKind: 'tauri-dev',
    errorPrefix: '[run-tauri-dev]',
  });
  const tauri = spawnTracked(tauriBin, ['dev'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NIMI_RUNTIME_GRPC_ADDR: runtimeEndpoint,
      NIMI_APP_DURABLE_DATA_ROOT: storageRoots.dataRoot,
      NIMI_APP_CACHE_ROOT: storageRoots.cacheRoot,
      NIMI_APP_TEMP_ROOT: storageRoots.tempRoot,
      NIMI_SHIJING_TAURI_DURABLE_DATA_ROOT: storageRoots.dataRoot,
      NIMI_SHIJING_TAURI_CACHE_ROOT: storageRoots.cacheRoot,
      NIMI_SHIJING_TAURI_TEMP_ROOT: storageRoots.tempRoot,
    },
  });
  const exitCode = await waitForExit(tauri);
  await requestAllChildrenShutdown('SIGTERM');
  process.exit(exitCode ?? 0);
} catch (error) {
  await requestAllChildrenShutdown('SIGTERM');
  console.error(error instanceof Error ? error.message : String(error || 'Tauri dev failed'));
  process.exit(1);
}

function ensureRendererPortAvailable() {
  const result = spawnSync(process.execPath, ['scripts/ensure-dev-renderer-port.mjs'], {
    cwd: appRoot,
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) {
    throw new Error(`[run-tauri-dev] failed to start renderer port preflight: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`[run-tauri-dev] renderer port preflight failed with status ${result.status ?? 'unknown'}`);
  }
}

function spawnTracked(command, args, options) {
  const child = spawn(command, args, {
    ...options,
    cwd: appRoot,
  });
  children.add(child);
  child.once('exit', () => {
    children.delete(child);
  });
  return child;
}

async function shutdownFromSignal(signal) {
  await requestAllChildrenShutdown(signal);
  process.exit(SIGNAL_EXIT_CODES.get(signal) ?? 1);
}

async function requestAllChildrenShutdown(signal) {
  await Promise.all([...children].map((child) => requestProcessTreeShutdown(child, signal)));
}

async function requestProcessTreeShutdown(child, signal) {
  if (!child?.pid || child.exitCode !== null) {
    return;
  }
  if (process.platform === 'win32') {
    spawn('taskkill.exe', ['/pid', String(child.pid), '/t'], { stdio: 'ignore' });
  } else {
    child.kill(signal);
  }
  const stopped = await waitForExitOrTimeout(child, 2_000);
  if (!stopped) {
    forceKillProcessTree(child);
    await waitForExitOrTimeout(child, 1_000);
  }
}

function forceKillProcessTree(child) {
  if (!child?.pid || child.exitCode !== null) {
    return;
  }
  if (process.platform === 'win32') {
    spawn('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
    return;
  }
  child.kill('SIGKILL');
}

function waitForExit(child) {
  return new Promise((resolve) => {
    child.on('exit', (code) => resolve(code));
  });
}

function waitForExitOrTimeout(child, timeoutMs) {
  if (child.exitCode !== null) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);
    const onExit = () => {
      cleanup();
      resolve(true);
    };
    const cleanup = () => {
      clearTimeout(timeout);
      child.off('exit', onExit);
    };
    child.once('exit', onExit);
  });
}
