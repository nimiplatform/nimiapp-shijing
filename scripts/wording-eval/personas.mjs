// 措辞评测基线 persona fixtures（dev-only，不进入生产代码路径）。
//
// 用途：为 scripts/wording-eval/run.mjs 提供 7 个固定 persona 的 ShiJingSpace，
// 覆盖「素材丰富 → 完全裸模板」与「同命盘不同关注原文」两组对照：
//   rich       3 关注项 + 2 事件记忆 + 2 计划（最丰富个性化素材）
//   eventsOnly rich 的关注项 + 事件，无计划
//   plansOnly  rich 的关注项 + 计划，无事件
//   customOnly 只有关注项原文，无事件无计划
//   bare       2 个 prompt_text 为空的关注项（最差模板场景）
//   twinA/twinB 完全相同的 natal inputs 与 '#事业' 关注项，仅 prompt_text 不同，
//               用于「同命盘不同关注原文必须产出不同文案」的区分度指标
//
// 用法：
//   import { buildPersonaSpace, PERSONA_NAMES } from './personas.mjs';
//   const { space, concernTagRefs, eventMemoryRefs, planItemRefs } = buildPersonaSpace('rich');
//
// 所有实体都由 test/_fixtures.mjs 的 builder 构造；事件锚定在 2026-06-15 之前、
// 计划锚定在 2026-06-15 之后，与 run.mjs 的评测锚点一致，保证可复现。

import {
  validConcernTag,
  validEventMemory,
  validNatalInputs,
  validPlanItem,
  validShiJingSpace,
} from '../../test/_fixtures.mjs';

const TAG_CREATED_AT = '2026-06-01T00:00:00Z';

function richConcernTags() {
  return [
    validConcernTag('tag_career', {
      label: '#事业',
      sort_order: 0,
      parsed_topics: ['career'],
      prompt_text:
        '我在考虑要不要接受一个外地的新项目，未来三个月会经常出差，' +
        '担心影响家里的节奏，也怕错过这次晋升窗口。',
      created_at: TAG_CREATED_AT,
      updated_at: TAG_CREATED_AT,
    }),
    validConcernTag('tag_family', {
      label: '#家人',
      sort_order: 1,
      parsed_topics: ['family'],
      prompt_text:
        '母亲上个月体检有几项指标偏高，我在安排复查和照护分工，' +
        '担心自己工作一忙就顾不上，又怕把分工说得太直接让弟弟妹妹有压力。',
      created_at: TAG_CREATED_AT,
      updated_at: TAG_CREATED_AT,
    }),
    validConcernTag('tag_health', {
      label: '#身体',
      sort_order: 2,
      parsed_topics: ['health'],
      prompt_text:
        '这两个月睡眠明显变差，凌晨三四点容易醒，白天开会注意力跟不上。' +
        '我想恢复规律作息，但项目节点一个接一个，总是坚持不下来。',
      created_at: TAG_CREATED_AT,
      updated_at: TAG_CREATED_AT,
    }),
  ];
}

function richEventMemories() {
  return [
    validEventMemory('mem_project_talk', {
      occurred_at: '2026-06-08T02:00:00Z',
      body:
        '上周和主管谈了外地新项目的事，对方希望我月底前给答复，' +
        '还提到如果接下来，年底晋升评审会优先考虑我。',
      concern_tag_refs: ['tag_career'],
      created_at: '2026-06-08T03:00:00Z',
      updated_at: '2026-06-08T03:00:00Z',
    }),
    validEventMemory('mem_mom_checkup', {
      occurred_at: '2026-06-11T09:30:00Z',
      body:
        '陪母亲去做了复查，医生说指标比上次好一些，但建议三个月后随访，' +
        '最好有家人陪着一起来。回来的路上母亲念叨不想麻烦我们。',
      concern_tag_refs: ['tag_family'],
      created_at: '2026-06-11T10:30:00Z',
      updated_at: '2026-06-11T10:30:00Z',
    }),
  ];
}

function richPlanItems() {
  return [
    validPlanItem('plan_reply_manager', {
      planned_for: '2026-06-20T00:00:00Z',
      body:
        '6 月 20 日前给主管正式答复是否接外地新项目；' +
        '答复前先和爱人确认出差期间家里的照护安排。',
      concern_tag_refs: ['tag_career'],
      created_at: '2026-06-08T03:10:00Z',
      updated_at: '2026-06-08T03:10:00Z',
    }),
    validPlanItem('plan_family_call', {
      planned_for: '2026-06-28T00:00:00Z',
      body: '月底前和弟弟妹妹开一次视频会，把母亲下次复查的陪同人选和费用分工定下来。',
      concern_tag_refs: ['tag_family'],
      created_at: '2026-06-11T11:00:00Z',
      updated_at: '2026-06-11T11:00:00Z',
    }),
  ];
}

function bareConcernTags() {
  return [
    validConcernTag('tag_career', {
      label: '#事业',
      sort_order: 0,
      parsed_topics: ['career'],
      prompt_text: '',
      created_at: TAG_CREATED_AT,
      updated_at: TAG_CREATED_AT,
    }),
    validConcernTag('tag_family', {
      label: '#家人',
      sort_order: 1,
      parsed_topics: ['family'],
      prompt_text: '',
      created_at: TAG_CREATED_AT,
      updated_at: TAG_CREATED_AT,
    }),
  ];
}

function twinConcernTags(promptText) {
  return [
    validConcernTag('tag_career', {
      label: '#事业',
      sort_order: 0,
      parsed_topics: ['career'],
      prompt_text: promptText,
      created_at: TAG_CREATED_AT,
      updated_at: TAG_CREATED_AT,
    }),
  ];
}

function makePersona({ tags, events, plans }) {
  const space = validShiJingSpace({
    user_id: 'u_eval',
    // SJG-ALGO-07：DaYun 必需 calculation_sex（nianjing/mingjing 管线 gate），
    // 缺省 fixture 的 'unspecified' 会 fail-close —— 全部 persona 统一显式给定。
    self_subject: { natal_inputs: validNatalInputs({ calculation_sex: 'female' }) },
    concern_tags: tags,
    event_memories: events,
    plan_items: plans,
  });
  return {
    space,
    concernTagRefs: tags.map((tag) => tag.id),
    eventMemoryRefs: events.map((memory) => memory.id),
    planItemRefs: plans.map((plan) => plan.id),
  };
}

const PERSONA_BUILDERS = {
  rich: () =>
    makePersona({ tags: richConcernTags(), events: richEventMemories(), plans: richPlanItems() }),
  eventsOnly: () =>
    makePersona({ tags: richConcernTags(), events: richEventMemories(), plans: [] }),
  plansOnly: () =>
    makePersona({ tags: richConcernTags(), events: [], plans: richPlanItems() }),
  customOnly: () => makePersona({ tags: richConcernTags(), events: [], plans: [] }),
  bare: () => makePersona({ tags: bareConcernTags(), events: [], plans: [] }),
  twinA: () =>
    makePersona({
      tags: twinConcernTags('我在考虑要不要接受外地新项目，担心照顾不了家里。'),
      events: [],
      plans: [],
    }),
  twinB: () =>
    makePersona({
      tags: twinConcernTags('团队里新同事和我职责重叠，我在纠结要不要主动申请转岗。'),
      events: [],
      plans: [],
    }),
};

export const PERSONA_NAMES = Object.keys(PERSONA_BUILDERS);

export function buildPersonaSpace(name) {
  const builder = PERSONA_BUILDERS[name];
  if (!builder) {
    throw new Error(`unknown persona "${name}"; expected one of: ${PERSONA_NAMES.join(', ')}`);
  }
  return builder();
}
