import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

test('ShiJing renderer contains no login, logout, OAuth, or account-control surface', () => {
  const sessionBoundarySource = readFileSync(
    new URL('../src/shell/app-shell/protected-session-boundary.tsx', import.meta.url),
    'utf8',
  );

  assert.equal(existsSync(new URL('../src/shell/features/auth/shijing-login-page.tsx', import.meta.url)), false);
  assert.equal(existsSync(new URL('../src/shell/features/auth/shijing-auth-adapter.ts', import.meta.url)), false);
  assert.doesNotMatch(sessionBoundarySource, /logout|OAuth|beginLogin|completeLogin/i);
  assert.match(sessionBoundarySource, /protectedSession/);
});
