// ShiJing Runtime AIConfig binding and bridge tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEmptyNimiAIConfig,
  createNimiAppAIScopeRef,
  encodeNimiAIScopeRef,
} from '@nimiplatform/sdk/ai';
import {
  createShijingRuntimeAiClient,
  resolveShijingTextGenerateBinding,
} from '../src/shell/ai/shijing-runtime-ai-client.ts';
import {
  createShijingConversationChatBridge,
} from '../src/shell/ai/shijing-conversation-chat-bridge.ts';
import {
  SHIJING_AI_CONFIG_INDEX_KEY,
  SHIJING_AI_CONFIG_QUARANTINE_PREFIX,
  SHIJING_AI_CONFIG_STORAGE_PREFIX,
  createShijingReadingAIScopeRef,
  loadShijingAIConfig,
  repairShijingAIConfigStorageForScope,
  saveShijingAIConfig,
} from '../src/shell/ai/shijing-ai-config.ts';
import {
  ensureShijingReadingAIConfigFromFirstLaunchProfile,
} from '../src/shell/ai/shijing-ai-config-bootstrap.ts';
import { validReading, validRijingOutput } from './_fixtures.mjs';

function runtimeScenarioTextOutput(text, { modelResolved = 'local/test-text-model', routeDecision = 1 } = {}) {
  return {
    output: {
      output: {
        oneofKind: 'textGenerate',
        textGenerate: { text },
      },
    },
    finishReason: 1,
    usage: {},
    traceId: 'trace:shijing-test',
    modelResolved,
    routeDecision,
    ignoredExtensions: [],
  };
}

function createScenarioRuntime({ executeScenario, peekScheduling }) {
  return {
    ai: {
      executeScenario,
      streamScenario: async function* streamScenario() {
        throw new Error('streamScenario is not used by ShiJing Runtime AI tests');
      },
    },
    generated: {
      peekScheduling: peekScheduling ?? (async () => ({
        aggregateJudgement: {
          state: 1,
          detail: '',
          resourceWarnings: [],
        },
        targetJudgements: [],
      })),
    },
  };
}

function minimalPromptRequest() {
  return {
    mirror_kind: 'rijing',
    system_prompt: 'system contract',
    user_prompt: 'user contract',
    schema_name: 'shijing.runtime_ai_wording_patch.rijing.v1',
    deterministic_output: validRijingOutput(),
  };
}

function rijingPatch(overrides = {}) {
  return {
    patch_kind: 'shijing.runtime_ai_wording_patch.v1',
    mirror_kind: 'rijing',
    summary: 'Runtime refined day.',
    daily_overview: 'Runtime refined overview.',
    concern_projections: [
      {
        concern_tag_ref: 'tag_love',
        summary: 'Runtime refined connection.',
        recommendations: ['Runtime recommendation.'],
      },
    ],
    ...overrides,
  };
}

function emptyAIConfig() {
  return {
    scopeRef: createShijingReadingAIScopeRef(),
    capabilities: {
      targetRefs: {},
      selectedParams: {},
    },
    profileOrigin: null,
  };
}

function createMemoryStorage() {
  const items = new Map();
  return {
    getItem(key) {
      return items.has(key) ? items.get(key) : null;
    },
    setItem(key, value) {
      items.set(key, String(value));
    },
    removeItem(key) {
      items.delete(key);
    },
  };
}

function readyAIProfile() {
  return {
    profileId: 'profile-shijing-ready',
    title: 'ShiJing Ready Profile',
    capabilities: {
      'text.generate': {
        targetRef: {
          kind: 'local-runtime',
          version: 'v2',
          readinessRef: 'execution_evidence_ready',
        },
        params: {
          temperature: 0.2,
          topP: 0.9,
        },
        runtimeDescriptor: {
          executionMode: 'local',
          execution: { backend: 'runtime' },
          model: { family: 'shijing-test' },
        },
      },
    },
  };
}

function setupRequiredAIProfile() {
  return {
    profileId: 'profile-shijing-setup-required',
    title: 'ShiJing Setup Required Profile',
    capabilities: {
      'text.generate': {
        readinessPolicy: 'required',
      },
    },
  };
}

test('resolveShijingTextGenerateBinding fails closed when AIConfig has no text.generate targetRef', () => {
  const resolved = resolveShijingTextGenerateBinding(emptyAIConfig());
  assert.equal(resolved.ok, false);
  if (!resolved.ok) {
    assert.match(resolved.detail, /text\.generate/);
    assert.match(resolved.detail, /failed closed/);
  }
});

test('ShiJing AIConfig store keys persisted configs by scope', () => {
  const readingScope = createShijingReadingAIScopeRef();
  const otherScope = createNimiAppAIScopeRef('shijing', 'shijing.other');
  assert.notEqual(encodeNimiAIScopeRef(readingScope), encodeNimiAIScopeRef(otherScope));
  assert.match(SHIJING_AI_CONFIG_STORAGE_PREFIX, /v2$/);
  assert.equal(SHIJING_AI_CONFIG_INDEX_KEY, `${SHIJING_AI_CONFIG_STORAGE_PREFIX}:index`);

  saveShijingAIConfig(createEmptyNimiAIConfig(otherScope), otherScope);
  const loaded = loadShijingAIConfig(readingScope);

  assert.deepEqual(loaded, createEmptyNimiAIConfig(readingScope));
});

test('ShiJing AIConfig repair quarantines retired persisted target refs before SDK load', () => {
  const storage = createMemoryStorage();
  const scopeRef = createShijingReadingAIScopeRef();
  const scopeKey = encodeNimiAIScopeRef(scopeRef);
  const storageKey = `${SHIJING_AI_CONFIG_STORAGE_PREFIX}:${scopeKey}`;
  const raw = JSON.stringify({
    scopeRef,
    capabilities: {
      targetRefs: {
        'text.generate': {
          kind: 'local-runtime',
          targetId: 'local-qwen',
          profileId: 'runtime-baseline:ready',
        },
      },
      selectedParams: {},
    },
    profileOrigin: null,
  });
  storage.setItem(SHIJING_AI_CONFIG_INDEX_KEY, JSON.stringify([scopeKey]));
  storage.setItem(storageKey, raw);

  const result = repairShijingAIConfigStorageForScope(scopeRef, storage, {
    now: () => '2026-06-26T00:00:00.000Z',
  });

  assert.equal(result.scanned, 1);
  assert.equal(result.quarantined, 1);
  assert.deepEqual(result.removedScopeKeys, [scopeKey]);
  assert.equal(storage.getItem(storageKey), null);
  assert.deepEqual(JSON.parse(storage.getItem(SHIJING_AI_CONFIG_INDEX_KEY)), []);
  assert.equal(result.quarantineKeys.length, 1);
  assert.match(result.quarantineKeys[0], new RegExp(`^${SHIJING_AI_CONFIG_QUARANTINE_PREFIX}`));
  const quarantine = JSON.parse(storage.getItem(result.quarantineKeys[0]));
  assert.match(quarantine.reason, /targetId is retired/);
  assert.equal(quarantine.raw, raw);
});

test('first-launch profile initializes ShiJing text.generate AIConfig targetRef', async () => {
  let savedConfig = null;
  const result = await ensureShijingReadingAIConfigFromFirstLaunchProfile({
    loadConfig: () => emptyAIConfig(),
    saveConfig: (next) => {
      savedConfig = next;
      return next;
    },
    resolveRecommendedProfile: () => ({
      profile: readyAIProfile(),
      manifestSatisfied: true,
    }),
    now: () => '2026-06-04T00:00:00.000Z',
  });

  assert.equal(result.outcome, 'initialized');
  assert.equal(result.profileId, 'profile-shijing-ready');
  assert.equal(result.profileSource, 'recommended-profile');
  assert.equal(savedConfig.capabilities.targetRefs['text.generate'].kind, 'local-runtime');
  assert.equal(savedConfig.capabilities.targetRefs['text.generate'].version, 'v2');
  assert.equal(savedConfig.capabilities.targetRefs['text.generate'].readinessRef, 'execution_evidence_ready');
  assert.equal(savedConfig.capabilities.selectedParams['text.generate'].temperature, 0.2);
  assert.equal(savedConfig.profileOrigin.profileId, 'profile-shijing-ready');
});

test('first-launch profile init does not overwrite an existing ShiJing text.generate targetRef', async () => {
  let recommendedProfileRead = false;
  let saved = false;
  const existing = {
    ...emptyAIConfig(),
    capabilities: {
      targetRefs: {
        'text.generate': {
          kind: 'cloud-connector',
          connectorId: 'connector-openai',
          remoteModelCatalogId: 'remote-catalog:connector-openai:gpt-runtime',
          providerModelId: 'gpt-runtime',
          provider: 'openai',
        },
      },
      selectedParams: {},
    },
  };
  const result = await ensureShijingReadingAIConfigFromFirstLaunchProfile({
    loadConfig: () => existing,
    resolveRecommendedProfile: () => {
      recommendedProfileRead = true;
      throw new Error('should not read profile');
    },
    saveConfig: () => {
      saved = true;
      throw new Error('should not save');
    },
  });

  assert.equal(result.outcome, 'already-bound');
  assert.equal(recommendedProfileRead, false);
  assert.equal(saved, false);
  assert.equal(result.config.capabilities.targetRefs['text.generate'].providerModelId, 'gpt-runtime');
});

test('first-launch profile init fails closed when no profile can materialize text.generate', async () => {
  let saved = false;
  const result = await ensureShijingReadingAIConfigFromFirstLaunchProfile({
    loadConfig: () => emptyAIConfig(),
    saveConfig: () => {
      saved = true;
      throw new Error('should not save');
    },
    resolveRecommendedProfile: () => ({
      profile: setupRequiredAIProfile(),
      manifestSatisfied: true,
    }),
  });

  assert.equal(result.outcome, 'setup-required');
  assert.equal(result.reason, 'setup_required_no_live_config');
  assert.match(result.detail, /text\.generate/);
  assert.equal(saved, false);
});

test('AIConfig-backed RuntimeAiClient routes text.generate through configured cloud targetRef', async () => {
  let capturedRequest = null;
  let capturedOptions = null;
  let capturedSchedulingRequest = null;
  const config = {
    ...emptyAIConfig(),
    capabilities: {
      targetRefs: {
        'text.generate': {
          kind: 'cloud-connector',
          connectorId: 'connector-openai',
          remoteModelCatalogId: 'remote-catalog:connector-openai:gpt-runtime',
          providerModelId: 'gpt-runtime',
          provider: 'openai',
        },
      },
      selectedParams: {
        'text.generate': {
          temperature: 0.2,
          topP: 0.9,
          maxTokens: 1200,
          timeoutMs: 15000,
        },
      },
    },
  };
  const runtime = createScenarioRuntime({
    executeScenario: async (request, options) => {
      capturedRequest = request;
      capturedOptions = options;
      return runtimeScenarioTextOutput(JSON.stringify(rijingPatch()), {
        modelResolved: 'gpt-runtime',
        routeDecision: 2,
      });
    },
    peekScheduling: async (request) => {
      capturedSchedulingRequest = request;
      return {
        aggregateJudgement: {
          state: 1,
          detail: '',
          resourceWarnings: [],
        },
        targetJudgements: [],
      };
    },
  });
  const client = createShijingRuntimeAiClient({
    loadConfig: () => config,
    getClient: () => ({ runtime }),
    getSubjectUserId: () => 'acct-runtime-1',
  });
  const result = await client.generate('rijing', minimalPromptRequest());
  assert.equal(result.ok, true);
  assert.equal(capturedRequest.head.subjectUserId, 'acct-runtime-1');
  assert.equal(capturedRequest.head.modelId, 'gpt-runtime');
  assert.equal(capturedRequest.head.routePolicy, 2);
  assert.equal(capturedRequest.head.connectorId, 'connector-openai');
  assert.equal(capturedRequest.head.timeoutMs, 15000);
  assert.equal(capturedRequest.spec.spec.oneofKind, 'textGenerate');
  assert.equal(capturedRequest.spec.spec.textGenerate.temperature, 0.2);
  assert.equal(capturedRequest.spec.spec.textGenerate.topP, 0.9);
  assert.equal(capturedRequest.spec.spec.textGenerate.maxTokens, 1200);
  assert.equal(capturedOptions.metadata.aiConfigScopeOwnerId, 'nimi.shijing');
  assert.equal(capturedOptions.metadata.aiConfigBindingSource, 'cloud');
  assert.match(capturedOptions.metadata.aiConfigHash, /^v1-/);
  assert.equal(capturedSchedulingRequest.targets[0].targetId, 'connector-openai');
  assert.equal(capturedSchedulingRequest.targets[0].profileId, 'gpt-runtime');
});

test('AIConfig-backed conversation bridge routes follow-up text.generate through configured cloud targetRef', async () => {
  let capturedRequest = null;
  let capturedOptions = null;
  let capturedSchedulingRequest = null;
  const config = {
    ...emptyAIConfig(),
    capabilities: {
      targetRefs: {
        'text.generate': {
          kind: 'cloud-connector',
          connectorId: 'connector-openai',
          remoteModelCatalogId: 'remote-catalog:connector-openai:gpt-runtime',
          providerModelId: 'gpt-runtime',
          provider: 'openai',
        },
      },
      selectedParams: {
        'text.generate': {
          temperature: 0.15,
          topP: 0.8,
          maxTokens: 700,
          timeoutMs: 12000,
        },
      },
    },
  };
  const runtime = createScenarioRuntime({
    executeScenario: async (request, options) => {
      capturedRequest = request;
      capturedOptions = options;
      return runtimeScenarioTextOutput('Grounded follow-up answer.', {
        modelResolved: 'gpt-runtime',
        routeDecision: 2,
      });
    },
    peekScheduling: async (request) => {
      capturedSchedulingRequest = request;
      return {
        aggregateJudgement: {
          state: 1,
          detail: '',
          resourceWarnings: [],
        },
        targetJudgements: [],
      };
    },
  });
  const bridge = createShijingConversationChatBridge({
    loadConfig: () => config,
    getClient: () => ({ runtime }),
    getSubjectUserId: () => 'acct-runtime-1',
  });

  const result = await bridge.send({
    user_message: 'Can I continue with this plan?',
    source_readings: [validReading({ id: 'r_source' })],
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.text, 'Grounded follow-up answer.');
  assert.equal(capturedRequest.head.subjectUserId, 'acct-runtime-1');
  assert.equal(capturedRequest.head.modelId, 'gpt-runtime');
  assert.equal(capturedRequest.head.routePolicy, 2);
  assert.equal(capturedRequest.head.connectorId, 'connector-openai');
  assert.equal(capturedRequest.head.timeoutMs, 12000);
  assert.equal(capturedRequest.spec.spec.oneofKind, 'textGenerate');
  assert.match(capturedRequest.spec.spec.textGenerate.systemPrompt, /ShiJing/);
  assert.equal(capturedRequest.spec.spec.textGenerate.temperature, 0.15);
  assert.equal(capturedRequest.spec.spec.textGenerate.topP, 0.8);
  assert.equal(capturedRequest.spec.spec.textGenerate.maxTokens, 700);
  assert.match(capturedRequest.spec.spec.textGenerate.input[0].content, /Can I continue/);
  assert.match(capturedRequest.spec.spec.textGenerate.input[0].content, /r_source/);
  assert.equal(capturedOptions.metadata.surfaceId, 'shijing.conversation.runtime-ai');
  assert.equal(capturedOptions.metadata.aiConfigCapabilityId, 'text.generate');
  assert.equal(capturedSchedulingRequest.targets[0].targetId, 'connector-openai');
  assert.equal(capturedSchedulingRequest.targets[0].profileId, 'gpt-runtime');
});
