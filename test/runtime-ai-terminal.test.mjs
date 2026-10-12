import assert from 'node:assert/strict';
import test from 'node:test';
import { generateShijingTextCandidate, createShijingConversationChatBridge } from '../src/shell/ai/shijing-runtime-ai.ts';

for (const [finishReason, reasonCode] of [['length', 'ai-text-output-incomplete'], ['content-filter', 'ai-content-filter-blocked']]) {
  test(`a nonempty ${finishReason} result cannot become a successful interpretation or consultation`, async () => {
    const options = { getClient: () => ({ ai: { text: { generateCandidate: async () => ({ text: 'An unfinished interpretation', finishReason, traceId: 'trace-incomplete' }) } } }) };
    await assert.rejects(generateShijingTextCandidate({ ...options, system: 'Grounded interpretation', user: 'Source facts' }), error => error.reasonCode === reasonCode && error.traceId === 'trace-incomplete');
    const result = await createShijingConversationChatBridge(options).send({ user_message: 'Explain these facts', source_readings: [], conversation_turns: [] });
    assert.equal(result.ok, false);
    assert.equal(result.error.reason_code, reasonCode);
  });
}
