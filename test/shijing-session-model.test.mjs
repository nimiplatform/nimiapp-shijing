import assert from 'node:assert/strict';
import test from 'node:test';

import {
  conversationMatchesQuestionArchive,
  questionArchiveMatches,
  suggestArchiveConcernOptions,
} from '../src/product/tabs/shijing/shijing-session-model.ts';
import { validConcernTag, validConversation } from './_fixtures.mjs';

const copy = {
  shijing: {
    unrecordedQuestion: '(未记录问题)',
  },
};

function turn(id, role, body, citedReadingIds = []) {
  return {
    id,
    role,
    body,
    cited_reading_ids: citedReadingIds,
    cited_event_memory_refs: [],
    cited_plan_item_refs: [],
    created_at: `2026-05-25T00:0${id.slice(-1)}:00Z`,
  };
}

test('conversationMatchesQuestionArchive matches current input against archived concern tags', () => {
  const careerTag = validConcernTag('tag_career', {
    label: '#事业',
    status: 'archived',
    parsed_topics: ['career'],
    prompt_text: '工作 职场 事业方向',
  });
  const conversation = validConversation({
    id: 'c_career',
    concern_tag_refs: ['tag_career'],
    turns: [
      turn('t_01', 'user', '现在这个选择适合推进吗？'),
      turn('t_02', 'ai', '引用 r_01：先确认边界。', ['r_01']),
    ],
  });

  assert.equal(conversationMatchesQuestionArchive(conversation, '事业', [careerTag], copy), true);
});

test('conversationMatchesQuestionArchive searches the whole conversation thread', () => {
  const conversation = validConversation({
    id: 'c_follow_up',
    turns: [
      turn('t_01', 'user', '今天适合聊一下方向吗？'),
      turn('t_02', 'ai', '引用 r_01：先把节奏放稳。', ['r_01']),
      turn('t_03', 'user', '那换工作这件事呢？'),
      turn('t_04', 'ai', '引用 r_01：换工作要先看交付窗口。', ['r_01']),
    ],
  });

  assert.equal(conversationMatchesQuestionArchive(conversation, '换工作', [], copy), true);
});

test('questionArchiveMatches returns matching conversations in existing newest-first order', () => {
  const careerTag = validConcernTag('tag_career', {
    label: '#事业',
    parsed_topics: ['career'],
    prompt_text: '工作 职场 事业方向',
  });
  const loveTag = validConcernTag('tag_love', {
    label: '#姻缘',
    parsed_topics: ['love'],
    prompt_text: '关系 情感',
  });
  const careerNewest = validConversation({
    id: 'c_career_new',
    created_at: '2026-05-27T00:00:00Z',
    concern_tag_refs: ['tag_career'],
    turns: [
      turn('t_11', 'user', '这个选择适合推进吗？'),
      turn('t_12', 'ai', '引用 r_01：先稳住交付节奏。', ['r_01']),
    ],
  });
  const love = validConversation({
    id: 'c_love',
    created_at: '2026-05-26T00:00:00Z',
    concern_tag_refs: ['tag_love'],
    turns: [
      turn('t_21', 'user', '这段关系卡在哪里？'),
      turn('t_22', 'ai', '引用 r_01：先慢下来。', ['r_01']),
    ],
  });
  const careerOlder = validConversation({
    id: 'c_career_old',
    created_at: '2026-05-25T00:00:00Z',
    turns: [
      turn('t_31', 'user', '换工作这件事要等吗？'),
      turn('t_32', 'ai', '引用 r_01：换工作要看窗口。', ['r_01']),
    ],
  });

  assert.deepEqual(
    questionArchiveMatches(
      [careerNewest, love, careerOlder],
      '事业',
      [careerTag, loveTag],
      copy,
    ).map((conversation) => conversation.id),
    ['c_career_new'],
  );
  assert.deepEqual(
    questionArchiveMatches(
      [careerNewest, love, careerOlder],
      '换工作',
      [careerTag, loveTag],
      copy,
    ).map((conversation) => conversation.id),
    ['c_career_old'],
  );
});

test('archive concern suggestions include a matching built-in preset before it exists in space', async () => {
  const [option] = suggestArchiveConcernOptions({
    question: '事业相关的选择要不要推进？',
    tags: [],
    dismissedOptionIds: [],
    selectedTagIds: [],
  });

  assert.equal(option?.source, 'preset');
  assert.equal(option?.label, '事业');
  assert.match(option?.option_id ?? '', /^preset:/);
});

test('archive concern suggestions match Chinese topic aliases on existing concern tags', () => {
  const careerTag = validConcernTag('tag_career', {
    label: '#事业',
    sort_order: 0,
    parsed_topics: ['事业'],
    prompt_text: '工作 项目',
  });
  const loveTag = validConcernTag('tag_love', {
    label: '#姻缘',
    sort_order: 1,
    parsed_topics: ['姻缘'],
    prompt_text: '感情 关系',
  });

  const [option] = suggestArchiveConcernOptions({
    question: '婚姻怎么样',
    tags: [careerTag, loveTag],
    dismissedOptionIds: [],
    selectedTagIds: [],
  });

  assert.equal(option?.source, 'active');
  assert.equal(option?.tag_id, 'tag_love');
  assert.equal(option?.label, '姻缘');
});

test('archive concern suggestions stay hidden until the question matches a concern', () => {
  const careerTag = validConcernTag('tag_career', {
    label: '#事业',
    sort_order: 0,
    parsed_topics: ['事业'],
    prompt_text: '工作 项目',
  });
  const loveTag = validConcernTag('tag_love', {
    label: '#姻缘',
    sort_order: 1,
    parsed_topics: ['姻缘'],
    prompt_text: '感情 关系',
  });
  const tags = [careerTag, loveTag];

  assert.deepEqual(
    suggestArchiveConcernOptions({
      question: '',
      tags,
      dismissedOptionIds: [],
      selectedTagIds: [],
    }),
    [],
  );
  assert.deepEqual(
    suggestArchiveConcernOptions({
      question: '今天适合做什么',
      tags,
      dismissedOptionIds: [],
      selectedTagIds: [],
    }),
    [],
  );
  assert.equal(
    suggestArchiveConcernOptions({
      question: '婚姻怎么样',
      tags,
      dismissedOptionIds: [],
      selectedTagIds: [],
    })[0]?.tag_id,
    'tag_love',
  );
});

test('archive concern preset activation creates a real concern tag id for conversation refs', async () => {
  const model = await import('../src/product/tabs/shijing/shijing-session-model.ts');
  const suggest = model.suggestArchiveConcernOptions;
  assert.equal(typeof suggest, 'function');
  if (typeof suggest !== 'function') return;
  const [option] = suggest({
    question: '最近工作和项目要不要换方向？',
    tags: [],
    dismissedOptionIds: [],
    selectedTagIds: [],
  });

  const activate = model.activateArchiveConcernOption;
  assert.equal(typeof activate, 'function');
  if (typeof activate !== 'function') return;
  const result = activate({
    option,
    tags: [],
    now: '2026-06-25T00:00:00Z',
    newId: 'tag_new_career',
  });

  assert.ok(result);
  assert.equal(result.selected_tag_id, 'tag_new_career');
  assert.deepEqual(result.tags.map((tag) => tag.id), ['tag_new_career']);
  assert.equal(result.tags[0].label, '#事业');
  assert.equal(result.tags[0].status, 'active');
  assert.deepEqual(result.tags[0].parsed_topics, ['career']);
  assert.equal(result.tags[0].prompt_text, '工作 · 项目 · 产出');
});
