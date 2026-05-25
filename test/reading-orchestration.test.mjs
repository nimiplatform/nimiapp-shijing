// Wave-12 — generateReadingForStorage orchestrator tests + structural
// tab-wiring assertions.

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { generateReadingForStorage } from '../src/product/reading/index.ts';
import { RuntimeTextGeneratorAiClient, NoOpRuntimeAiClient } from '../src/product/astrology/index.ts';
import { validNatalInputs, validShiJingSpace, validTimeWindow } from './_fixtures.mjs';

const goodResponsePrefs = { tone: 'neutral', length: 'standard', language: 'zh-Hans' };

function happyClient() {
  return new RuntimeTextGeneratorAiClient({
    modelId: 'test-model',
    generator: async () => ({
      text: JSON.stringify({
        summary: 'ok',
        highlights: [],
        recommendations: [],
        citations: [],
      }),
    }),
  });
}

test('generateReadingForStorage returns ok + appended Reading on happy path', async () => {
  const space = validShiJingSpace();
  void goodResponsePrefs;
  const outcome = await generateReadingForStorage({
    id: 'reading_test',
    created_at: '2026-05-25T00:00:00Z',
    kind: 'today',
    scope: 'subject',
    anchor_subject: 'self',
    subjects: ['self'],
    time_window: validTimeWindow(),
    space,
    runtime_ai_client: happyClient(),
  });
  assert.equal(outcome.ok, true);
  if (outcome.ok) {
    assert.equal(outcome.reading.id, 'reading_test');
    assert.equal(outcome.next_space.readings.length, space.readings.length + 1);
  }
});

test('generateReadingForStorage surfaces runtime_ai_failed with NoOp client', async () => {
  const space = validShiJingSpace();
  const outcome = await generateReadingForStorage({
    id: 'reading_test_2',
    created_at: '2026-05-25T00:00:00Z',
    kind: 'today',
    scope: 'subject',
    anchor_subject: 'self',
    subjects: ['self'],
    time_window: validTimeWindow(),
    space,
    runtime_ai_client: new NoOpRuntimeAiClient(),
  });
  assert.equal(outcome.ok, false);
  if (!outcome.ok) assert.equal(outcome.error.kind, 'runtime_ai_failed');
});

test('generateReadingForStorage succeeds with lunar_chinese subject (SJG-ALGO-04 tyme4ts)', async () => {
  const inputs = validNatalInputs();
  const lunarInputs = {
    ...inputs,
    calendar_system: 'lunar_chinese',
    raw_birth_input: {
      ...inputs.raw_birth_input,
      calendar_system: 'lunar_chinese',
      lunar_year: 1990,
      lunar_month: 3,
      lunar_day: 18,
      lunar_is_leap_month: false,
      local_time_text: '08:30:00',
    },
  };
  const space = validShiJingSpace({ self_subject: { natal_inputs: lunarInputs } });
  const outcome = await generateReadingForStorage({
    id: 'reading_test_3',
    created_at: '2026-05-25T00:00:00Z',
    kind: 'today',
    scope: 'subject',
    anchor_subject: 'self',
    subjects: ['self'],
    time_window: validTimeWindow(),
    space,
    runtime_ai_client: happyClient(),
  });
  assert.equal(outcome.ok, true);
});

test('today tab source wires generateReadingForStorage + uses store runtime_ai_client', () => {
  const source = readFileSync(new URL('../src/product/tabs/today.tsx', import.meta.url), 'utf8');
  assert.match(source, /generateReadingForStorage/);
  assert.match(source, /runtime_ai_client/);
  assert.match(source, /dispatch\(\{ type: 'snapshot\/replace'/);
});

test('today tab source has no synthesized substitute Reading text', () => {
  const source = readFileSync(new URL('../src/product/tabs/today.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /mock reading/i);
  assert.doesNotMatch(source, /fake astrology/i);
  assert.doesNotMatch(source, /preview Reading text/i);
});

test('consultation tab source wires generateReadingForStorage + uses store runtime_ai_client', () => {
  const source = readFileSync(new URL('../src/product/tabs/consultation.tsx', import.meta.url), 'utf8');
  assert.match(source, /generateReadingForStorage/);
  assert.match(source, /runtime_ai_client/);
  assert.match(source, /dispatch\(\{ type: 'snapshot\/replace'/);
  assert.match(source, /ad_hoc_context_text/);
});

test('product-area source injects real Runtime AI adapter into store provider', () => {
  const source = readFileSync(new URL('../src/shell/routes/product-area.tsx', import.meta.url), 'utf8');
  // SJG-PROD-07 / SJG-ALGO-12: the production product-area wires the
  // SDK-backed runtime AI adapter; NoOpRuntimeAiClient is admitted only as
  // a test/fixture path inside this very test file.
  assert.match(source, /createSdkRuntimeAiAdapter/);
  assert.match(source, /runtime\.ai\.text\.generate/);
  assert.match(source, /runtimeAiClient=\{runtimeAiClient\}/);
  assert.doesNotMatch(source, /NoOpRuntimeAiClient/);
});

test('shijing-store accepts runtimeAiClient prop and exposes it through context', () => {
  const source = readFileSync(new URL('../src/product/state/shijing-store.tsx', import.meta.url), 'utf8');
  assert.match(source, /runtimeAiClient\?: RuntimeAiClient/);
  assert.match(source, /runtime_ai_client/);
});
