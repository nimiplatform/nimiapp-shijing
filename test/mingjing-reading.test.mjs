// SJG-ASTRO-12 — 命镜 AI 解读 Reading: end-to-end generation through the Reading
// pipeline with a fake Runtime AI client (the real model is never called in
// tests). Proves the mingjing kind + natal scope + MingJingMirrorOutput validate,
// that event_validations are deterministic, and that an incomplete AI narrative
// fails closed (no fabricated reading).

import assert from 'node:assert/strict';
import test from 'node:test';
import { generateReading } from '../src/product/astrology/generate-reading.ts';
import { validateReading } from '../src/contracts/reading-validator.ts';
import { localWallClockToUtcInstant } from '../src/product/astrology/local-wall-clock.ts';

const TZ = 'Asia/Shanghai';
const NOW = new Date('2026-06-22T01:00:00Z');

function baseSpace() {
  const natal = {
    raw_birth_input: { calendar_system: 'gregorian', local_date_text: '1990-04-12', local_time_text: '08:30', place_text: 'Shanghai' },
    birth_datetime_utc: localWallClockToUtcInstant('1990-04-12T08:30:00', TZ).toISOString(),
    birth_precision: 'exact',
    calendar_system: 'gregorian',
    calculation_sex: 'male',
    birth_location: { latitude: 31.23, longitude: 121.47, iana_time_zone: TZ, place_name: 'Shanghai' },
  };
  return {
    user_id: 'u',
    self_subject: { natal_inputs: natal },
    persons: [],
    concern_tags: [],
    event_memories: [
      {
        id: 'mem_e1',
        occurred_at: '2015-06-01T00:00:00Z',
        body: '换了一份新工作',
        person_refs: [],
        concern_tag_refs: [],
        source: 'manual',
        admissible_use: 'eligible_for_retrieval',
        created_at: '2015-06-02T00:00:00Z',
        updated_at: '2015-06-02T00:00:00Z',
      },
    ],
    plan_items: [],
    readings: [],
    conversations: [],
    settings: { ui_language: 'zh', response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' } },
  };
}

// Fake client: fills the narrative fields of the deterministic structural output.
const fillingClient = {
  async generate(_kind, request) {
    const base = request.deterministic_output;
    return {
      ok: true,
      output: {
        ...base,
        summary: '命局总览一句话。',
        core: {
          personality: '性格底色描述。',
          strengths: '优势能力描述。',
          long_term_themes: '长期课题描述。',
          relationship_pattern: '关系模式描述。',
          career_inclination: '事业倾向描述。',
        },
        life_stage_strategies: base.life_stage_strategies.map((s) => ({
          ...s,
          theme: '阶段主题。',
          strategy: '该阶段的策略建议。',
        })),
      },
    };
  },
};

// Fake client that leaves core empty → must fail closed.
const emptyCoreClient = {
  async generate(_kind, request) {
    return { ok: true, output: { ...request.deterministic_output, summary: '总览。' } };
  },
};

const baseInput = (space) => ({
  id: 'rdg_mj_1',
  created_at: '2026-06-22T00:00:00Z',
  mirror_kind: 'mingjing',
  mirror_scope: { kind: 'natal', anchor_year: 2026, basis_time_zone: TZ },
  related_person_refs: [],
  concern_tag_refs: [],
  cited_reading_ids: [],
  cited_event_memory_refs: ['mem_e1'],
  cited_plan_item_refs: [],
  space,
});

test('命镜 reading: generates a valid MingJing AI 解读 grounded in the chart + history', async () => {
  const result = await generateReading(baseInput(baseSpace()), { runtime_ai_client: fillingClient, now: NOW });
  assert.equal(result.ok, true, JSON.stringify(result));
  const reading = result.reading;
  assert.equal(reading.mirror_kind, 'mingjing');
  assert.equal(reading.mirror_scope.kind, 'natal');

  const output = reading.output;
  assert.equal(output.mirror_kind, 'mingjing');
  assert.equal(output.core.personality, '性格底色描述。');
  assert.ok(output.life_stage_strategies.length >= 1);
  assert.ok(output.life_stage_strategies.every((s) => s.theme && s.strategy && s.dayun_pillar));

  // 历史事件验证 is deterministic — the cited 2015 event is mapped onto the timeline.
  assert.equal(output.event_validations.length, 1);
  assert.equal(output.event_validations[0].event_memory_ref, 'mem_e1');
  assert.equal(output.event_validations[0].occurred_year, 2015);
  assert.ok(output.event_validations[0].note.includes('2015'));

  // The whole reading passes the Reading contract (hashes, kind/scope, citations).
  assert.equal(validateReading(reading).ok, true, JSON.stringify(validateReading(reading)));
});

test('命镜 reading: fails closed when the AI omits the core narrative (no fabrication)', async () => {
  const result = await generateReading(baseInput(baseSpace()), { runtime_ai_client: emptyCoreClient, now: NOW });
  assert.equal(result.ok, false);
  assert.equal(result.failure.kind, 'runtime_ai_failed');
});

test('命镜 reading: fails closed without a runtime AI client', async () => {
  const result = await generateReading(baseInput(baseSpace()), { now: NOW });
  assert.equal(result.ok, false);
  assert.equal(result.failure.kind, 'runtime_ai_failed');
});
