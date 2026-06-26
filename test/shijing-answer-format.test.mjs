import assert from 'node:assert/strict';
import test from 'node:test';

import { parseShiJingAnswerText } from '../src/product/conversations/shijing-answer-format.ts';

test('parses structured ShiJing answer text into readable sections', () => {
  const parsed = parseShiJingAnswerText([
    '标题：接下来三个月的工作节奏',
    '结论：适合稳步推进，不适合突然换挡。',
    '',
    '重点卡片：',
    '1.',
    '- 标题：先收束，再尝试',
    '- 风险等级：中',
    '- 为什么需要注意：节奏容易被外部机会打乱。',
    '- 建议做什么：先确认现有项目的收尾边界。',
    '- 避免做什么：不要同时开启太多新方向。',
    '',
    '总结：先把当前节奏守住，再留一个小窗口试探变化。',
  ].join('\n'));

  assert.equal(parsed.kind, 'structured');
  assert.equal(parsed.title, '接下来三个月的工作节奏');
  assert.equal(parsed.conclusion, '适合稳步推进，不适合突然换挡。');
  assert.equal(parsed.cards.length, 1);
  assert.deepEqual(parsed.cards[0], {
    title: '先收束，再尝试',
    riskLevel: '中',
    why: '节奏容易被外部机会打乱。',
    suggestion: '先确认现有项目的收尾边界。',
    avoid: '不要同时开启太多新方向。',
  });
  assert.equal(parsed.summary, '先把当前节奏守住，再留一个小窗口试探变化。');
});

test('keeps plain ShiJing answer text as fallback paragraphs', () => {
  const parsed = parseShiJingAnswerText('今天更适合先整理信息。\n\n晚一点再做决定。');

  assert.equal(parsed.kind, 'plain');
  assert.deepEqual(parsed.paragraphs, ['今天更适合先整理信息。', '晚一点再做决定。']);
});
