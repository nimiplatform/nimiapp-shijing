// Wave-12 — generateReadingForStorage orchestrator tests + structural
// tab-wiring assertions.

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { generateReadingForStorage } from '../src/product/reading/index.ts';
import { RuntimeTextGeneratorAiClient, NoOpRuntimeAiClient } from '../src/product/astrology/index.ts';
import { generateReading } from '../src/product/astrology/index.ts';
import {
  buildConsultationContextText,
  consultationTimeWindowFromDays,
  parseConsultationHorizonDays,
} from '../src/product/consultation/consultation-flow.ts';
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

function outputClient(summary) {
  return new RuntimeTextGeneratorAiClient({
    modelId: 'test-model',
    generator: async () => ({
      text: JSON.stringify({
        summary,
        highlights: [{ label: '重点', body: summary, subject_ref: 'self' }],
        recommendations: [{ body: summary, subject_ref: 'self', horizon: 'today' }],
        citations: [{ method: 'bazi_ganzhi_jieqi_dayun_v1', reference: 'contract v1' }],
      }),
    }),
  });
}

async function generatedInputHash(input, summary = 'ok') {
  const outcome = await generateReading(input, { runtime_ai_client: outputClient(summary) });
  assert.equal(outcome.ok, true);
  if (!outcome.ok) return '';
  return outcome.reading.inputs_summary.input_hash;
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

test('SJG-ALGO-11: input_hash changes when selected relation summaries change', async () => {
  const baseInput = {
    id: 'reading_hash_rel_a',
    created_at: '2026-05-25T00:00:00Z',
    kind: 'today',
    scope: 'subject',
    anchor_subject: 'self',
    subjects: ['self'],
    time_window: validTimeWindow(),
  };
  const person = {
    id: 'p_rel',
    display_name: 'Relation Person',
    kind: 'person',
    natal_inputs: validNatalInputs(),
    consent_state: 'owner_recorded',
  };
  const withoutRelation = validShiJingSpace({ persons: [person], relations: [] });
  const withRelation = validShiJingSpace({
    persons: [person],
    relations: [
      { id: 'rel_01', from_subject: 'self', to_subject: { kind: 'person', id: 'p_rel' }, relation_kind: 'partner' },
    ],
  });
  const h1 = await generatedInputHash({ ...baseInput, space: withoutRelation });
  const h2 = await generatedInputHash({ ...baseInput, id: 'reading_hash_rel_b', space: withRelation });
  assert.notEqual(h1, h2);
});

test('SJG-ALGO-11: input_hash changes when selected event summaries change', async () => {
  const baseInput = {
    id: 'reading_hash_event_a',
    created_at: '2026-05-25T00:00:00Z',
    kind: 'today',
    scope: 'subject',
    anchor_subject: 'self',
    subjects: ['self'],
    time_window: validTimeWindow(),
  };
  const withoutEvent = validShiJingSpace({ events: [] });
  const withEvent = validShiJingSpace({
    events: [
      { id: 'ev_01', primary_subject: 'self', participants: [], occurred_at: '2026-05-25T12:00:00Z', title: '窗口内事件', view_refs: [] },
    ],
  });
  const h1 = await generatedInputHash({ ...baseInput, space: withoutEvent });
  const h2 = await generatedInputHash({ ...baseInput, id: 'reading_hash_event_b', space: withEvent });
  assert.notEqual(h1, h2);
});

test('SJG-ALGO-11: input_hash changes when view context snapshot changes', async () => {
  const space = validShiJingSpace({
    self_subject: { natal_inputs: validNatalInputs({ calculation_sex: 'female' }) },
  });
  const baseView = {
    id: 'v_hash',
    title: 'hash view',
    anchor_subject: 'self',
    subjects: ['self'],
    time_scope: 'rolling',
    rolling_window_days: 30,
    context_items: [{ id: 'ctx_01', kind: 'note', body: '原始上下文', created_at: '2026-05-25T00:00:00Z' }],
    instructions: '看节奏',
    view_memory: { summary: '旧记忆', updated_at: '2026-05-20T00:00:00Z', locked: false },
    display_state: 'normal',
  };
  const baseInput = {
    id: 'reading_hash_view_a',
    created_at: '2026-05-25T00:00:00Z',
    kind: 'consultation',
    scope: 'view',
    anchor_subject: 'self',
    subjects: ['self'],
    time_window: validTimeWindow(),
    space,
  };
  const changedView = {
    ...baseView,
    context_items: [
      ...baseView.context_items,
      { id: 'ctx_02', kind: 'note', body: '新增上下文', created_at: '2026-05-26T00:00:00Z' },
    ],
  };
  const h1 = await generatedInputHash({ ...baseInput, view: baseView });
  const h2 = await generatedInputHash({ ...baseInput, id: 'reading_hash_view_b', view: changedView });
  assert.notEqual(h1, h2);
});

test('SJG-ALGO-11: input_hash changes when ad_hoc_context text changes', async () => {
  const baseInput = {
    id: 'reading_hash_adhoc_a',
    created_at: '2026-05-25T00:00:00Z',
    kind: 'consultation',
    scope: 'ad_hoc',
    anchor_subject: 'self',
    subjects: ['self'],
    time_window: validTimeWindow(),
    space: validShiJingSpace(),
  };
  const h1 = await generatedInputHash({ ...baseInput, ad_hoc_context_text: '是否换方向？' });
  const h2 = await generatedInputHash({
    ...baseInput,
    id: 'reading_hash_adhoc_b',
    ad_hoc_context_text: '是否先休整再换方向？',
  });
  assert.notEqual(h1, h2);
});

test('SJG-ALGO-11: unrelated Runtime AI output does not affect input_hash', async () => {
  const input = {
    id: 'reading_hash_output_a',
    created_at: '2026-05-25T00:00:00Z',
    kind: 'today',
    scope: 'subject',
    anchor_subject: 'self',
    subjects: ['self'],
    time_window: validTimeWindow(),
    space: validShiJingSpace(),
  };
  const h1 = await generatedInputHash(input, '第一版 wording');
  const h2 = await generatedInputHash({ ...input, id: 'reading_hash_output_b' }, '第二版 wording');
  assert.equal(h1, h2);
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

test('consultation flow parses explicit positive horizon days', () => {
  assert.deepEqual(parseConsultationHorizonDays('30'), { ok: true, days: 30 });
  assert.equal(parseConsultationHorizonDays('').ok, false);
  assert.equal(parseConsultationHorizonDays('2.5').ok, false);
  assert.equal(parseConsultationHorizonDays('0').ok, false);
});

test('consultationTimeWindowFromDays derives a bounded ad_hoc_question window from generation time', () => {
  const window = consultationTimeWindowFromDays('Asia/Shanghai', 7, new Date('2026-05-25T08:00:00Z'));
  assert.equal(window.mode, 'bounded');
  assert.equal(window.start_utc, '2026-05-25T08:00:00.000Z');
  assert.equal(window.end_utc, '2026-06-01T08:00:00.000Z');
  assert.equal(window.source, 'ad_hoc_question');
});

test('view-context consultation preserves the question in ad-hoc context text', () => {
  const text = buildConsultationContextText({
    question: ' 是否换方向？ ',
    view: {
      id: 'v_01',
      title: '工作节奏观察',
      anchor_subject: 'self',
      subjects: ['self'],
      time_scope: 'rolling',
      rolling_window_days: 14,
      context_items: [{ id: 'ctx_01', kind: 'note', body: '近期沟通压力升高', created_at: '2026-05-25T00:00:00Z' }],
      instructions: '偏重节奏',
      view_memory: { summary: '上次关注长期选择', updated_at: '2026-05-25T00:00:00Z', locked: false },
      display_state: 'normal',
    },
  });
  assert.match(text, /问题：是否换方向？/);
  assert.match(text, /借用关注：工作节奏观察/);
  assert.match(text, /关注指示：偏重节奏/);
  assert.match(text, /上下文\/note：近期沟通压力升高/);
});

test('consultation tab clarifies basis and keeps view-context generation ad-hoc', () => {
  const source = readFileSync(new URL('../src/product/tabs/consultation.tsx', import.meta.url), 'utf8');
  assert.match(source, /consultation-horizon-days/);
  assert.match(source, /view_context/);
  assert.match(source, /resolveViewTimeWindow/);
  assert.match(source, /buildConsultationContextText/);
  assert.match(source, /scope: 'ad_hoc'/);
  assert.doesNotMatch(source, /scope: 'view'/);
});

test('consultation follow-up creates a validated source-bound empty Conversation boundary', () => {
  const source = readFileSync(new URL('../src/product/tabs/consultation.tsx', import.meta.url), 'utf8');
  assert.match(source, /ConversationThreadOverlay/);
  assert.match(source, /validateShiJingSpace\(nextSnapshot\)/);
  assert.match(source, /source_reading_id: reading\.id/);
  assert.match(source, /turns: \[\]/);
  assert.doesNotMatch(source, /role: 'ai'/);
  assert.doesNotMatch(source, /role: 'user'/);
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
