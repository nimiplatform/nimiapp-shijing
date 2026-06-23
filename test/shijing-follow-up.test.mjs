import assert from 'node:assert/strict';
import test from 'node:test';

import { sendConversationFollowUp } from '../src/product/conversations/conversation-follow-up.ts';
import { validConcernTag, validConversation, validReading, validShiJingSpace } from './_fixtures.mjs';

function conversationWithSourceReading(id) {
  const conversation = validConversation({ id: 'c_active', source_reading_ids: [id] });
  return {
    ...conversation,
    turns: conversation.turns.map((turn) =>
      turn.role === 'ai' ? { ...turn, cited_reading_ids: [id] } : turn,
    ),
  };
}

test('ShiJing follow-up appends turns to the active conversation without creating a new Reading', async () => {
  const sourceReading = validReading({ id: 'r_source' });
  const unrelatedReading = validReading({ id: 'r_other' });
  const conversation = conversationWithSourceReading('r_source');
  const space = validShiJingSpace({
    concern_tags: [validConcernTag('tag_love')],
    readings: [sourceReading, unrelatedReading],
    conversations: [conversation],
  });
  const bridgeCalls = [];

  const result = await sendConversationFollowUp({
    space,
    conversation_id: 'c_active',
    question: '那我可以继续推进吗?',
    bridge: {
      async send(request) {
        bridgeCalls.push(request);
        return { ok: true, text: '可以继续,但只围绕已引用的 reading 解释。' };
      },
    },
    now: () => '2026-05-25T00:03:00Z',
    new_turn_id: (() => {
      const ids = ['t_follow_user', 't_follow_ai'];
      return () => ids.shift();
    })(),
  });

  assert.equal(result.ok, true);
  assert.deepEqual(bridgeCalls.map((call) => call.source_readings.map((r) => r.id)), [['r_source']]);
  if (!result.ok) return;

  assert.equal(result.next_space.readings.length, 2);
  assert.deepEqual(result.next_space.readings.map((r) => r.id), ['r_source', 'r_other']);
  assert.equal(result.next_space.conversations.length, 1);

  const updated = result.next_space.conversations[0];
  assert.equal(updated.id, 'c_active');
  assert.equal(updated.turns.length, 4);
  assert.deepEqual(
    updated.turns.slice(2).map((turn) => ({
      id: turn.id,
      role: turn.role,
      body: turn.body,
      cited_reading_ids: turn.cited_reading_ids,
      created_at: turn.created_at,
    })),
    [
      {
        id: 't_follow_user',
        role: 'user',
        body: '那我可以继续推进吗?',
        cited_reading_ids: [],
        created_at: '2026-05-25T00:03:00Z',
      },
      {
        id: 't_follow_ai',
        role: 'ai',
        body: '可以继续,但只围绕已引用的 reading 解释。',
        cited_reading_ids: ['r_source'],
        created_at: '2026-05-25T00:03:00Z',
      },
    ],
  );
});

test('ShiJing follow-up fails closed when the chat bridge fails', async () => {
  const sourceReading = validReading({ id: 'r_source' });
  const conversation = conversationWithSourceReading('r_source');
  const space = validShiJingSpace({
    concern_tags: [validConcernTag('tag_love')],
    readings: [sourceReading],
    conversations: [conversation],
  });

  const result = await sendConversationFollowUp({
    space,
    conversation_id: 'c_active',
    question: '继续说',
    bridge: {
      async send() {
        return { ok: false, error: { kind: 'generator_call_failed', detail: 'runtime down' } };
      },
    },
    now: () => '2026-05-25T00:03:00Z',
    new_turn_id: () => 'unused',
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.failure.kind, 'chat_bridge_failed');
  assert.equal(result.failure.detail, 'runtime down');
});
