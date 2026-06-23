import assert from 'node:assert/strict';
import test from 'node:test';

import { deriveRiJingProjectionDisplay } from '../src/product/tabs/rijing/rijing-projection-display.ts';

test('deriveRiJingProjectionDisplay shows clean labels, collapsed summary, and full expanded detail', () => {
  const display = deriveRiJingProjectionDisplay({
    projection: {
      concern_tag_ref: 'tag_career',
      tendency_class: 'steady',
      summary: '#事业：慢节奏换高精度——先听后说，确认细节再开口。\n今天适合把会议、回信和交付节奏拆开处理，先确认细节，再进入推进。',
      recommendations: ['把 #事业 的下一步写成一条可确认的句子。'],
    },
    tag: {
      id: 'tag_career',
      label: '#事业',
      status: 'active',
      sort_order: 0,
      parsed_topics: ['career'],
      mention_refs: [],
      prompt_text: '工作 · 项目 · 产出',
      created_at: '2026-06-23T00:00:00Z',
      updated_at: '2026-06-23T00:00:00Z',
    },
  });

  assert.equal(display.name, '事业');
  assert.equal(display.collapsedSummary, '慢节奏换高精度——先听后说，确认细节再开口。');
  assert.equal(
    display.detailSummary,
    '慢节奏换高精度——先听后说，确认细节再开口。\n今天适合把会议、回信和交付节奏拆开处理，先确认细节，再进入推进。',
  );
  assert.deepEqual(display.recommendations, ['把 事业 的下一步写成一条可确认的句子。']);
});

test('deriveRiJingProjectionDisplay keeps same-line detail out of the collapsed row', () => {
  const display = deriveRiJingProjectionDisplay({
    projection: {
      concern_tag_ref: 'tag_body',
      tendency_class: 'supportive',
      summary: '#身体：先把节奏放慢。后面的身体信号、休息安排和行动建议只在展开后阅读。',
      recommendations: [],
    },
    tag: {
      id: 'tag_body',
      label: '#身体',
      status: 'active',
      sort_order: 1,
      parsed_topics: ['body'],
      mention_refs: [],
      prompt_text: '状态 · 节律 · 休整',
      created_at: '2026-06-23T00:00:00Z',
      updated_at: '2026-06-23T00:00:00Z',
    },
  });

  assert.equal(display.collapsedSummary, '先把节奏放慢。');
  assert.equal(display.detailSummary, '先把节奏放慢。后面的身体信号、休息安排和行动建议只在展开后阅读。');
});

test('deriveRiJingProjectionDisplay preserves label words when they are part of the sentence', () => {
  const display = deriveRiJingProjectionDisplay({
    projection: {
      concern_tag_ref: 'tag_body',
      tendency_class: 'supportive',
      summary: '身体的反馈往往是最诚实的信号。',
      recommendations: [],
    },
    tag: {
      id: 'tag_body',
      label: '#身体',
      status: 'active',
      sort_order: 1,
      parsed_topics: ['body'],
      mention_refs: [],
      prompt_text: '状态 · 节律 · 休整',
      created_at: '2026-06-23T00:00:00Z',
      updated_at: '2026-06-23T00:00:00Z',
    },
  });

  assert.equal(display.collapsedSummary, '身体的反馈往往是最诚实的信号。');
  assert.equal(display.detailSummary, '身体的反馈往往是最诚实的信号。');
});
