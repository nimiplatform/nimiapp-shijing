// 命镜 · 流年窗口组合文案 — pins that the window narrative is composed from
// each window's own basis (never one static sentence per nature class) in both
// languages, with basis sentences capped and priority-ordered.

import assert from 'node:assert/strict';
import test from 'node:test';
import { composeWindowNarrative } from '../src/product/tabs/mingjing/mingjing-narrative.ts';

function windowWith(basis, nature = 'supportive') {
  return {
    start_year: 2026,
    end_year: 2029,
    pillars: [{ year: 2026, pillar: { stem: 'bing', branch: 'wu' } }],
    nature,
    favor: '喜',
    salience: 'high',
    natal_branch_relations: [],
    basis,
  };
}

test('windows sharing a nature but differing in basis get different narratives', () => {
  const a = composeWindowNarrative('zh', windowWith(['喜用得力', '合日支']));
  const b = composeWindowNarrative('zh', windowWith(['交大运']));
  assert.notEqual(a, b);
  // Both still open with the same nature lead and close with the same guidance.
  for (const text of [a, b]) {
    assert.match(text, /^能量顺、机会多/);
    assert.match(text, /适合推进事业、启动计划，做长期布局。$/);
  }
});

test('basis sentences ground the narrative in the window salience reasons', () => {
  const text = composeWindowNarrative('zh', windowWith(['喜用得力', '合日支']));
  assert.match(text, /流年五行正是命局所喜/);
  assert.match(text, /事情多通过合作与人际关系牵动/);

  const boundary = composeWindowNarrative('zh', windowWith(['交大运'], 'turning'));
  assert.match(boundary, /恰逢大运交接/);
});

test('basis sentences are priority-ordered and capped at three', () => {
  const text = composeWindowNarrative(
    'zh',
    windowWith(['逢刑', '合日支', '喜用得力', '交大运']),
  );
  // 交大运 / 喜用得力 / 合日支 outrank 逢刑; only the top three surface.
  assert.match(text, /恰逢大运交接/);
  assert.match(text, /命局所喜/);
  assert.match(text, /合作与人际关系/);
  assert.doesNotMatch(text, /磕绊/);
});

test('empty or unknown basis degrades to lead + guidance only', () => {
  const text = composeWindowNarrative('zh', windowWith(['未知依据'], 'watch'));
  assert.equal(text, '节奏放缓的过渡期，适合放慢脚步。宜观察、修整与积累，不宜冒进；把这段时间用好，是在为下一轮蓄力。');
});

test('english narrative composes the same structure', () => {
  const text = composeWindowNarrative('en', windowWith(['忌神当值'], 'blocked'));
  assert.match(text, /^More friction than usual/);
  assert.match(text, /adverse element at full strength/);
  assert.match(text, /avoid big investments or risky bets\.$/);
});
