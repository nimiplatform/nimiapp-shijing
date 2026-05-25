// Wave-11 — RuntimeTextGenerator-based AI adapter tests.

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';

import {
  RuntimeTextGeneratorAiClient,
  buildAstrologyFeatureSnapshot,
  buildRuntimeAiPrompt,
  parseAstrologyOutput,
  createSdkRuntimeAiAdapter,
} from '../src/product/astrology/index.ts';
import { validShiJingSpace, validTimeWindow } from './_fixtures.mjs';

function featureSnapshotForTest() {
  const result = buildAstrologyFeatureSnapshot({
    subjects: ['self'],
    time_window: validTimeWindow(),
    space: validShiJingSpace(),
  });
  if (!result.ok) throw new Error('feature snapshot fixture failed');
  return result.value;
}

test('buildRuntimeAiPrompt produces non-empty system + user parts', () => {
  const snap = featureSnapshotForTest();
  const prompt = buildRuntimeAiPrompt(snap, { tone: 'warm', length: 'short', language: 'zh-Hans' });
  assert.ok(prompt.system.length > 0);
  assert.ok(prompt.user.length > 0);
  assert.match(prompt.system, /Wording tone: warm/);
  assert.match(prompt.user, /feature_snapshot_json/);
  assert.match(prompt.user, /stage_label/);
});

test('buildRuntimeAiPrompt includes view context when given', () => {
  const snap = featureSnapshotForTest();
  const prompt = buildRuntimeAiPrompt(
    snap,
    { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
    {
      view_id: 'v_01',
      anchor_subject: 'self',
      instructions: 'focus on weekly rhythm',
      memory_summary: 'previous-week summary',
    },
  );
  assert.match(prompt.user, /view_context: id=v_01/);
  assert.match(prompt.user, /focus on weekly rhythm/);
});

test('parseAstrologyOutput accepts minimal valid response', () => {
  const text = JSON.stringify({
    summary: 'A short reflection.',
    highlights: [],
    recommendations: [],
    citations: [],
  });
  const result = parseAstrologyOutput(text);
  assert.equal(result.ok, true);
});

test('parseAstrologyOutput accepts a full valid response', () => {
  const text = JSON.stringify({
    summary: 'Full one.',
    highlights: [{ label: 'h', body: 'b', subject_ref: 'self' }],
    recommendations: [{ body: 'r', subject_ref: 'self', horizon: 'today' }],
    citations: [{ method: 'bazi_ganzhi_jieqi_dayun_v1', reference: 'doc' }],
  });
  const result = parseAstrologyOutput(text);
  assert.equal(result.ok, true);
});

test('parseAstrologyOutput rejects empty input', () => {
  const result = parseAstrologyOutput('');
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.kind, 'runtime_response_empty');
});

test('parseAstrologyOutput rejects non-JSON', () => {
  const result = parseAstrologyOutput('not json');
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.kind, 'runtime_response_not_json');
});

test('parseAstrologyOutput rejects missing summary', () => {
  const result = parseAstrologyOutput(JSON.stringify({ highlights: [], recommendations: [], citations: [] }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.kind, 'runtime_response_schema_invalid');
});

test('parseAstrologyOutput rejects empty summary', () => {
  const result = parseAstrologyOutput(JSON.stringify({ summary: '   ', highlights: [], recommendations: [], citations: [] }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.kind, 'runtime_response_schema_invalid');
});

test('parseAstrologyOutput rejects extra root keys', () => {
  const result = parseAstrologyOutput(JSON.stringify({
    summary: 'ok',
    highlights: [],
    recommendations: [],
    citations: [],
    luck_score: 99,
  }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.kind, 'runtime_response_schema_invalid');
});

test('parseAstrologyOutput rejects invalid horizon', () => {
  const result = parseAstrologyOutput(JSON.stringify({
    summary: 'ok',
    highlights: [],
    recommendations: [{ body: 'r', subject_ref: 'self', horizon: 'forever' }],
    citations: [],
  }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.kind, 'runtime_response_schema_invalid');
});

test('parseAstrologyOutput rejects bad SubjectRef in highlights', () => {
  const result = parseAstrologyOutput(JSON.stringify({
    summary: 'ok',
    highlights: [{ label: 'h', body: 'b', subject_ref: 'someone-else' }],
    recommendations: [],
    citations: [],
  }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.kind, 'runtime_response_schema_invalid');
});

test('RuntimeTextGeneratorAiClient succeeds end-to-end with a happy stub generator', async () => {
  const snap = featureSnapshotForTest();
  const client = new RuntimeTextGeneratorAiClient({
    modelId: 'test-model',
    generator: async () => ({
      text: JSON.stringify({ summary: 'stub', highlights: [], recommendations: [], citations: [] }),
    }),
  });
  const result = await client.generate({
    feature_snapshot: snap,
    response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.output.summary, 'stub');
});

test('RuntimeTextGeneratorAiClient surfaces runtime_call_failed when generator throws', async () => {
  const snap = featureSnapshotForTest();
  const client = new RuntimeTextGeneratorAiClient({
    modelId: 'test-model',
    generator: async () => {
      throw new Error('forced for test');
    },
  });
  const result = await client.generate({
    feature_snapshot: snap,
    response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.kind, 'runtime_call_failed');
    assert.match(result.error.detail, /forced/);
  }
});

test('RuntimeTextGeneratorAiClient surfaces runtime_response_empty when generator returns no text', async () => {
  const snap = featureSnapshotForTest();
  const client = new RuntimeTextGeneratorAiClient({
    modelId: 'test-model',
    generator: async () => ({ text: '' }),
  });
  const result = await client.generate({
    feature_snapshot: snap,
    response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.kind, 'runtime_response_empty');
});

test('RuntimeTextGeneratorAiClient surfaces runtime_response_schema_invalid when parse rejects', async () => {
  const snap = featureSnapshotForTest();
  const client = new RuntimeTextGeneratorAiClient({
    modelId: 'test-model',
    generator: async () => ({ text: JSON.stringify({ summary: '' }) }),
  });
  const result = await client.generate({
    feature_snapshot: snap,
    response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.kind, 'runtime_response_schema_invalid');
});

test('createSdkRuntimeAiAdapter delegates to the SDK textCaller', async () => {
  const snap = featureSnapshotForTest();
  let observedInput = null;
  const adapter = createSdkRuntimeAiAdapter({
    modelId: 'shijing-test',
    textCaller: {
      async generateText(input) {
        observedInput = input;
        return { text: JSON.stringify({ summary: 's', highlights: [], recommendations: [], citations: [] }), trace: { traceId: 'tr_01' } };
      },
    },
  });
  const result = await adapter.generate({
    feature_snapshot: snap,
    response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
  });
  assert.equal(result.ok, true);
  assert.equal(adapter.adapter_kind, 'sdk_runtime_text');
  assert.equal(observedInput.model, 'shijing-test');
  assert.equal(observedInput.input[0].role, 'user');
});

test('runtime AI source contains no hardcoded provider/model literal', () => {
  const dir = new URL('../src/product/astrology/', import.meta.url);
  const files = readdirSync(dir).filter((name) => name.endsWith('.ts'));
  const forbidden = [
    /\bgpt-/i,
    /\bclaude-/i,
    /\bgemini-/i,
    /\bopenai\b/i,
    /\banthropic\b/i,
    /\bdeepseek-/i,
    /\bgrok-/i,
  ];
  for (const file of files) {
    const source = readFileSync(new URL(file, dir), 'utf8');
    for (const pattern of forbidden) {
      assert.doesNotMatch(source, pattern, `${file} contains forbidden provider/model literal ${pattern}`);
    }
  }
});
