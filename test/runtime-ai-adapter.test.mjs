// SJG-ASTRO-11 + SJG-ALGO-13 — Runtime AI boundary tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEmptyNimiAIConfig,
  createNimiAppAIScopeRef,
  encodeNimiAIScopeRef,
} from '@nimiplatform/sdk/ai';
import {
  buildRuntimeAiPromptRequest,
} from '../src/product/astrology/runtime-ai-prompt.ts';
import { parseRuntimeAiOutput } from '../src/product/astrology/runtime-ai-parse.ts';
import { createSdkRuntimeAiClient } from '../src/product/astrology/runtime-ai-sdk-factory.ts';
import {
  createShijingRuntimeAiClient,
  resolveShijingTextGenerateBinding,
} from '../src/shell/ai/shijing-runtime-ai-client.ts';
import {
  createShijingConversationChatBridge,
} from '../src/shell/ai/shijing-conversation-chat-bridge.ts';
import {
  SHIJING_AI_CONFIG_INDEX_KEY,
  SHIJING_AI_CONFIG_STORAGE_PREFIX,
  createShijingReadingAIScopeRef,
  loadShijingAIConfig,
  saveShijingAIConfig,
} from '../src/shell/ai/shijing-ai-config.ts';
import {
  ensureShijingReadingAIConfigFromFirstLaunchProfile,
} from '../src/shell/ai/shijing-ai-config-bootstrap.ts';
import {
  dailyMirrorScope,
  rolling30DayMirrorScope,
  relationshipNatalMirrorScope,
  validConcernTagSnapshot,
  validEventMemory,
  validInputsSummary,
  validMingjingRelationshipOutput,
  validReading,
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

function createTextRuntime({ modelId = 'local/test-text-model', generateText }) {
  return {
    model: {
      model: { modelId },
      generateText,
    },
  };
}

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

function mingjingRelationshipPatch(overrides = {}) {
  return {
    patch_kind: 'shijing.runtime_ai_wording_patch.v1',
    mirror_kind: 'mingjing',
    output_kind: 'relationship_hepan',
    summary: 'Runtime refined relationship structure.',
    structure: {
      baseline_pattern: 'Runtime baseline wording.',
      attraction_and_support: 'Runtime support wording.',
      friction_and_misread: 'Runtime friction wording.',
      communication_rhythm: 'Runtime rhythm wording.',
      boundary_advice: 'Runtime boundary wording.',
    },
    timing_windows: [
      {
        start_date: '2026-03-01',
        end_date: '2026-04-15',
        summary: 'Runtime timing wording.',
      },
    ],
    practice: {
      communication: 'Runtime communication practice.',
      boundary: 'Runtime boundary practice.',
      repair: 'Runtime repair practice.',
    },
    ...overrides,
  };
}

function mingjingRelationshipPromptRequest(output = validMingjingRelationshipOutput()) {
  return {
    mirror_kind: 'mingjing',
    system_prompt: 'system contract',
    user_prompt: 'user contract',
    schema_name: 'shijing.runtime_ai_wording_patch.mingjing.v1',
    deterministic_output: output,
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

function readyAIProfile() {
  return {
    profileId: 'profile-shijing-ready',
    title: 'ShiJing Ready Profile',
    capabilities: {
      'text.generate': {
        targetRef: {
          kind: 'local-runtime',
          targetId: 'local',
          profileId: 'runtime-baseline:ready',
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

test('buildRuntimeAiPromptRequest gives RiJing a positive non-fatalist rich-banner brief', () => {
  const scope = dailyMirrorScope({ basis_time_zone: TZ });
  const summary = validInputsSummary({ mirrorKind: 'rijing', scope });
  const request = buildRuntimeAiPromptRequest({
    mirror_kind: 'rijing',
    feature_snapshot: summary.feature_snapshot,
    mirror_context: {
      mirror_kind: 'rijing',
      mirror_scope: scope,
      active_concern_tags: [
        validConcernTagSnapshot('tag_career', {
          label: '#事业',
          parsed_topics: ['career'],
        }),
      ],
      resolved_person_refs: [],
      cited_event_memory_refs: ['mem_today'],
      cited_plan_item_refs: [],
      response_preferences_hash: 'sha256:prefs',
    },
    deterministic_output: validRijingOutput({
      cited_event_memory_refs: ['mem_today'],
    }),
    cited_event_memories: [
      validEventMemory('mem_today', {
        occurred_at: '2026-05-25T06:00:00Z',
        body: '下午要谈一个重要合作，心里有点不确定。',
      }),
    ],
    response_preferences: { tone: 'warm', length: 'long', language: 'zh-Hans' },
  });

  assert.ok(request.system_prompt.includes('绝对正向'));
  assert.ok(request.system_prompt.includes('命由天定，运由己造'));
  assert.ok(request.system_prompt.includes('Do not output Markdown headings'));
  assert.ok(request.user_prompt.includes('今日参照事件'));
  assert.ok(request.user_prompt.includes('cited_event_memory_summaries:'));
  assert.ok(request.user_prompt.includes('下午要谈一个重要合作'));
  assert.ok(request.user_prompt.includes('daily_overview should read like 今日基调'));
  assert.ok(request.user_prompt.includes('concern projection summary should read like 专属视角解读'));
  assert.ok(request.user_prompt.includes('绝对禁止使用类似'));
  assert.ok(request.user_prompt.includes('不要在正文中重复输出'));
  assert.ok(request.user_prompt.includes('至少80字'));
  assert.ok(request.user_prompt.includes('会议发言'));
  assert.ok(request.user_prompt.includes('一顿晚餐'));
});

test('buildRuntimeAiPromptRequest tells RiJing how to handle missing reference events', () => {
  const scope = dailyMirrorScope({ basis_time_zone: TZ });
  const summary = validInputsSummary({ mirrorKind: 'rijing', scope });
  const request = buildRuntimeAiPromptRequest({
    mirror_kind: 'rijing',
    feature_snapshot: summary.feature_snapshot,
    mirror_context: {
      mirror_kind: 'rijing',
      mirror_scope: scope,
      active_concern_tags: [
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
    deterministic_output: validRijingOutput(),
    response_preferences: { tone: 'warm', length: 'long', language: 'zh-Hans' },
  });

  assert.ok(request.user_prompt.includes('用户今日未提供具体事件'));
  assert.ok(request.user_prompt.includes('整体能量和生活哲理'));
  assert.ok(request.user_prompt.includes('今日事件解析'));
  assert.ok(request.user_prompt.includes('不要 invent uncited events'));
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

test('buildRuntimeAiPromptRequest admits MingJing relationship HePan wording targets as read-only context', () => {
  const scope = relationshipNatalMirrorScope({ anchor_year: 2026 });
  const summary = validInputsSummary({ mirrorKind: 'mingjing', scope, concernTagSnapshots: [] });
  const output = validMingjingRelationshipOutput({
    relationship_subject: {
      primary_subject_ref: 'self',
      related_person_ref: scope.related_person_ref,
      anchor_year: scope.anchor_year,
      basis_time_zone: scope.basis_time_zone,
    },
  });

  const request = buildRuntimeAiPromptRequest({
    mirror_kind: 'mingjing',
    feature_snapshot: summary.feature_snapshot,
    mirror_context: {
      mirror_kind: 'mingjing',
      mirror_scope: scope,
      active_concern_tags: [],
      resolved_person_refs: [scope.related_person_ref],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      response_preferences_hash: 'sha256:prefs',
    },
    deterministic_output: output,
    response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
  });

  assert.equal(request.schema_name, 'shijing.runtime_ai_wording_patch.mingjing.v1');
  assert.ok(request.user_prompt.includes('output_kind: relationship_hepan'));
  assert.ok(request.user_prompt.includes('relationship_subject'));
  assert.ok(request.user_prompt.includes('"related_person_ref": {'));
  assert.ok(request.user_prompt.includes('"driver_refs": ['));
  assert.ok(request.user_prompt.includes('bazi:relationship.window.2026-03'));
  assert.ok(request.user_prompt.includes('relationship prose fields only'));
  assert.ok(request.user_prompt.includes('Do NOT output relationship_subject, citations, cited_event_memory_refs, cited_plan_item_refs, nature, driver_refs'));
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

test('buildRuntimeAiPromptRequest gives YueJing an actionable non-fatalist writing brief', () => {
  const scope = rolling30DayMirrorScope({
    start_date: '2026-06-03',
    end_date: '2026-07-02',
    basis_time_zone: TZ,
  });
  const summary = validInputsSummary({ mirrorKind: 'yuejing', scope });
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
      ],
      resolved_person_refs: [],
      cited_event_memory_refs: ['mem_recent'],
      cited_plan_item_refs: ['plan_next'],
      response_preferences_hash: 'sha256:prefs',
    },
    deterministic_output: validYuejingOutput(scope, {
      cited_event_memory_refs: ['mem_recent'],
      cited_plan_item_refs: ['plan_next'],
      cells: [
        {
          date: '2026-06-03',
          concern_tag_ref: 'tag_love',
          tendency_class: 'watch',
          summary: '#姻缘: 留意沟通节奏。',
        },
      ],
    }),
    cited_event_memories: [
      validEventMemory('mem_recent', {
        occurred_at: '2026-05-29T06:00:00Z',
        body: '上周和伴侣因为日程安排有过一次沟通卡顿。',
      }),
    ],
    response_preferences: { tone: 'warm', length: 'long', language: 'zh-Hans' },
  });

  assert.ok(request.system_prompt.includes('不要使用绝对化预言'));
  assert.ok(request.system_prompt.includes('必然'));
  assert.ok(request.system_prompt.includes('注定'));
  assert.ok(request.user_prompt.includes('30 日节奏建议'));
  assert.ok(request.user_prompt.includes('每条建议必须绑定具体日期或时间段'));
  assert.ok(request.user_prompt.includes('适合做什么、不适合做什么'));
  assert.ok(request.user_prompt.includes('用户已有事件记忆和未来计划'));
  assert.ok(request.user_prompt.includes('不要输出底层技术字段'));
  assert.ok(request.user_prompt.includes('上周和伴侣因为日程安排'));
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

test('SdkRuntimeAiClient delegates through a vNext NimiAiModel', async () => {
  let capturedRequest = null;
  const runtime = createTextRuntime({
    generateText: async (request) => {
      capturedRequest = request;
      return runtimeTextOutput(JSON.stringify(rijingPatch()));
    },
  });
  const client = createSdkRuntimeAiClient({
    runtime,
    metadata: { surfaceId: 'shijing.test.runtime-ai' },
  });
  const result = await client.generate('rijing', minimalPromptRequest());
  assert.equal(result.ok, true);
  assert.equal(capturedRequest.model.modelId, 'local/test-text-model');
  assert.equal(capturedRequest.messages[0].role, 'system');
  assert.equal(capturedRequest.messages[0].content[0].text, 'system contract');
  assert.equal(capturedRequest.messages[1].role, 'user');
  assert.equal(capturedRequest.messages[1].content[0].text, 'user contract');
  assert.equal(capturedRequest.parameters.metadata.surfaceId, 'shijing.test.runtime-ai');
});

test('SdkRuntimeAiClient fails closed when no text model is provided', async () => {
  let called = false;
  const runtime = createTextRuntime({
    modelId: '',
    generateText: async () => {
      called = true;
      return runtimeTextOutput(JSON.stringify(rijingPatch()));
    },
  });
  const client = createSdkRuntimeAiClient({ runtime });
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
  const runtime = createTextRuntime({
    generateText: async () => runtimeTextOutput(fenced),
  });
  const client = createSdkRuntimeAiClient({ runtime });
  const result = await client.generate('rijing', minimalPromptRequest());
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.output.mirror_kind, 'rijing');
    assert.equal(result.output.summary, 'Runtime refined day.');
  }
});

test('SdkRuntimeAiClient accepts the first complete wording patch when Runtime appends trailing JSON', async () => {
  const raw = `${JSON.stringify(rijingPatch())}\n{"diagnostic":"provider appended metadata"}`;
  const runtime = createTextRuntime({
    generateText: async () => runtimeTextOutput(raw),
  });
  const client = createSdkRuntimeAiClient({ runtime });
  const result = await client.generate('rijing', minimalPromptRequest());
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.output.mirror_kind, 'rijing');
    assert.equal(result.output.summary, 'Runtime refined day.');
  }
});

test('SdkRuntimeAiClient fails closed when wording patch violates ShiJing target identity', async () => {
  const runtime = createTextRuntime({
    generateText: async () => runtimeTextOutput(JSON.stringify({ ...rijingPatch(), mirror_kind: 'yuejing' })),
  });
  const client = createSdkRuntimeAiClient({ runtime });
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
  const runtime = createTextRuntime({
    generateText: async () => runtimeTextOutput(JSON.stringify(patch)),
  });
  const client = createSdkRuntimeAiClient({ runtime });
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
  const runtime = createTextRuntime({
    generateText: async () => runtimeTextOutput(JSON.stringify(patch)),
  });
  const client = createSdkRuntimeAiClient({ runtime });
  const result = await client.generate('yuejing', yuejingPromptRequest());
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failure.kind, 'parse_failure');
    assert.equal(result.failure.failure.kind, 'validation_failed');
    assert.equal(result.failure.failure.detail, 'yuejing_cell_summary_duplicate_for_date');
  }
});

test('SdkRuntimeAiClient applies MingJing relationship wording patch while preserving deterministic fields', async () => {
  const base = validMingjingRelationshipOutput({
    cited_event_memory_refs: ['mem_relationship'],
    cited_plan_item_refs: ['plan_relationship'],
  });
  const runtime = createTextRuntime({
    generateText: async () => runtimeTextOutput(JSON.stringify(mingjingRelationshipPatch())),
  });
  const client = createSdkRuntimeAiClient({ runtime });
  const result = await client.generate('mingjing', mingjingRelationshipPromptRequest(base));

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.output.summary, 'Runtime refined relationship structure.');
  assert.equal(result.output.structure.baseline_pattern, 'Runtime baseline wording.');
  assert.equal(result.output.structure.attraction_and_support, 'Runtime support wording.');
  assert.equal(result.output.structure.friction_and_misread, 'Runtime friction wording.');
  assert.equal(result.output.structure.communication_rhythm, 'Runtime rhythm wording.');
  assert.equal(result.output.structure.boundary_advice, 'Runtime boundary wording.');
  assert.equal(result.output.timing_windows[0].summary, 'Runtime timing wording.');
  assert.equal(result.output.practice.communication, 'Runtime communication practice.');
  assert.equal(result.output.practice.boundary, 'Runtime boundary practice.');
  assert.equal(result.output.practice.repair, 'Runtime repair practice.');
  assert.deepEqual(result.output.relationship_subject, base.relationship_subject);
  assert.equal(result.output.timing_windows[0].nature, base.timing_windows[0].nature);
  assert.deepEqual(result.output.timing_windows[0].driver_refs, base.timing_windows[0].driver_refs);
  assert.deepEqual(result.output.citations, base.citations);
  assert.deepEqual(result.output.cited_event_memory_refs, ['mem_relationship']);
  assert.deepEqual(result.output.cited_plan_item_refs, ['plan_relationship']);
});

test('SdkRuntimeAiClient rejects MingJing relationship patches that include deterministic fields', async () => {
  const cases = [
    {
      name: 'relationship_subject',
      patch: mingjingRelationshipPatch({
        relationship_subject: {
          primary_subject_ref: 'self',
          related_person_ref: { kind: 'person', id: 'p_alice' },
          anchor_year: 2026,
          basis_time_zone: TZ,
        },
      }),
      detail: 'mingjing_relationship_patch_forbidden_key:relationship_subject',
    },
    {
      name: 'citations',
      patch: mingjingRelationshipPatch({
        citations: [{ method: 'bazi_ziping_v1', reference: 'forbidden' }],
      }),
      detail: 'mingjing_relationship_patch_forbidden_key:citations',
    },
    {
      name: 'timing driver_refs',
      patch: mingjingRelationshipPatch({
        timing_windows: [
          {
            start_date: '2026-03-01',
            end_date: '2026-04-15',
            driver_refs: ['runtime:forbidden'],
            summary: 'Runtime timing wording.',
          },
        ],
      }),
      detail: 'mingjing_relationship_timing_window_forbidden_key:driver_refs',
    },
  ];

  for (const item of cases) {
    const runtime = createTextRuntime({
      generateText: async () => runtimeTextOutput(JSON.stringify(item.patch)),
    });
    const client = createSdkRuntimeAiClient({ runtime });
    const result = await client.generate('mingjing', mingjingRelationshipPromptRequest());

    assert.equal(result.ok, false, item.name);
    if (result.ok) continue;
    assert.equal(result.failure.kind, 'parse_failure');
    assert.equal(result.failure.failure.kind, 'validation_failed');
    assert.equal(result.failure.failure.detail, item.detail);
  }
});

test('SdkRuntimeAiClient rejects MingJing relationship patch with unknown timing window target', async () => {
  const patch = mingjingRelationshipPatch({
    timing_windows: [
      {
        start_date: '2026-05-01',
        end_date: '2026-05-31',
        summary: 'Runtime timing wording for an unknown window.',
      },
    ],
  });
  const runtime = createTextRuntime({
    generateText: async () => runtimeTextOutput(JSON.stringify(patch)),
  });
  const client = createSdkRuntimeAiClient({ runtime });
  const result = await client.generate('mingjing', mingjingRelationshipPromptRequest());

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failure.kind, 'parse_failure');
    assert.equal(result.failure.failure.kind, 'validation_failed');
    assert.equal(result.failure.failure.detail, 'mingjing_relationship_timing_window_target_unknown');
  }
});

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
  assert.equal(savedConfig.capabilities.targetRefs['text.generate'].targetId, 'local');
  assert.equal(savedConfig.capabilities.targetRefs['text.generate'].profileId, 'runtime-baseline:ready');
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
