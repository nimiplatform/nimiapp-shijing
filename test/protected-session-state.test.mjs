import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyShijingProtectedSessionFailure,
} from '../src/shell/app-shell/protected-session-state.ts';

test('protected session failures classify every admitted recovery state', () => {
  const fixtures = [
    ['account-authentication-required', 'login-required'],
    ['runtime-service-unavailable', 'runtime-unavailable'],
    ['installed-app-permission-denied', 'permission-denied'],
    ['runtime-service-untrusted', 'repair-required'],
    ['shijing-protected-operation-set-not-admitted', 'capability-unavailable'],
  ];

  for (const [reasonCode, state] of fixtures) {
    assert.equal(classifyShijingProtectedSessionFailure({ reasonCode }).state, state);
  }
});

test('protected session classifier preserves typed embedded native failures', () => {
  const result = classifyShijingProtectedSessionFailure(
    new Error(JSON.stringify({
      reasonCode: 'protected-carrier-required',
      actionHint: 'repair_verified_installation',
    })),
  );

  assert.deepEqual(result, {
    state: 'repair-required',
    reasonCode: 'protected-carrier-required',
    actionHint: 'repair_verified_installation',
    message: JSON.stringify({
      reasonCode: 'protected-carrier-required',
      actionHint: 'repair_verified_installation',
    }),
  });
});

test('unknown failures remain fail-closed with stable recovery guidance', () => {
  const result = classifyShijingProtectedSessionFailure(new Error('unknown failure'));

  assert.equal(result.state, 'capability-unavailable');
  assert.equal(result.reasonCode, 'shijing-protected-operation-set-not-admitted');
  assert.equal(result.actionHint, 'wait_for_shijing_protected_operation_admission');
  assert.equal(result.message, 'unknown failure');
});
