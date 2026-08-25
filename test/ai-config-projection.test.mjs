import assert from 'node:assert/strict';
import test from 'node:test';

import {
  projectShijingAIConfig,
} from '../src/shell/ai/shijing-ai-config.ts';

function localSnapshot({
  selectedLoadoutRef = 'shijing-text',
  state = 'ready',
} = {}) {
  return {
    config: {
      owner: { owner: { oneofKind: 'app', app: { appId: 'nimi.shijing' } } },
      capabilities: [{
        capabilityContract: 'text.generate',
        requiredFeatures: [],
        route: { oneofKind: 'local', local: {} },
      }],
    },
    revision: '1',
    effectiveSelections: [{
      capabilityContract: 'text.generate',
      state,
      resource: state === 'ready' ? {
        oneofKind: 'local',
        local: {
          loadoutRef: selectedLoadoutRef,
          label: 'ShiJing text',
          capabilityContract: 'text.generate',
          implementation: { implementationId: 'text', driverId: 'local', driverDialect: 'test/local/v1' },
          supportedFeatures: [],
          state: 'ready',
          reasons: [],
        },
      } : null,
      reasons: state === 'ready' ? [] : ['AI_LOADOUT_NOT_READY'],
    }],
  };
}

test('ShiJing reports canonical App AIConfig absence', () => {
  assert.deepEqual(projectShijingAIConfig({
    config: null,
    revision: '0',
    effectiveSelections: [],
  }), { state: 'not-configured' });
});

test('ShiJing reports the Runtime-selected ready App-local resource', () => {
  assert.deepEqual(projectShijingAIConfig(localSnapshot()), {
    state: 'ready',
    route: 'local',
  });
});

test('ShiJing keeps blocked and stale effective facts non-ready', () => {
  assert.deepEqual(projectShijingAIConfig(localSnapshot({ state: 'blocked' })), {
    state: 'blocked',
    reasonCode: 'AI_LOADOUT_NOT_READY',
  });
  assert.deepEqual(projectShijingAIConfig(localSnapshot({ selectedLoadoutRef: 'other-loadout' })), {
    state: 'ready',
    route: 'local',
  });
});
