import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHIJING_APP_ID } from '../src/contracts/app-identity.ts';

export const DEFAULT_SHIJING_RUNTIME_ENDPOINT = '127.0.0.1:46371';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(currentDir, '..');

export function resolveShijingRuntimeEndpoint(...envKeys) {
  for (const key of envKeys) {
    const value = String(process.env[key] || '').trim();
    if (value) return value;
  }
  return DEFAULT_SHIJING_RUNTIME_ENDPOINT;
}

export function resolveShijingDevStorageRoots(input) {
  const sessionKind = normalizeSessionKind(input.sessionKind);
  const appIdSegment = SHIJING_APP_ID.replace(/[^a-z0-9._-]/giu, '_');
  const baseRoot = String(process.env.NIMI_SHIJING_DEV_STORAGE_ROOT || '').trim()
    || path.join(appRoot, '.local', 'installed-app-host', appIdSegment, sessionKind);
  const roots = {
    dataRoot: path.join(baseRoot, 'data'),
    cacheRoot: path.join(baseRoot, 'cache'),
    tempRoot: path.join(baseRoot, 'temp'),
  };
  for (const root of Object.values(roots)) {
    mkdirSync(root, { recursive: true });
  }
  return roots;
}

function normalizeSessionKind(value) {
  const normalized = String(value || '').trim();
  if (!/^[a-z0-9-]+$/u.test(normalized)) {
    throw new Error(`ShiJing Runtime session kind is invalid: ${normalized || '(empty)'}`);
  }
  return normalized;
}
