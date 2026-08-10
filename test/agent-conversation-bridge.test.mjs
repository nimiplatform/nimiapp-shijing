import assert from 'node:assert/strict';
import test from 'node:test';

import {
  runShijingAgentTerminalTurn,
} from '../src/shell/ai/shijing-conversation-chat-bridge.ts';

const AGENT_HANDLE = `agent_ref_${'a'.repeat(43)}`;

function conversationEvent(type, turnId, extra = {}) {
  return {
    conversationAnchorId: 'anchor-1',
    sequence: '1',
    turnId,
    type,
    ...extra,
  };
}

function agentReferences() {
  return [
    { agentHandle: AGENT_HANDLE, displayName: 'Consultation Agent', avatarUrl: null },
  ];
}

function clientWithEvents(events, calls, cancelCount) {
  return {
    agents: {
      listReferences: async () => {
        calls.push('agents.listReferences');
        return agentReferences();
      },
    },
    conversation: {
      open: async (input) => {
        calls.push(`open:${JSON.stringify(input)}`);
        return {
          conversationAnchorId: 'anchor-1',
          activeTurnId: null,
        };
      },
      subscribe: async (input) => {
        calls.push(`subscribe:${input.conversationAnchorId}`);
        return {
          async *[Symbol.asyncIterator]() {
            for (const event of events) yield event;
          },
          async cancel() {
            cancelCount.value += 1;
          },
        };
      },
      send: async (input) => {
        calls.push(`send:${input.requestId}:${input.text}`);
        return { turnId: 'turn-1' };
      },
    },
  };
}

test('Agent turn lists references, subscribes before send, correlates request and turn, and requires committed completed output', async () => {
  const calls = [];
  const cancelCount = { value: 0 };
  const events = [
    conversationEvent('turn-accepted', 'turn-unrelated', { requestId: 'other-request' }),
    conversationEvent('message-committed', 'turn-unrelated', {
      messageId: 'message-unrelated',
      text: 'ignore me',
    }),
    conversationEvent('turn-accepted', 'turn-1', { requestId: 'shijing-request-1' }),
    conversationEvent('turn-started', 'turn-1'),
    conversationEvent('text-delta', 'turn-1', { text: 'Grounded' }),
    conversationEvent('message-committed', 'turn-1', {
      messageId: 'message-1',
      text: 'Grounded ShiJing answer.',
    }),
    conversationEvent('turn-completed', 'turn-1', { terminalReason: 'stop' }),
  ];
  const client = clientWithEvents(events, calls, cancelCount);

  const text = await runShijingAgentTerminalTurn({
    getClient: () => client,
    getAgentHandle: () => AGENT_HANDLE,
    createRequestId: () => 'shijing-request-1',
    system: 'Use cited deterministic evidence.',
    user: 'What should I focus on?',
  });

  assert.equal(text, 'Grounded ShiJing answer.');
  assert.equal(calls[0], 'agents.listReferences');
  assert.equal(
    calls[1],
    `open:{"agentHandle":"${AGENT_HANDLE}"}`,
  );
  assert.equal(calls[2], 'subscribe:anchor-1');
  assert.match(calls[3], /^send:shijing-request-1:/);
  assert.match(calls[3], /\[ShiJing consultation contract\]/);
  assert.match(
    calls[3],
    /<message id="message-0">\{\.\.\.the requested JSON wording patch\.\.\.\}<\/message>/,
  );
  assert.match(
    calls[3],
    /direct-model rules above about the first and last output characters apply only to the JSON message text/,
  );
  assert.equal(cancelCount.value, 1);
});

test('Agent turn fails closed when completed has no committed response', async () => {
  const calls = [];
  const cancelCount = { value: 0 };
  const client = clientWithEvents([
    conversationEvent('turn-accepted', 'turn-1', { requestId: 'shijing-request-1' }),
    conversationEvent('turn-completed', 'turn-1', { terminalReason: 'stop' }),
  ], calls, cancelCount);

  await assert.rejects(
    () => runShijingAgentTerminalTurn({
      getClient: () => client,
      getAgentHandle: () => AGENT_HANDLE,
      createRequestId: () => 'shijing-request-1',
      system: 'system',
      user: 'user',
    }),
    (error) => error.reasonCode === 'shijing-agent-terminal-response-missing',
  );
  assert.equal(cancelCount.value, 1);
});

test('Agent turn does not open a conversation without a selected session Agent reference', async () => {
  let opened = false;
  const client = {
    agents: {
      listReferences: async () => [],
    },
    conversation: {
      open: async () => {
        opened = true;
        throw new Error('must not open');
      },
    },
  };

  await assert.rejects(
    () => runShijingAgentTerminalTurn({
      getClient: () => client,
      getAgentHandle: () => null,
      createRequestId: () => 'shijing-request-1',
      system: 'system',
      user: 'user',
    }),
    (error) => error.reasonCode === 'shijing-agent-handle-required',
  );
  assert.equal(opened, false);
});

test('Agent turn surfaces typed turn-failed evidence', async () => {
  const calls = [];
  const cancelCount = { value: 0 };
  const client = clientWithEvents([
    conversationEvent('turn-accepted', 'turn-1', { requestId: 'shijing-request-1' }),
    conversationEvent('turn-failed', 'turn-1', {
      reasonCode: 'runtime-agent-turn-model-failed',
      message: 'The Agent model could not complete the turn.',
    }),
  ], calls, cancelCount);

  await assert.rejects(
    () => runShijingAgentTerminalTurn({
      getClient: () => client,
      getAgentHandle: () => AGENT_HANDLE,
      createRequestId: () => 'shijing-request-1',
      system: 'system',
      user: 'user',
    }),
    (error) => {
      assert.equal(error.reasonCode, 'runtime-agent-turn-model-failed');
      assert.equal(error.message, 'The Agent model could not complete the turn.');
      return true;
    },
  );
  assert.equal(cancelCount.value, 1);
});

test('Agent turn interruption stays typed without machine-code diagnostics in the message', async () => {
  const calls = [];
  const cancelCount = { value: 0 };
  const client = clientWithEvents([
    conversationEvent('turn-accepted', 'turn-1', { requestId: 'shijing-request-1' }),
    conversationEvent('turn-interrupted', 'turn-1', { reason: 'timeout' }),
  ], calls, cancelCount);

  await assert.rejects(
    () => runShijingAgentTerminalTurn({
      getClient: () => client,
      getAgentHandle: () => AGENT_HANDLE,
      createRequestId: () => 'shijing-request-1',
      system: 'system',
      user: 'user',
    }),
    (error) => {
      assert.equal(error.reasonCode, 'shijing-agent-turn-interrupted');
      assert.doesNotMatch(
        error.message,
        /turnId=|reasonCode=|elapsedMs|detail\.reason|timeout/,
      );
      return true;
    },
  );
  assert.equal(cancelCount.value, 1);
});
