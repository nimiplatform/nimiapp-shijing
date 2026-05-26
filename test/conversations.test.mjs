// SJG-DATA-08 (data-model-contract.md lines 274-298) — Conversation
// id factory + chat bridge contract + structural assertions on the
// Conversation UI tree.

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';

import {
  newConversationId,
  newConversationTurnId,
} from '../src/product/conversations/conversation-id.ts';
import {
  CONVERSATION_SYSTEM_PROMPT,
  createConversationChatBridge,
  createUnavailableConversationChatBridge,
} from '../src/product/conversations/conversation-chat-bridge.ts';

function sourceReadingContext(overrides = {}) {
  return {
    id: 'reading_source_01',
    kind: 'consultation',
    scope: 'ad_hoc',
    anchor_subject: 'self',
    time_window: {
      mode: 'bounded',
      start_utc: '2026-05-25T00:00:00Z',
      end_utc: '2026-05-26T00:00:00Z',
      basis_time_zone: 'Asia/Shanghai',
      source: 'ad_hoc_question',
    },
    output: {
      summary: 'source summary',
      highlights: [],
      recommendations: [],
    },
    inputs_summary: {
      input_hash: 'input-hash-1',
      feature_snapshot_hash: 'feature-hash-1',
      method_profile: { id: 'bazi_ganzhi_jieqi_dayun_v1' },
      stage_label: '守时',
      uncertainty_inputs: ['view_context_sparse'],
    },
    uncertainty: {
      confidence: 'medium',
      caveats: ['caveat'],
      data_gaps: [],
    },
    ...overrides,
  };
}

test('SJG-DATA-08: newConversationId and newConversationTurnId return unique non-empty strings', () => {
  const a = newConversationId();
  const b = newConversationId();
  const t1 = newConversationTurnId();
  const t2 = newConversationTurnId();
  assert.ok(a.length > 0);
  assert.ok(b.length > 0);
  assert.notEqual(a, b);
  assert.ok(t1.length > 0);
  assert.ok(t2.length > 0);
  assert.notEqual(t1, t2);
});

test('SJG-ASTRO-05 (extended): CONVERSATION_SYSTEM_PROMPT bans 吉凶 and luck score', () => {
  assert.ok(CONVERSATION_SYSTEM_PROMPT.includes('不能预言吉凶'));
  assert.ok(CONVERSATION_SYSTEM_PROMPT.includes('不能输出 luck score'));
  assert.ok(CONVERSATION_SYSTEM_PROMPT.includes('source_reading'));
  assert.ok(CONVERSATION_SYSTEM_PROMPT.includes('不能做新的占星推算'));
});

test('SJG-DATA-08: conversation chat bridge sends only source Reading context and returns ok=true', async () => {
  const source_reading = sourceReadingContext();
  const bridge = createConversationChatBridge({
    generator: async ({ system, user, modelId }) => {
      assert.equal(system, CONVERSATION_SYSTEM_PROMPT);
      const payload = JSON.parse(user);
      assert.equal(payload.user_message, 'hello');
      assert.equal(payload.source_reading.id, 'reading_source_01');
      assert.equal(payload.source_reading.output.summary, 'source summary');
      assert.equal(payload.source_reading.inputs_summary.input_hash, 'input-hash-1');
      assert.equal(payload.source_reading.inputs_summary.stage_label, '守时');
      assert.equal('ad_hoc_context' in payload.source_reading.inputs_summary, false);
      assert.equal('feature_snapshot' in payload.source_reading.inputs_summary, false);
      assert.equal(modelId, 'auto');
      return { text: 'world' };
    },
  });
  const result = await bridge.send({ user_message: 'hello', model_id: 'auto', source_reading });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.text, 'world');
});

test('SJG-DATA-08: conversation chat bridge surfaces generator_call_failed when generator throws', async () => {
  const bridge = createConversationChatBridge({
    generator: async () => {
      throw new Error('boom');
    },
  });
  const result = await bridge.send({ user_message: 'x', model_id: 'auto', source_reading: sourceReadingContext() });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.kind, 'generator_call_failed');
    assert.match(result.error.detail, /boom/);
  }
});

test('SJG-DATA-08: conversation chat bridge surfaces generator_response_empty on empty text', async () => {
  const bridge = createConversationChatBridge({
    generator: async () => ({ text: '' }),
  });
  const result = await bridge.send({ user_message: 'x', model_id: 'auto', source_reading: sourceReadingContext() });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.kind, 'generator_response_empty');
});

test('SJG-DATA-08: unavailable bridge always returns generator_unavailable (fail-close)', async () => {
  const bridge = createUnavailableConversationChatBridge();
  const result = await bridge.send({ user_message: 'x', model_id: 'auto', source_reading: sourceReadingContext() });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.kind, 'generator_unavailable');
});

test('SJG-DATA-08: conversations UI source contains no fetch/HTTP/Tauri/AI-provider call', () => {
  const dir = new URL('../src/product/conversations/', import.meta.url);
  const files = readdirSync(dir).filter((name) => name.endsWith('.ts') || name.endsWith('.tsx'));
  const forbidden = [
    /fetch\s*\(/,
    /XMLHttpRequest/,
    /\baxios\b/,
    /\bgrpc\b/,
    /WebSocket/,
    /\binvoke\s*\(/,
    /@tauri-apps/,
    /\bgpt-/i,
    /\bclaude-/i,
    /\bgemini-/i,
    /\bopenai\b/i,
    /\banthropic\b/i,
  ];
  for (const file of files) {
    const source = readFileSync(new URL(file, dir), 'utf8');
    for (const pattern of forbidden) {
      assert.doesNotMatch(source, pattern, `${file} contains forbidden primitive ${pattern}`);
    }
  }
});

test('SJG-DATA-08: ConversationThread sends user turn through validateShiJingSpace before dispatch', () => {
  const source = readFileSync(
    new URL('../src/product/conversations/conversation-thread.tsx', import.meta.url),
    'utf8',
  );
  const userValidateIdx = source.indexOf('validateShiJingSpace(snapshotWithUser)');
  const userDispatchIdx = source.indexOf("dispatch({ type: 'snapshot/replace', snapshot: snapshotWithUser })");
  const aiValidateIdx = source.indexOf('validateShiJingSpace(snapshotWithAi)');
  const aiDispatchIdx = source.indexOf("dispatch({ type: 'snapshot/replace', snapshot: snapshotWithAi })");
  assert.ok(userValidateIdx >= 0);
  assert.ok(userDispatchIdx >= 0);
  assert.ok(userValidateIdx < userDispatchIdx);
  assert.ok(aiValidateIdx >= 0);
  assert.ok(aiDispatchIdx >= 0);
  assert.ok(aiValidateIdx < aiDispatchIdx);
});

test('SJG-DATA-08: ConversationThread guards bridge send by source Reading resolution', () => {
  const source = readFileSync(
    new URL('../src/product/conversations/conversation-thread.tsx', import.meta.url),
    'utf8',
  );
  const sourceGuardIdx = source.indexOf('if (!sourceReading)');
  const bridgeSendIdx = source.indexOf('conversation_chat_bridge.send');
  assert.ok(sourceGuardIdx >= 0);
  assert.ok(bridgeSendIdx >= 0);
  assert.ok(sourceGuardIdx < bridgeSendIdx);
  assert.match(source, /source_reading: buildConversationSourceReadingContext\(sourceReading\)/);
  assert.match(source, /input_hash: reading\.inputs_summary\.input_hash/);
  assert.match(source, /feature_snapshot_hash: reading\.inputs_summary\.feature_snapshot_hash/);
  assert.doesNotMatch(source, /ad_hoc_context: reading\.inputs_summary\.ad_hoc_context/);
});

test('SJG-DATA-08: ConversationList create flow validates space before dispatch', () => {
  const source = readFileSync(
    new URL('../src/product/conversations/conversation-list.tsx', import.meta.url),
    'utf8',
  );
  const spaceIdx = source.indexOf('validateShiJingSpace(nextSnapshot)');
  const dispatchIdx = source.indexOf("dispatch({ type: 'snapshot/replace'");
  assert.ok(spaceIdx >= 0);
  assert.ok(dispatchIdx >= 0);
  assert.ok(spaceIdx < dispatchIdx);
});

test('SJG-DATA-08: conversation chat bridge never synthesizes a substitute turn on failure', async () => {
  // Fail-close: the bridge MUST NOT return a default text on error. We
  // verify by passing a throwing generator and asserting result.ok is
  // false (text field absent) — proxy for the "no synthesized
  // substitute Reading" rule extended to chat turns.
  const bridge = createConversationChatBridge({
    generator: async () => {
      throw new Error('upstream down');
    },
  });
  const result = await bridge.send({ user_message: 'x', model_id: 'auto', source_reading: sourceReadingContext() });
  assert.equal(result.ok, false);
  assert.equal('text' in result, false);
});
