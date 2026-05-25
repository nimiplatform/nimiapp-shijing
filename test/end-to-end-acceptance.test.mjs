// Wave-13 — end-to-end acceptance. Drives the full wave-0..12 stack
// programmatically: NatalInputs → canonicalize → natal chart → cycle
// snapshot → feature snapshot → injected AI stub → parse →
// validateReading → snapshot/replace → InMemory persistence
// round-trip. Browser IndexedDB e2e is admitted to a separate
// DOM-aware wave; this test runs under `node --test`.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  RuntimeTextGeneratorAiClient,
  generateReading,
} from '../src/product/astrology/index.ts';
import { generateReadingForStorage } from '../src/product/reading/index.ts';
import { InMemoryPersistenceAdapter } from '../src/product/persistence/in-memory-adapter.ts';
import { validateShiJingSpace } from '../src/contracts/shijing-space-validator.ts';
import { validNatalInputs, validShiJingSpace, validTimeWindow } from './_fixtures.mjs';

function happyAiClient() {
  return new RuntimeTextGeneratorAiClient({
    modelId: 'shijing-e2e-stub',
    generator: async () => ({
      text: JSON.stringify({
        summary: 'e2e summary',
        highlights: [{ label: 'h', body: 'b', subject_ref: 'self' }],
        recommendations: [{ body: 'rest', subject_ref: 'self', horizon: 'today' }],
        citations: [{ method: 'bazi_ganzhi_jieqi_dayun_v1', reference: 'doc' }],
      }),
    }),
  });
}

function emptyAiClient() {
  return new RuntimeTextGeneratorAiClient({
    modelId: 'shijing-e2e-stub-empty',
    generator: async () => ({ text: '' }),
  });
}

function malformedJsonAiClient() {
  return new RuntimeTextGeneratorAiClient({
    modelId: 'shijing-e2e-stub-malformed',
    generator: async () => ({ text: '{ not: json' }),
  });
}

function schemaInvalidAiClient() {
  return new RuntimeTextGeneratorAiClient({
    modelId: 'shijing-e2e-stub-schema',
    generator: async () => ({
      text: JSON.stringify({ summary: 'x', highlights: [], recommendations: [], citations: [], luck_score: 99 }),
    }),
  });
}

test('e2e happy path: pipeline → AI → validateReading → snapshot/replace → persistence round-trip', async () => {
  const space = validShiJingSpace();
  const adapter = new InMemoryPersistenceAdapter();
  const outcome = await generateReadingForStorage({
    id: 'reading_e2e_happy',
    created_at: '2026-05-25T00:00:00Z',
    kind: 'today',
    scope: 'subject',
    anchor_subject: 'self',
    subjects: ['self'],
    time_window: validTimeWindow(),
    space,
    runtime_ai_client: happyAiClient(),
  });
  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  // Persist
  const saveResult = await adapter.save(outcome.next_space);
  assert.equal(saveResult.ok, true);
  // Reload + revalidate
  const loadResult = await adapter.load();
  assert.equal(loadResult.ok, true);
  if (loadResult.ok && loadResult.snapshot) {
    const validation = validateShiJingSpace(loadResult.snapshot);
    assert.equal(validation.ok, true);
    assert.equal(loadResult.snapshot.readings.length, 1);
    assert.equal(loadResult.snapshot.readings[0].id, 'reading_e2e_happy');
    assert.equal(loadResult.snapshot.readings[0].output.summary, 'e2e summary');
  }
});

test('e2e fail-close: empty AI text → runtime_response_empty', async () => {
  const space = validShiJingSpace();
  const outcome = await generateReadingForStorage({
    id: 'reading_e2e_empty',
    created_at: '2026-05-25T00:00:00Z',
    kind: 'today',
    scope: 'subject',
    anchor_subject: 'self',
    subjects: ['self'],
    time_window: validTimeWindow(),
    space,
    runtime_ai_client: emptyAiClient(),
  });
  assert.equal(outcome.ok, false);
  if (!outcome.ok && outcome.error.kind === 'runtime_ai_failed') {
    assert.equal(outcome.error.ai_failure.kind, 'runtime_response_empty');
  }
});

test('e2e fail-close: malformed JSON → runtime_response_not_json', async () => {
  const space = validShiJingSpace();
  const outcome = await generateReadingForStorage({
    id: 'reading_e2e_malformed',
    created_at: '2026-05-25T00:00:00Z',
    kind: 'today',
    scope: 'subject',
    anchor_subject: 'self',
    subjects: ['self'],
    time_window: validTimeWindow(),
    space,
    runtime_ai_client: malformedJsonAiClient(),
  });
  assert.equal(outcome.ok, false);
  if (!outcome.ok && outcome.error.kind === 'runtime_ai_failed') {
    assert.equal(outcome.error.ai_failure.kind, 'runtime_response_not_json');
  }
});

test('e2e fail-close: schema-invalid JSON → runtime_response_schema_invalid', async () => {
  const space = validShiJingSpace();
  const outcome = await generateReadingForStorage({
    id: 'reading_e2e_schema',
    created_at: '2026-05-25T00:00:00Z',
    kind: 'today',
    scope: 'subject',
    anchor_subject: 'self',
    subjects: ['self'],
    time_window: validTimeWindow(),
    space,
    runtime_ai_client: schemaInvalidAiClient(),
  });
  assert.equal(outcome.ok, false);
  if (!outcome.ok && outcome.error.kind === 'runtime_ai_failed') {
    assert.equal(outcome.error.ai_failure.kind, 'runtime_response_schema_invalid');
  }
});

test('e2e: lunar_chinese subject succeeds via tyme4ts conversion (SJG-ALGO-04)', async () => {
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
    id: 'reading_e2e_lunar',
    created_at: '2026-05-25T00:00:00Z',
    kind: 'today',
    scope: 'subject',
    anchor_subject: 'self',
    subjects: ['self'],
    time_window: validTimeWindow(),
    space,
    runtime_ai_client: happyAiClient(),
  });
  assert.equal(outcome.ok, true);
});

test('e2e fail-close: DaYun-required (period_outlook) + calculation_sex=unspecified per SJG-ALGO-07', async () => {
  // Wave-13 SJG-ALGO-07 + GAP-19: generateReading auto-derives
  // dayun_required from kind/scope/view/time_window. `period_outlook`
  // (or any view-scoped period_outlook / key_window / >90d window)
  // turns on DaYun. validNatalInputs has `calculation_sex:
  // 'unspecified'`, so the deterministic stage MUST fail-close.
  const space = validShiJingSpace();
  const result = await generateReading(
    {
      id: 'reading_e2e_dayun',
      created_at: '2026-05-25T00:00:00Z',
      kind: 'period_outlook',
      scope: 'subject',
      anchor_subject: 'self',
      subjects: ['self'],
      time_window: validTimeWindow(),
      space,
    },
    { runtime_ai_client: happyAiClient() },
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.kind, 'pipeline_stage_failed');
  }
});

test('e2e ok: DaYun-required (period_outlook) + calculation_sex=female passes deterministic stage', async () => {
  // Counterpart to the fail-close test above: providing calculation_sex
  // lets the DaYun stage proceed; the pipeline then reaches the AI
  // stub and the final Reading is persisted.
  const inputs = { ...validNatalInputs(), calculation_sex: 'female' };
  const space = validShiJingSpace({ self_subject: { natal_inputs: inputs } });
  const result = await generateReading(
    {
      id: 'reading_e2e_dayun_ok',
      created_at: '2026-05-25T00:00:00Z',
      kind: 'period_outlook',
      scope: 'subject',
      anchor_subject: 'self',
      subjects: ['self'],
      time_window: validTimeWindow(),
      space,
    },
    { runtime_ai_client: happyAiClient() },
  );
  assert.equal(result.ok, true);
});

test('e2e persistence load of invalid stored snapshot fails-close', async () => {
  const broken = validShiJingSpace();
  broken.profiles = []; // removed-surface key
  const adapter = new InMemoryPersistenceAdapter(broken);
  const load = await adapter.load();
  assert.equal(load.ok, false);
  if (!load.ok) assert.equal(load.error.kind, 'load_invalid_snapshot');
});
