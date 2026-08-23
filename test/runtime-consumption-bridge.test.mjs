import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createShijingConversationChatBridge,
  createShijingRuntimeAiClient,
  generateShijingTextCandidate,
} from '../src/shell/ai/shijing-runtime-ai.ts';
import {
  validReading,
  validRijingOutput,
} from './_fixtures.mjs';

function clientReturning(text, calls) {
  return {
    ai: {
      text: {
        async generateCandidate(input) {
          calls.push(input);
          return { text, finishReason: 'stop', traceId: 'trace-shijing-1' };
        },
      },
    },
  };
}

function rijingPatch() {
  return {
    patch_kind: 'shijing.runtime_ai_wording_patch.v1',
    mirror_kind: 'rijing',
    summary: 'Runtime refined day.',
    daily_overview: 'Runtime refined overview.',
    concern_projections: [{
      concern_tag_ref: 'tag_love',
      summary: 'Runtime refined connection.',
      recommendations: ['Runtime recommendation.'],
    }],
  };
}

function promptRequest() {
  return {
    mirror_kind: 'rijing',
    system_prompt: 'system contract',
    user_prompt: 'user contract',
    schema_name: 'shijing.runtime_ai_wording_patch.rijing.v1',
    deterministic_output: validRijingOutput(),
  };
}

test('ShiJing text generation uses one bounded App self candidate request', async () => {
  const calls = [];
  const client = clientReturning('candidate text', calls);

  const text = await generateShijingTextCandidate({
    getClient: () => client,
    system: 'system contract',
    user: 'user evidence',
  });

  assert.equal(text, 'candidate text');
  assert.deepEqual(calls, [{
    messages: [
      { role: 'system', text: 'system contract' },
      { role: 'user', text: 'user evidence' },
    ],
  }]);
  assert.equal('agents' in client, false);
  assert.equal('conversation' in client, false);
});

test('Runtime wording applies the direct candidate without Agent framing', async () => {
  const calls = [];
  const client = clientReturning(JSON.stringify(rijingPatch()), calls);
  const runtimeAI = createShijingRuntimeAiClient({ getClient: () => client });

  const result = await runtimeAI.generate('rijing', promptRequest());

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.output.summary, 'Runtime refined day.');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].messages[0].text, 'system contract');
  assert.equal(calls[0].messages[1].text, 'user contract');
  assert.equal(JSON.stringify(calls).includes('Agent transport framing'), false);
  assert.equal(JSON.stringify(calls).includes('<message'), false);
});

test('ShiJing-owned consultation remains grounded and uses no Runtime Agent conversation', async () => {
  const calls = [];
  const client = clientReturning('Grounded ShiJing answer.', calls);
  const bridge = createShijingConversationChatBridge({ getClient: () => client });

  const result = await bridge.send({
    user_message: 'What should I focus on?',
    source_readings: [validReading()],
  });

  assert.deepEqual(result, { ok: true, text: 'Grounded ShiJing answer.' });
  assert.equal(calls.length, 1);
  assert.match(calls[0].messages[0].text, /ShiJing 问镜/u);
  assert.match(calls[0].messages[1].text, /What should I focus on/u);
  assert.equal('agents' in client, false);
  assert.equal('conversation' in client, false);
});

test('typed candidate failures remain Runtime AI failures without fallback', async () => {
  const runtimeAI = createShijingRuntimeAiClient({
    getClient: () => ({
      ai: {
        text: {
          async generateCandidate() {
            throw Object.assign(new Error('AI_CONFIG_NOT_FOUND'), {
              reasonCode: 'AI_CONFIG_NOT_FOUND',
            });
          },
        },
      },
    }),
  });

  const result = await runtimeAI.generate('rijing', promptRequest());
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.failure.kind, 'runtime_unavailable');
    assert.match(result.failure.detail, /AI_CONFIG_NOT_FOUND/u);
  }
});
