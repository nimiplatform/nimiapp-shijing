import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyShijingRuntimeAccessFailure,
  shijingRuntimeAccessFromSession,
} from '../src/shell/app-shell/runtime-access-state.ts';

test('non-bound session projections classify into App Access posture states', () => {
  const fixtures = [
    ['action-required', 'action-required'],
    ['revoked', 'access-ended'],
    ['account-changed', 'access-ended'],
    ['project-changed', 'access-ended'],
    ['process-replaced', 'runtime-unavailable'],
    ['runtime-restarted', 'runtime-unavailable'],
    ['unavailable', 'runtime-unavailable'],
  ];

  for (const [sessionState, state] of fixtures) {
    const failure = shijingRuntimeAccessFromSession({
      state: sessionState,
      reasonCode: '',
      actionHint: '',
      retryable: true,
    });
    assert.equal(failure.state, state);
  }
});

test('session projection evidence is carried through verbatim', () => {
  const failure = shijingRuntimeAccessFromSession({
    state: 'action-required',
    reasonCode: 'account-authentication-required',
    actionHint: 'sign_in_with_nimi_desktop',
    retryable: true,
  });

  assert.deepEqual(failure, {
    state: 'action-required',
    reasonCode: 'account-authentication-required',
    actionHint: 'sign_in_with_nimi_desktop',
    message: 'Nimi access session state is action-required.',
    retryable: true,
  });
});

test('runtime access classifier maps authentication and transport failures', () => {
  assert.equal(
    classifyShijingRuntimeAccessFailure({ reasonCode: 'account-authentication-required' }).state,
    'action-required',
  );
  assert.equal(
    classifyShijingRuntimeAccessFailure({ reasonCode: 'runtime-service-unavailable' }).state,
    'runtime-unavailable',
  );
  assert.equal(
    classifyShijingRuntimeAccessFailure({ reasonCode: 'electron-runtime-bridge-unavailable' }).state,
    'runtime-unavailable',
  );
});

test('runtime access classifier preserves typed embedded failures', () => {
  const embedded = JSON.stringify({
    reasonCode: 'runtime-service-unavailable',
    actionHint: 'start_runtime_from_nimi_desktop',
  });
  const result = classifyShijingRuntimeAccessFailure(new Error(embedded));

  assert.deepEqual(result, {
    state: 'runtime-unavailable',
    reasonCode: 'runtime-service-unavailable',
    actionHint: 'start_runtime_from_nimi_desktop',
    message: embedded,
    retryable: true,
  });
});

test('unknown failures remain fail-closed with stable same-host recovery guidance', () => {
  const result = classifyShijingRuntimeAccessFailure(new Error('unknown failure'));

  assert.equal(result.state, 'capability-unavailable');
  assert.equal(result.reasonCode, 'shijing-runtime-access-unavailable');
  assert.equal(result.actionHint, 'retry_same_host');
  assert.equal(result.message, 'unknown failure');
  assert.equal(result.retryable, false);
});
