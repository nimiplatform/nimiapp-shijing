// SJG-ASTRO-11 + SJG-ALGO-13 — Runtime AI boundary tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildRuntimeAiPromptRequest,
} from '../src/product/astrology/runtime-ai-prompt.ts';
import { parseRuntimeAiOutput } from '../src/product/astrology/runtime-ai-parse.ts';
import { createSdkRuntimeAiClient } from '../src/product/astrology/runtime-ai-sdk-factory.ts';
import {
  createShijingRuntimeAiClient,
  resolveShijingTextGenerateBinding,
} from '../src/shell/ai/shijing-runtime-ai-client.ts';
import { createShijingReadingAIScopeRef } from '../src/shell/ai/shijing-ai-config.ts';
import {
  ensureShijingReadingAIConfigFromFirstRunEvidence,
} from '../src/shell/ai/shijing-ai-config-bootstrap.ts';
import {
  dailyMirrorScope,
  rolling30DayMirrorScope,
  validConcernTagSnapshot,
  validInputsSummary,
  validRijingOutput,
  validYuejingOutput,
} from './_fixtures.mjs';
import { MockRuntimeAiClient } from './_mock-runtime-ai-client.mjs';

const TZ = 'Asia/Shanghai';

function runtimeTextOutput(text) {
  return {
    text,
    finishReason: 'stop',
    usage: {},
    trace: {},
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

function yuejingPromptRequest() {
  const scope = rolling30DayMirrorScope({
    start_date: '2026-06-03',
    end_date: '2026-07-02',
    basis_time_zone: TZ,
  });
  return {
    mirror_kind: 'yuejing',
    system_prompt: 'system contract',
    user_prompt: 'user contract',
    schema_name: 'shijing.runtime_ai_wording_patch.yuejing.v1',
    deterministic_output: validYuejingOutput(scope, {
      cells: [
        {
          date: '2026-06-03',
          concern_tag_ref: 'tag_love',
          tendency_class: 'turning',
          summary: '#姻缘: 变化转折, 依据 domain.love / daily_relation.output@2026-06-03',
        },
        {
          date: '2026-06-03',
          concern_tag_ref: 'tag_career',
          tendency_class: 'watch',
          summary: '#事业: 需要观察, 依据 domain.career / daily_relation.output@2026-06-03',
        },
      ],
    }),
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
      selectedBindings: {},
      localProfileRefs: {},
      selectedParams: {},
    },
    profileOrigin: null,
  };
}

function firstRunProof({
  capability,
  scenarioType,
  consumerId,
  assetId,
}) {
  return {
    capability,
    scenarioType,
    boundConsumerId: consumerId,
    boundAssetId: assetId,
    localRouteTarget: 'local',
    routePolicy: 1,
    modelResolved: assetId,
    terminalResult: 'local_executed',
    reasonCode: 'FIRST_RUN_EXECUTION_EVIDENCE_READY',
    traceId: `trace:${consumerId}`,
    executedAt: '2026-06-03T00:00:00Z',
  };
}

function verifiedFirstRunEvidenceRef() {
  return {
    executionEvidenceRef: 'execution_evidence_ready',
    selectedLocalFactoryAiProfileRef: 'factory:minimal',
    installLevel: 'minimal',
    runtimeBaselineRef: 'runtime-baseline:ready',
    dataRootRef: 'data-root:ready',
    localExecutionTargetEvidence: ['local'],
    selectedBaselineCapabilityProof: [
      firstRunProof({
        capability: 'local_text_chat_execution',
        scenarioType: 1,
        consumerId: 'llama.cpp.cpu',
        assetId: 'asset:text',
      }),
      firstRunProof({
        capability: 'local_basic_stt_execution',
        scenarioType: 6,
        consumerId: 'speech.qwen3-asr.python',
        assetId: 'asset:stt',
      }),
      firstRunProof({
        capability: 'local_basic_tts_execution',
        scenarioType: 5,
        consumerId: 'speech.qwen3-tts.python',
        assetId: 'asset:tts',
      }),
    ],
    terminalResult: 'local_ai_ready',
    observedAt: '2026-06-03T00:00:00Z',
    runtimeAuditSequence: ['audit:ready'],
    runtimeVerifierIdentity: 'runtime',
  };
}

function firstRunReadyPlatformClient() {
  return {
    runtime: {
      local: {
        getProductControlRecord: async () => ({
          json: JSON.stringify({
            path: 'D:\\nimi\\product-control.json',
            exists: true,
            state: 'ready_for_use',
            error: null,
            record: {
              schemaVersion: 1,
              installId: 'install-ready',
              productVersion: '0.1.0',
              state: 'ready_for_use',
              dataRoot: {
                path: 'D:\\nimi-data',
                status: 'ready',
                selectedAt: '2026-06-03T00:00:00Z',
                verifiedAt: '2026-06-03T00:00:00Z',
                selectedAtUnixMs: 1780425600000,
                verifiedAtUnixMs: 1780425600000,
              },
              firstRun: {
                installLevel: 'minimal',
                aiProfileAlias: 'minimal-local',
                completed: true,
                completedAt: '2026-06-03T00:00:00Z',
                initializationPlanId: 'plan-ready',
                baselineProfileRef: 'profile-ready',
                baselineCommitId: 'commit-ready',
                accountDefaultProfileRef: 'account-default-ready',
                builtInAiConfigRefs: [],
                runtimeBaselineRef: 'runtime-baseline:ready',
                executionEvidenceRef: 'execution_evidence_ready',
              },
              pointers: {},
              repair: { required: false },
            },
          }),
        }),
        resolveFirstRunExecutionEvidence: async (request) => ({
          ref: {
            ...verifiedFirstRunEvidenceRef(),
            executionEvidenceRef: request.executionEvidenceRef,
            runtimeBaselineRef: request.expectedRuntimeBaselineRef,
            installLevel: request.expectedInstallLevel,
          },
          state: 'local_ai_ready',
          reasonCode: 'FIRST_RUN_EXECUTION_EVIDENCE_READY',
          detail: '',
        }),
      },
    },
  };
}

test('parseRuntimeAiOutput accepts valid rijing JSON', () => {
  const output = validRijingOutput();
  const result = parseRuntimeAiOutput('rijing', JSON.stringify(output));
  assert.equal(result.ok, true);
});

test('parseRuntimeAiOutput rejects invalid JSON', () => {
  const result = parseRuntimeAiOutput('rijing', 'not json');
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.kind, 'invalid_json');
});

test('parseRuntimeAiOutput rejects mirror_kind mismatch', () => {
  const output = validRijingOutput();
  const result = parseRuntimeAiOutput('yuejing', JSON.stringify(output));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.kind, 'mirror_kind_mismatch');
});

test('parseRuntimeAiOutput rejects forbidden field (luck_score)', () => {
  const output = { ...validRijingOutput(), luck_score: 50 };
  const result = parseRuntimeAiOutput('rijing', JSON.stringify(output));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.kind, 'validation_failed');
});

test('parseRuntimeAiOutput rejects markdown / prose-only', () => {
  const result = parseRuntimeAiOutput('rijing', '# heading\nbody');
  assert.equal(result.ok, false);
});

test('buildRuntimeAiPromptRequest includes mirror_kind in schema_name', () => {
  const scope = dailyMirrorScope({ basis_time_zone: TZ });
  const summary = validInputsSummary({ mirrorKind: 'rijing', scope });
  const request = buildRuntimeAiPromptRequest({
    mirror_kind: 'rijing',
    feature_snapshot: summary.feature_snapshot,
    mirror_context: {
      mirror_kind: 'rijing',
      mirror_scope: scope,
      active_concern_tags: [validConcernTagSnapshot('tag_love')],
      resolved_person_refs: [],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      response_preferences_hash: 'sha256:prefs',
    },
    deterministic_output: validRijingOutput(),
    response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
  });
  assert.equal(request.schema_name, 'shijing.runtime_ai_wording_patch.rijing.v1');
  assert.ok(request.system_prompt.includes('Deterministic'));
  assert.ok(request.system_prompt.includes('patch_kind MUST equal shijing.runtime_ai_wording_patch.v1'));
  assert.ok(request.system_prompt.includes('mirror_kind MUST equal required_top_level_mirror_kind'));
  assert.ok(request.user_prompt.includes('required_patch_kind: shijing.runtime_ai_wording_patch.v1'));
  assert.ok(request.user_prompt.includes('required_top_level_mirror_kind: rijing'));
  assert.ok(request.user_prompt.includes('"mirror_kind": "rijing"'));
  assert.ok(request.user_prompt.includes('wording_patch_target_json:'));
});

test('buildRuntimeAiPromptRequest limits yuejing wording target to the window start date', () => {
  const scope = rolling30DayMirrorScope({
    start_date: '2026-05-25',
    end_date: '2026-06-23',
    basis_time_zone: TZ,
  });
  const summary = validInputsSummary({ mirrorKind: 'yuejing', scope });
  const output = validYuejingOutput(scope, {
    cells: [
      {
        date: '2026-05-25',
        concern_tag_ref: 'tag_love',
        tendency_class: 'steady',
        summary: 'Start date wording.',
      },
      {
        date: '2026-05-26',
        concern_tag_ref: 'tag_love',
        tendency_class: 'watch',
        summary: 'Second date wording.',
      },
    ],
  });
  const request = buildRuntimeAiPromptRequest({
    mirror_kind: 'yuejing',
    feature_snapshot: summary.feature_snapshot,
    mirror_context: {
      mirror_kind: 'yuejing',
      mirror_scope: scope,
      active_concern_tags: [validConcernTagSnapshot('tag_love')],
      resolved_person_refs: [],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      response_preferences_hash: 'sha256:prefs',
    },
    deterministic_output: output,
    response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
  });
  assert.ok(request.user_prompt.includes('"focus_date": "2026-05-25"'));
  assert.ok(request.user_prompt.includes('Start date wording.'));
  assert.equal(request.user_prompt.includes('Second date wording.'), false);
});

test('buildRuntimeAiPromptRequest includes YueJing concern labels and deterministic classes', () => {
  const scope = rolling30DayMirrorScope({
    start_date: '2026-06-03',
    end_date: '2026-07-02',
    basis_time_zone: TZ,
  });
  const summary = validInputsSummary({ mirrorKind: 'yuejing', scope });
  const output = validYuejingOutput(scope, {
    cells: [
      {
        date: '2026-06-03',
        concern_tag_ref: 'tag_love',
        tendency_class: 'turning',
        summary: '#姻缘: 变化转折。',
      },
      {
        date: '2026-06-03',
        concern_tag_ref: 'tag_career',
        tendency_class: 'watch',
        summary: '#事业: 需要观察。',
      },
    ],
  });
  const request = buildRuntimeAiPromptRequest({
    mirror_kind: 'yuejing',
    feature_snapshot: summary.feature_snapshot,
    mirror_context: {
      mirror_kind: 'yuejing',
      mirror_scope: scope,
      active_concern_tags: [
        validConcernTagSnapshot('tag_love', {
          label: '#姻缘',
          parsed_topics: ['love'],
        }),
        validConcernTagSnapshot('tag_career', {
          label: '#事业',
          parsed_topics: ['career'],
        }),
      ],
      resolved_person_refs: [],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      response_preferences_hash: 'sha256:prefs',
    },
    deterministic_output: output,
    response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
  });
  assert.ok(request.user_prompt.includes('"concern_label": "#姻缘"'));
  assert.ok(request.user_prompt.includes('"concern_label": "#事业"'));
  assert.ok(request.user_prompt.includes('"parsed_topics": ['));
  assert.ok(request.user_prompt.includes('"tendency_class": "turning"'));
  assert.ok(request.user_prompt.includes('"tendency_class": "watch"'));
});

test('MockRuntimeAiClient returns canned output when configured', async () => {
  const client = new MockRuntimeAiClient({
    canned_output_by_kind: { rijing: validRijingOutput() },
  });
  const result = await client.generate('rijing', {
    mirror_kind: 'rijing',
    system_prompt: '',
    user_prompt: '',
    schema_name: 'shijing.mirror_output.rijing.v1',
  });
  assert.equal(result.ok, true);
});

test('MockRuntimeAiClient surfaces canned failure when configured', async () => {
  const client = new MockRuntimeAiClient({
    canned_failure: { kind: 'runtime_unavailable', detail: 'forced failure' },
  });
  const result = await client.generate('rijing', {
    mirror_kind: 'rijing',
    system_prompt: '',
    user_prompt: '',
    schema_name: 'shijing.mirror_output.rijing.v1',
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure.kind, 'runtime_unavailable');
});

test('SdkRuntimeAiClient delegates through runtime.ai.text.generate', async () => {
  let capturedRequest = null;
  const runtime = {
    ai: {
      text: {
        generate: async (request) => {
          capturedRequest = request;
          return runtimeTextOutput(JSON.stringify(rijingPatch()));
        },
      },
    },
  };
  const client = createSdkRuntimeAiClient({
    runtime,
    model: 'local/test-text-model',
    route: 'local',
    metadata: { surfaceId: 'shijing.test.runtime-ai' },
  });
  const result = await client.generate('rijing', minimalPromptRequest());
  assert.equal(result.ok, true);
  assert.equal(capturedRequest.model, 'local/test-text-model');
  assert.equal(capturedRequest.route, 'local');
  assert.equal(capturedRequest.system, 'system contract');
  assert.equal(capturedRequest.input, 'user contract');
  assert.equal(capturedRequest.metadata.surfaceId, 'shijing.test.runtime-ai');
});

test('SdkRuntimeAiClient fails closed when no text model is provided', async () => {
  let called = false;
  const runtime = {
    ai: {
      text: {
        generate: async () => {
          called = true;
          return runtimeTextOutput(JSON.stringify(rijingPatch()));
        },
      },
    },
  };
  const client = createSdkRuntimeAiClient({ runtime, model: '' });
  const result = await client.generate('rijing', minimalPromptRequest());
  assert.equal(result.ok, false);
  assert.equal(called, false);
  if (!result.ok) {
    assert.equal(result.failure.kind, 'runtime_unavailable');
    assert.match(result.failure.detail, /text model/);
  }
});

test('SdkRuntimeAiClient uses SDK structured output extraction for fenced JSON', async () => {
  const fenced = `\`\`\`json\n${JSON.stringify(rijingPatch())}\n\`\`\``;
  const runtime = {
    ai: {
      text: {
        generate: async () => runtimeTextOutput(fenced),
      },
    },
  };
  const client = createSdkRuntimeAiClient({ runtime, model: 'local/test-text-model' });
  const result = await client.generate('rijing', minimalPromptRequest());
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.output.mirror_kind, 'rijing');
    assert.equal(result.output.summary, 'Runtime refined day.');
  }
});

test('SdkRuntimeAiClient fails closed when wording patch violates ShiJing target identity', async () => {
  const runtime = {
    ai: {
      text: {
        generate: async () => runtimeTextOutput(JSON.stringify({ ...rijingPatch(), mirror_kind: 'yuejing' })),
      },
    },
  };
  const client = createSdkRuntimeAiClient({ runtime, model: 'local/test-text-model' });
  const result = await client.generate('rijing', minimalPromptRequest());
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failure.kind, 'parse_failure');
    assert.equal(result.failure.failure.kind, 'mirror_kind_mismatch');
  }
});

test('SdkRuntimeAiClient preserves deterministic recommendations when wording patch omits them', async () => {
  const patch = {
    ...rijingPatch(),
    concern_projections: [
      {
        concern_tag_ref: 'tag_love',
        summary: 'Runtime refined connection without recommendations.',
      },
    ],
  };
  const runtime = {
    ai: {
      text: {
        generate: async () => runtimeTextOutput(JSON.stringify(patch)),
      },
    },
  };
  const client = createSdkRuntimeAiClient({ runtime, model: 'local/test-text-model' });
  const result = await client.generate('rijing', minimalPromptRequest());
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.output.concern_projections[0].recommendations, ['Listen first.']);
    assert.equal(
      result.output.concern_projections[0].summary,
      'Runtime refined connection without recommendations.',
    );
  }
});

test('SdkRuntimeAiClient fails closed when YueJing wording duplicates same-date concern summaries', async () => {
  const patch = {
    patch_kind: 'shijing.runtime_ai_wording_patch.v1',
    mirror_kind: 'yuejing',
    cells: [
      {
        date: '2026-06-03',
        concern_tag_ref: 'tag_love',
        summary: '今日适合稳定推进。',
      },
      {
        date: '2026-06-03',
        concern_tag_ref: 'tag_career',
        summary: '今日适合稳定推进。',
      },
    ],
  };
  const runtime = {
    ai: {
      text: {
        generate: async () => runtimeTextOutput(JSON.stringify(patch)),
      },
    },
  };
  const client = createSdkRuntimeAiClient({ runtime, model: 'local/test-text-model' });
  const result = await client.generate('yuejing', yuejingPromptRequest());
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failure.kind, 'parse_failure');
    assert.equal(result.failure.failure.kind, 'validation_failed');
    assert.equal(result.failure.failure.detail, 'yuejing_cell_summary_duplicate_for_date');
  }
});

test('resolveShijingTextGenerateBinding fails closed when AIConfig has no text.generate binding', () => {
  const resolved = resolveShijingTextGenerateBinding(emptyAIConfig());
  assert.equal(resolved.ok, false);
  if (!resolved.ok) {
    assert.match(resolved.detail, /text\.generate/);
    assert.match(resolved.detail, /failed closed/);
  }
});

test('first-run evidence initializes ShiJing text.generate AIConfig binding', async () => {
  let savedConfig = null;
  const result = await ensureShijingReadingAIConfigFromFirstRunEvidence({
    platformClient: firstRunReadyPlatformClient(),
    loadConfig: () => emptyAIConfig(),
    saveConfig: (next) => {
      savedConfig = next;
      return next;
    },
  });

  assert.equal(result.outcome, 'initialized');
  assert.equal(savedConfig.capabilities.selectedBindings['text.generate'].source, 'local');
  assert.equal(savedConfig.capabilities.selectedBindings['text.generate'].model, 'asset:text');
  assert.equal(savedConfig.capabilities.selectedBindings['text.generate'].engine, 'llama.cpp.cpu');
  assert.equal(
    savedConfig.capabilities.selectedBindings['text.generate'].runtimeExecutionEvidenceRef,
    'execution_evidence_ready',
  );
});

test('first-run evidence init does not overwrite an existing ShiJing text.generate binding', async () => {
  let productControlRead = false;
  let saved = false;
  const existing = {
    ...emptyAIConfig(),
    capabilities: {
      selectedBindings: {
        'text.generate': {
          source: 'cloud',
          connectorId: 'connector-openai',
          model: 'gpt-runtime',
          provider: 'openai',
        },
      },
      localProfileRefs: {},
      selectedParams: {},
    },
  };
  const result = await ensureShijingReadingAIConfigFromFirstRunEvidence({
    platformClient: {
      runtime: {
        local: {
          getProductControlRecord: async () => {
            productControlRead = true;
            throw new Error('should not read product control');
          },
        },
      },
    },
    loadConfig: () => existing,
    saveConfig: () => {
      saved = true;
      throw new Error('should not save');
    },
  });

  assert.equal(result.outcome, 'already-bound');
  assert.equal(productControlRead, false);
  assert.equal(saved, false);
  assert.equal(result.config.capabilities.selectedBindings['text.generate'].model, 'gpt-runtime');
});

test('AIConfig-backed RuntimeAiClient routes text.generate through configured cloud binding', async () => {
  let capturedRequest = null;
  const config = {
    ...emptyAIConfig(),
    capabilities: {
      selectedBindings: {
        'text.generate': {
          source: 'cloud',
          connectorId: 'connector-openai',
          model: 'gpt-runtime',
          modelLabel: 'GPT Runtime',
          provider: 'openai',
        },
      },
      localProfileRefs: {},
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
  const platformClient = {
    runtime: {
      ai: {
        text: {
          generate: async (request) => {
            capturedRequest = request;
            return runtimeTextOutput(JSON.stringify(rijingPatch()));
          },
        },
      },
    },
  };
  const client = createShijingRuntimeAiClient({
    loadConfig: () => config,
    getPlatformClient: () => platformClient,
  });
  const result = await client.generate('rijing', minimalPromptRequest());
  assert.equal(result.ok, true);
  assert.equal(capturedRequest.model, 'gpt-runtime');
  assert.equal(capturedRequest.route, 'cloud');
  assert.equal(capturedRequest.connectorId, 'connector-openai');
  assert.equal(capturedRequest.temperature, 0.2);
  assert.equal(capturedRequest.topP, 0.9);
  assert.equal(capturedRequest.maxTokens, 1200);
  assert.equal(capturedRequest.timeoutMs, 15000);
  assert.equal(capturedRequest.metadata.aiConfigScopeOwnerId, 'ai.nimi.apps.shijing');
  assert.equal(capturedRequest.metadata.aiConfigBindingSource, 'cloud');
  assert.match(capturedRequest.metadata.aiConfigHash, /^ai-config-v1:/);
});
