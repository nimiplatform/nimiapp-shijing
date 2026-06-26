// SJG-DATA-10 + SJG-ASTRO-07 - ShiJing consultation follow-up prompt tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CONVERSATION_SYSTEM_PROMPT,
  createConversationChatBridge,
} from '../src/product/conversations/conversation-chat-bridge.ts';
import { validReading } from './_fixtures.mjs';

test('createConversationChatBridge sends the structured ShiJing answer brief for follow-ups', async () => {
  let captured = null;
  const bridge = createConversationChatBridge({
    generator: async (request) => {
      captured = request;
      return { text: 'ok' };
    },
  });

  const result = await bridge.send({
    user_message: '接下来三个月适合换工作吗？',
    source_readings: [validReading({ id: 'r_source_01' })],
  });

  assert.equal(result.ok, true);
  assert.ok(captured);
  assert.equal(captured.system, CONVERSATION_SYSTEM_PROMPT);
  assert.ok(captured.system.includes('负责回答用户关于未来一段时间、关系、事业、财务、健康、决策等问题'));
  assert.ok(captured.system.includes('不要机械罗列「姻缘、事业、身体、财运」四个固定模块'));
  assert.ok(captured.system.includes('适合前端渲染的结构化回答'));
  assert.ok(captured.system.includes('重点卡片'));
  assert.ok(captured.system.includes('风险等级'));
  assert.ok(captured.system.includes('为什么需要注意'));
  assert.ok(captured.system.includes('建议做什么'));
  assert.ok(captured.system.includes('避免做什么'));
  assert.ok(captured.system.includes('只输出 1～3 个重点卡片'));
  assert.equal(captured.system.includes('重点提醒一：'), false);
  assert.equal(captured.system.includes('接下来30天最值得做的3件事：'), false);
  assert.ok(captured.system.includes('健康相关内容只能提醒作息、饮食、压力、休息'));
  assert.ok(captured.system.includes('不要提及 source_readings、Reading、系统记录、已有解读、现有信息、当前信息显示'));
  assert.equal(captured.system.includes('已经保存的 Reading'), false);
  assert.equal(captured.system.includes('只围绕 source_readings 回答'), false);
  assert.ok(captured.user.includes('接下来三个月适合换工作吗？'));
  assert.ok(captured.user.includes('current_time'));
  assert.ok(captured.user.includes('instruction'));
  assert.ok(captured.user.includes('不要在回答里提及 source_readings、Reading、系统记录、已有解读、现有信息、当前信息显示'));
});
