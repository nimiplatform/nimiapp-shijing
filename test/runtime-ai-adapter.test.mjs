// SJG-ASTRO-11 + SJG-ALGO-13 — Runtime AI boundary tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildRuntimeAiPromptRequest,
} from '../src/product/astrology/runtime-ai-prompt.ts';
import { parseRuntimeAiOutput } from '../src/product/astrology/runtime-ai-parse.ts';
import { MockRuntimeAiClient } from '../src/product/astrology/mock-runtime-ai-client.ts';
import {
  dailyMirrorScope,
  validConcernTagSnapshot,
  validInputsSummary,
  validRijingOutput,
} from './_fixtures.mjs';

const TZ = 'Asia/Shanghai';

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
    response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
  });
  assert.equal(request.schema_name, 'shijing.mirror_output.rijing.v1');
  assert.ok(request.system_prompt.includes('Deterministic'));
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
