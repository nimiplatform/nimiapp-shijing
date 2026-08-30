// SJG-ASTRO-11 + SJG-ALGO-13 - Runtime AI prompt request tests.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildRuntimeAiPromptRequest,
} from '../src/product/astrology/runtime-ai-prompt.ts';
import {
  dailyMirrorScope,
  consultationMirrorScope,
  longHorizonMirrorScope,
  rolling30DayMirrorScope,
  relationshipNatalMirrorScope,
  validConcernTag,
  validConcernTagSnapshot,
  validEventMemory,
  validInputsSummary,
  validMingjingRelationshipOutput,
  validNianjingOutput,
  validPlanItem,
  validRijingOutput,
  validShijingOutput,
  validYuejingOutput,
} from './_fixtures.mjs';

const TZ = 'Asia/Shanghai';

test('buildRuntimeAiPromptRequest includes mirror_kind in schema_name', () => {
  const scope = dailyMirrorScope({ basis_time_zone: TZ });
  const summary = validInputsSummary({ mirrorKind: 'rijing', scope });
  const request = buildRuntimeAiPromptRequest({
    mirror_kind: 'rijing',
    feature_snapshot: summary.feature_snapshot,
    mirror_context: {
      mirror_kind: 'rijing',
      mirror_scope: scope,
      active_concern_tags: [validConcernTagSnapshot('tag_love')],
      resolved_person_refs: [],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      response_preferences_hash: 'sha256:prefs',
    },
    deterministic_output: validRijingOutput(),
    response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
  });
  assert.equal(request.schema_name, 'shijing.runtime_ai_wording_patch.rijing.v1');
  assert.ok(request.system_prompt.includes('Deterministic'));
  assert.ok(request.system_prompt.includes('patch_kind MUST equal shijing.runtime_ai_wording_patch.v1'));
  assert.ok(request.system_prompt.includes('mirror_kind MUST equal required_top_level_mirror_kind'));
  assert.ok(request.user_prompt.includes('required_patch_kind: shijing.runtime_ai_wording_patch.v1'));
  assert.ok(request.user_prompt.includes('required_top_level_mirror_kind: rijing'));
  assert.ok(request.user_prompt.includes('"mirror_kind": "rijing"'));
  assert.ok(request.user_prompt.includes('wording_patch_target_json:'));
});
test('buildRuntimeAiPromptRequest gives RiJing a positive non-fatalist rich-banner brief', () => {
  const scope = dailyMirrorScope({ basis_time_zone: TZ });
  const summary = validInputsSummary({ mirrorKind: 'rijing', scope });
  const request = buildRuntimeAiPromptRequest({
    mirror_kind: 'rijing',
    feature_snapshot: summary.feature_snapshot,
    mirror_context: {
      mirror_kind: 'rijing',
      mirror_scope: scope,
      active_concern_tags: [
        validConcernTagSnapshot('tag_career', {
          label: '#事业',
          parsed_topics: ['career'],
        }),
      ],
      resolved_person_refs: [],
      cited_event_memory_refs: ['mem_today'],
      cited_plan_item_refs: [],
      response_preferences_hash: 'sha256:prefs',
    },
    deterministic_output: validRijingOutput({
      cited_event_memory_refs: ['mem_today'],
    }),
    active_concern_tags: [
      validConcernTag('tag_career', {
        label: '#事业',
        parsed_topics: ['career'],
        prompt_text: '我正在评估一个需要频繁出差的新项目。',
      }),
    ],
    cited_event_memories: [
      validEventMemory('mem_today', {
        occurred_at: '2026-05-25T06:00:00Z',
        body: '下午要谈一个重要合作，心里有点不确定。',
      }),
    ],
    response_preferences: { tone: 'warm', length: 'long', language: 'zh-Hans' },
  });

  assert.ok(request.system_prompt.includes('绝对正向'));
  assert.ok(request.system_prompt.includes('命由天定，运由己造'));
  assert.ok(request.system_prompt.includes('Do not output Markdown headings'));
  assert.ok(request.user_prompt.includes('今日参照事件'));
  assert.ok(request.user_prompt.includes('cited_event_memory_summaries:'));
  assert.ok(request.user_prompt.includes('下午要谈一个重要合作'));
  assert.ok(request.user_prompt.includes('daily_overview should read like 今日基调'));
  assert.ok(request.user_prompt.includes('daily_overview is REQUIRED in the patch whenever cited_event_memory_refs is non-empty'));
  assert.ok(request.user_prompt.includes('今日事件解析'));
  assert.ok(request.user_prompt.includes('是不是因为今天工作运不佳'));
  assert.ok(request.user_prompt.includes('concern projection summary should read like 专属视角解读'));
  assert.ok(request.user_prompt.includes('绝对禁止使用类似'));
  assert.ok(request.user_prompt.includes('不要在正文中重复输出'));
  assert.ok(request.user_prompt.includes('至少80字'));
  assert.ok(request.user_prompt.includes('会议发言'));
  assert.ok(request.user_prompt.includes('一顿晚餐'));
  assert.ok(request.user_prompt.includes('prompt_text="我正在评估一个需要频繁出差的新项目。"'));
});

test('buildRuntimeAiPromptRequest tells RiJing how to handle missing reference events', () => {
  const scope = dailyMirrorScope({ basis_time_zone: TZ });
  const summary = validInputsSummary({ mirrorKind: 'rijing', scope });
  const request = buildRuntimeAiPromptRequest({
    mirror_kind: 'rijing',
    feature_snapshot: summary.feature_snapshot,
    mirror_context: {
      mirror_kind: 'rijing',
      mirror_scope: scope,
      active_concern_tags: [
        validConcernTagSnapshot('tag_career', {
          label: '#事业',
          parsed_topics: ['career'],
        }),
      ],
      resolved_person_refs: [],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      response_preferences_hash: 'sha256:prefs',
    },
    deterministic_output: validRijingOutput(),
    response_preferences: { tone: 'warm', length: 'long', language: 'zh-Hans' },
  });

  assert.ok(request.user_prompt.includes('用户今日未提供具体事件'));
  assert.ok(request.user_prompt.includes('整体能量和生活哲理'));
  assert.ok(request.user_prompt.includes('今日事件解析'));
  assert.ok(request.user_prompt.includes('不要 invent uncited events'));
});

test('buildRuntimeAiPromptRequest gives ShiJing consultation a structured mobile answer brief', () => {
  const scope = consultationMirrorScope(['r_source_01'], { basis_time_zone: TZ });
  const summary = validInputsSummary({ mirrorKind: 'shijing', scope });
  const request = buildRuntimeAiPromptRequest({
    mirror_kind: 'shijing',
    feature_snapshot: summary.feature_snapshot,
    mirror_context: {
      mirror_kind: 'shijing',
      mirror_scope: scope,
      active_concern_tags: [
        validConcernTagSnapshot('tag_career', {
          label: '#事业',
          parsed_topics: ['career'],
        }),
      ],
      resolved_person_refs: [],
      cited_event_memory_refs: ['mem_recent'],
      cited_plan_item_refs: ['plan_next'],
      response_preferences_hash: 'sha256:prefs',
    },
    deterministic_output: validShijingOutput(['r_source_01']),
    active_concern_tags: [
      validConcernTag('tag_career', {
        label: '#事业',
        parsed_topics: ['career'],
        prompt_text: '我在换团队和维持收入稳定之间犹豫。',
      }),
    ],
    cited_event_memories: [
      validEventMemory('mem_recent', {
        occurred_at: '2026-05-29T06:00:00Z',
        body: '最近正在考虑是否换团队，担心影响收入节奏。',
      }),
    ],
    cited_plan_items: [
      validPlanItem('plan_next', {
        planned_for: '2026-06-20T00:00:00Z',
        body: '6 月 20 日前先向主管确认转岗后的薪酬范围。',
      }),
    ],
    question: '接下来三个月适合换工作吗？',
    response_preferences: { tone: 'warm', length: 'long', language: 'zh-Hans' },
  });

  assert.ok(request.user_prompt.includes('ShiJing 问镜回答 writing requirements'));
  assert.ok(request.user_prompt.includes('用户问题'));
  assert.ok(request.user_prompt.includes('接下来三个月适合换工作吗？'));
  assert.ok(request.user_prompt.includes('未来一段时间、关系、事业、财务、健康、决策'));
  assert.ok(request.user_prompt.includes('不要机械罗列「姻缘、事业、身体、财运」四个固定模块'));
  assert.ok(request.user_prompt.includes('适合前端渲染的结构化回答'));
  assert.ok(request.user_prompt.includes('重点卡片'));
  assert.ok(request.user_prompt.includes('风险等级'));
  assert.ok(request.user_prompt.includes('为什么需要注意'));
  assert.ok(request.user_prompt.includes('建议做什么'));
  assert.ok(request.user_prompt.includes('避免做什么'));
  assert.ok(request.user_prompt.includes('只输出 1～3 个重点卡片'));
  assert.equal(request.user_prompt.includes('重点提醒一：'), false);
  assert.equal(request.user_prompt.includes('接下来30天最值得做的3件事：'), false);
  assert.ok(request.user_prompt.includes('不要使用「已有解读中提到」「系统记录显示」这类内部表达'));
  assert.ok(request.user_prompt.includes('不要提及 source_readings、Reading、系统记录、已有解读、现有信息、当前信息显示'));
  assert.ok(request.user_prompt.includes('健康相关内容只能提醒作息、饮食、压力、休息'));
  assert.ok(request.user_prompt.includes('最近正在考虑是否换团队'));
  assert.ok(request.user_prompt.includes('cited_plan_item_summaries:'));
  assert.ok(request.user_prompt.includes('6 月 20 日前先向主管确认转岗后的薪酬范围'));
});

test('buildRuntimeAiPromptRequest keeps same-chart concern wording distinct without persisting raw text', () => {
  const scope = dailyMirrorScope({ basis_time_zone: TZ });
  const concernSnapshot = validConcernTagSnapshot('tag_career', {
    label: '#事业',
    parsed_topics: ['career'],
  });
  const summary = validInputsSummary({
    mirrorKind: 'rijing',
    scope,
    concernTagSnapshots: [concernSnapshot],
  });
  const base = {
    mirror_kind: 'rijing',
    feature_snapshot: summary.feature_snapshot,
    mirror_context: {
      mirror_kind: 'rijing',
      mirror_scope: scope,
      active_concern_tags: [concernSnapshot],
      resolved_person_refs: [],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      response_preferences_hash: 'sha256:prefs',
    },
    deterministic_output: validRijingOutput(),
    response_preferences: { tone: 'warm', length: 'long', language: 'zh-Hans' },
  };
  const projectPrompt = buildRuntimeAiPromptRequest({
    ...base,
    active_concern_tags: [
      validConcernTag('tag_career', {
        label: '#事业',
        parsed_topics: ['career'],
        prompt_text: '我在考虑要不要接受外地新项目。',
      }),
    ],
  });
  const transferPrompt = buildRuntimeAiPromptRequest({
    ...base,
    active_concern_tags: [
      validConcernTag('tag_career', {
        label: '#事业',
        parsed_topics: ['career'],
        prompt_text: '我在纠结要不要主动申请转岗。',
      }),
    ],
  });

  assert.notEqual(projectPrompt.user_prompt, transferPrompt.user_prompt);
  assert.ok(projectPrompt.user_prompt.includes('接受外地新项目'));
  assert.ok(transferPrompt.user_prompt.includes('主动申请转岗'));
  assert.equal('prompt_text' in concernSnapshot, false);
});

test('buildRuntimeAiPromptRequest limits yuejing wording target to the window start date', () => {
  const scope = rolling30DayMirrorScope({
    start_date: '2026-05-25',
    end_date: '2026-06-23',
    basis_time_zone: TZ,
  });
  const summary = validInputsSummary({ mirrorKind: 'yuejing', scope });
  const output = validYuejingOutput(scope, {
    cells: [
      {
        date: '2026-05-25',
        concern_tag_ref: 'tag_love',
        tendency_class: 'steady',
        summary: 'Start date wording.',
      },
      {
        date: '2026-05-26',
        concern_tag_ref: 'tag_love',
        tendency_class: 'watch',
        summary: 'Second date wording.',
      },
    ],
  });
  const request = buildRuntimeAiPromptRequest({
    mirror_kind: 'yuejing',
    feature_snapshot: summary.feature_snapshot,
    mirror_context: {
      mirror_kind: 'yuejing',
      mirror_scope: scope,
      active_concern_tags: [validConcernTagSnapshot('tag_love')],
      resolved_person_refs: [],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      response_preferences_hash: 'sha256:prefs',
    },
    deterministic_output: output,
    response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
  });
  assert.ok(request.user_prompt.includes('"focus_date": "2026-05-25"'));
  assert.ok(request.user_prompt.includes('Start date wording.'));
  assert.equal(request.user_prompt.includes('Second date wording.'), false);
});

test('buildRuntimeAiPromptRequest grounds NianJing wording in concern-specific BaZi evidence', () => {
  const scope = longHorizonMirrorScope({
    start_date: '2026-01-01',
    end_date: '2027-12-31',
    basis_time_zone: TZ,
  });
  const concerns = [
    validConcernTagSnapshot('tag_career', {
      label: '#事业',
      parsed_topics: ['career'],
    }),
    validConcernTagSnapshot('tag_health', {
      label: '#身体',
      parsed_topics: ['body'],
    }),
  ];
  const summary = validInputsSummary({
    mirrorKind: 'nianjing',
    scope,
    concernTagSnapshots: concerns,
  });
  const output = validNianjingOutput(scope, {
    phase_bands: [
      {
        concern_tag_ref: 'tag_career',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        nature: 'supportive',
        driver_refs: [
          'bazi:annual_transition@2026-02-04T00:00:00.000Z',
          'bazi:period.喜@fire',
          'bazi:domain.career',
          'bazi:tenGod.constraint',
          'bazi:domain_relevance.focused',
        ],
        summary: 'deterministic career basis',
      },
      {
        concern_tag_ref: 'tag_health',
        start_date: '2026-01-01',
        end_date: '2026-12-31',
        nature: 'steady',
        driver_refs: [
          'bazi:annual_transition@2026-02-04T00:00:00.000Z',
          'bazi:period.喜@fire',
          'bazi:domain.health',
          'bazi:tenGod.resource',
          'bazi:domain_relevance.focused',
        ],
        summary: 'deterministic health basis',
      },
    ],
    inflection_points: [],
  });
  const request = buildRuntimeAiPromptRequest({
    mirror_kind: 'nianjing',
    feature_snapshot: summary.feature_snapshot,
    mirror_context: {
      mirror_kind: 'nianjing',
      mirror_scope: scope,
      active_concern_tags: concerns,
      resolved_person_refs: [],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      response_preferences_hash: 'sha256:prefs',
    },
    deterministic_output: output,
    response_preferences: { tone: 'warm', length: 'long', language: 'zh-Hans' },
  });

  assert.ok(request.user_prompt.includes('NianJing personalized long-horizon wording requirements'));
  assert.ok(request.user_prompt.includes('命局喜忌五行'));
  assert.ok(request.user_prompt.includes('禁止套用同一句话'));
  assert.ok(request.user_prompt.includes('"concern_label": "#事业"'));
  assert.ok(request.user_prompt.includes('"concern_label": "#身体"'));
  assert.ok(request.user_prompt.includes('"driver_basis": "助力 · 八字 · 命局喜火 · 官杀 · 事业直接命中 · 流年切换"'));
  assert.ok(request.user_prompt.includes('"driver_basis": "平稳 · 八字 · 命局喜火 · 印星 · 身体直接命中 · 流年切换"'));
});

test('buildRuntimeAiPromptRequest admits MingJing relationship HePan wording targets as read-only context', () => {
  const scope = relationshipNatalMirrorScope({ anchor_year: 2026 });
  const summary = validInputsSummary({ mirrorKind: 'mingjing', scope, concernTagSnapshots: [] });
  const output = validMingjingRelationshipOutput({
    relationship_subject: {
      primary_subject_ref: 'self',
      related_person_ref: scope.related_person_ref,
      anchor_year: scope.anchor_year,
      basis_time_zone: scope.basis_time_zone,
    },
  });

  const request = buildRuntimeAiPromptRequest({
    mirror_kind: 'mingjing',
    feature_snapshot: summary.feature_snapshot,
    mirror_context: {
      mirror_kind: 'mingjing',
      mirror_scope: scope,
      active_concern_tags: [],
      resolved_person_refs: [scope.related_person_ref],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      response_preferences_hash: 'sha256:prefs',
    },
    deterministic_output: output,
    response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
  });

  assert.equal(request.schema_name, 'shijing.runtime_ai_wording_patch.mingjing.v1');
  assert.ok(request.user_prompt.includes('output_kind: relationship_hepan'));
  assert.ok(request.user_prompt.includes('relationship_subject'));
  assert.ok(request.user_prompt.includes('"related_person_ref": {'));
  assert.ok(request.user_prompt.includes('"driver_refs": ['));
  assert.ok(request.user_prompt.includes('bazi:relationship.window.2026-03'));
  assert.ok(request.user_prompt.includes('relationship prose fields only'));
  assert.ok(request.user_prompt.includes('Do NOT output relationship_subject, citations, cited_event_memory_refs, cited_plan_item_refs, nature, driver_refs'));
});

test('buildRuntimeAiPromptRequest includes YueJing concern labels and deterministic classes', () => {
  const scope = rolling30DayMirrorScope({
    start_date: '2026-06-03',
    end_date: '2026-07-02',
    basis_time_zone: TZ,
  });
  const summary = validInputsSummary({ mirrorKind: 'yuejing', scope });
  const output = validYuejingOutput(scope, {
    cells: [
      {
        date: '2026-06-03',
        concern_tag_ref: 'tag_love',
        tendency_class: 'turning',
        summary: '#姻缘: 变化转折。',
      },
      {
        date: '2026-06-03',
        concern_tag_ref: 'tag_career',
        tendency_class: 'watch',
        summary: '#事业: 需要观察。',
      },
    ],
  });
  const request = buildRuntimeAiPromptRequest({
    mirror_kind: 'yuejing',
    feature_snapshot: summary.feature_snapshot,
    mirror_context: {
      mirror_kind: 'yuejing',
      mirror_scope: scope,
      active_concern_tags: [
        validConcernTagSnapshot('tag_love', {
          label: '#姻缘',
          parsed_topics: ['love'],
        }),
        validConcernTagSnapshot('tag_career', {
          label: '#事业',
          parsed_topics: ['career'],
        }),
      ],
      resolved_person_refs: [],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      response_preferences_hash: 'sha256:prefs',
    },
    deterministic_output: output,
    response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
  });
  assert.ok(request.user_prompt.includes('"concern_label": "#姻缘"'));
  assert.ok(request.user_prompt.includes('"concern_label": "#事业"'));
  assert.ok(request.user_prompt.includes('"parsed_topics": ['));
  assert.ok(request.user_prompt.includes('"tendency_class": "turning"'));
  assert.ok(request.user_prompt.includes('"tendency_class": "watch"'));
});

test('buildRuntimeAiPromptRequest gives YueJing an actionable non-fatalist writing brief', () => {
  const scope = rolling30DayMirrorScope({
    start_date: '2026-06-03',
    end_date: '2026-07-02',
    basis_time_zone: TZ,
  });
  const summary = validInputsSummary({ mirrorKind: 'yuejing', scope });
  const request = buildRuntimeAiPromptRequest({
    mirror_kind: 'yuejing',
    feature_snapshot: summary.feature_snapshot,
    mirror_context: {
      mirror_kind: 'yuejing',
      mirror_scope: scope,
      active_concern_tags: [
        validConcernTagSnapshot('tag_love', {
          label: '#姻缘',
          parsed_topics: ['love'],
        }),
      ],
      resolved_person_refs: [],
      cited_event_memory_refs: ['mem_recent'],
      cited_plan_item_refs: ['plan_next'],
      response_preferences_hash: 'sha256:prefs',
    },
    deterministic_output: validYuejingOutput(scope, {
      cited_event_memory_refs: ['mem_recent'],
      cited_plan_item_refs: ['plan_next'],
      cells: [
        {
          date: '2026-06-03',
          concern_tag_ref: 'tag_love',
          tendency_class: 'watch',
          summary: '#姻缘: 留意沟通节奏。',
        },
      ],
    }),
    cited_event_memories: [
      validEventMemory('mem_recent', {
        occurred_at: '2026-05-29T06:00:00Z',
        body: '上周和伴侣因为日程安排有过一次沟通卡顿。',
      }),
    ],
    cited_plan_items: [
      validPlanItem('plan_next', {
        planned_for: '2026-06-08T00:00:00Z',
        body: '周末前和伴侣重新确认下个月的共同日程。',
      }),
    ],
    response_preferences: { tone: 'warm', length: 'long', language: 'zh-Hans' },
  });

  assert.ok(request.system_prompt.includes('不要使用绝对化预言'));
  assert.ok(request.system_prompt.includes('必然'));
  assert.ok(request.system_prompt.includes('注定'));
  assert.ok(request.user_prompt.includes('30 日节奏建议'));
  assert.ok(request.user_prompt.includes('每条建议必须绑定具体日期或时间段'));
  assert.ok(request.user_prompt.includes('适合做什么、不适合做什么'));
  assert.ok(request.user_prompt.includes('用户已有事件记忆和未来计划'));
  assert.ok(request.user_prompt.includes('不要输出底层技术字段'));
  assert.ok(request.user_prompt.includes('上周和伴侣因为日程安排'));
  assert.ok(request.user_prompt.includes('周末前和伴侣重新确认下个月的共同日程'));
});
