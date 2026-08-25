import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  projectShijingAIConfig,
  shouldApplyShijingAIConfigRefresh,
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

test('ShiJing restores effective facts only for the acknowledged AIConfig revision', () => {
  assert.equal(shouldApplyShijingAIConfigRefresh('2', '2', '2'), true);
  assert.equal(shouldApplyShijingAIConfigRefresh('3', '2', '2'), false);
  assert.equal(shouldApplyShijingAIConfigRefresh('2', '1', '2'), false);
  assert.equal(shouldApplyShijingAIConfigRefresh(null, '2', '2'), false);
});

test('ShiJing mounts its covered self-owner AIConfig editor without a Desktop write bridge', async () => {
  const source = await readFile(new URL(
    '../src/shell/local-development/shijing-local-development-status.tsx',
    import.meta.url,
  ), 'utf8');
  assert.match(source, /ModelConfigAIConfigSurface/u);
  assert.match(source, /shijingLocalAppRuntimePlatform\.aiConfig\.overwrite/u);
  assert.match(source, /shijingLocalAppRuntimePlatform\.aiConfig\.listOptions/u);
  assert.match(
    source,
    /applyAIConfigSnapshot\(acknowledgedSnapshot\)[\s\S]*refreshAIConfigEffectiveSelections\(result\.revision\)/u,
  );
  assert.match(source, /capabilityContracts=\{\['text\.generate'\]\}/u);
  assert.doesNotMatch(source, /loadoutRef/u);
});
