import assert from 'node:assert/strict';
import test from 'node:test';

import {
  runShijingAgentTerminalTurn,
} from '../src/shell/ai/shijing-conversation-chat-bridge.ts';

const AGENT_HANDLE = 'opaque-shijing-agent-handle';

function runtimeEvent(messageType, payload, reasonCode = '') {
  return {
    eventType: 1,
    sequence: '1',
    messageId: `message-${messageType}`,
    messageType,
    payload,
    reasonCode,
    traceId: 'trace-1',
    timestampUnixMs: 1,
  };
}

function grantedPermission() {
  return {
    permissionId: 'agents.interact',
    posture: 'granted',
    canRequest: false,
    agents: [{ agentHandle: AGENT_HANDLE, displayName: 'Consultation Agent' }],
  };
}

function clientWithEvents(events, calls, cancelCount) {
  return {
    permissions: {
      status: async (permissionId) => {
        calls.push(`permission:${permissionId}`);
        return grantedPermission();
      },
    },
    conversation: {
      open: async (input) => {
        calls.push(`open:${JSON.stringify(input)}`);
        return {
          conversationAnchorId: 'anchor-1',
          activeTurnId: null,
          activeStreamId: null,
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
        return { messageId: 'sent-message-1' };
      },
    },
  };
}

test('Agent turn subscribes before send, correlates request and turn, and requires committed completed output', async () => {
  const calls = [];
  const cancelCount = { value: 0 };
  const events = [
    runtimeEvent('runtime.agent.turn.accepted', {
      turn_id: 'turn-unrelated',
      detail: { request_id: 'other-request' },
    }),
    runtimeEvent('runtime.agent.turn.message_committed', {
      turn_id: 'turn-unrelated',
      detail: { text: 'ignore me' },
    }),
    runtimeEvent('runtime.agent.turn.accepted', {
      turn_id: 'turn-1',
      detail: { request_id: 'shijing-request-1' },
    }),
    runtimeEvent('runtime.agent.turn.message_committed', {
      turn_id: 'turn-1',
      detail: { text: 'Grounded ShiJing answer.' },
    }),
    runtimeEvent('runtime.agent.turn.completed', {
      turn_id: 'turn-1',
      detail: { terminal_reason: 'completed' },
    }),
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
  assert.equal(calls[0], 'permission:agents.interact');
  assert.equal(
    calls[1],
    'open:{"agentHandle":"opaque-shijing-agent-handle"}',
  );
  assert.equal(calls[2], 'subscribe:anchor-1');
  assert.match(calls[3], /^send:shijing-request-1:/);
  assert.match(calls[3], /\[ShiJing consultation contract\]/);
  assert.equal(cancelCount.value, 1);
});

test('Agent turn fails closed when completed has no committed response', async () => {
  const calls = [];
  const cancelCount = { value: 0 };
  const client = clientWithEvents([
    runtimeEvent('runtime.agent.turn.accepted', {
      turn_id: 'turn-1',
      detail: { request_id: 'shijing-request-1' },
    }),
    runtimeEvent('runtime.agent.turn.completed', {
      turn_id: 'turn-1',
      detail: { terminal_reason: 'completed' },
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
    (error) => error.reasonCode === 'shijing-agent-terminal-response-missing',
  );
  assert.equal(cancelCount.value, 1);
});

test('Agent turn does not open a conversation before agents.interact is granted', async () => {
  let opened = false;
  const client = {
    permissions: {
      status: async () => ({
        permissionId: 'agents.interact',
        posture: 'prompt',
        canRequest: true,
        agents: [],
      }),
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
    (error) => error.reasonCode === 'shijing-agents-interact-permission-required',
  );
  assert.equal(opened, false);
});
