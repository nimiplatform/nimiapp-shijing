// Dev-only mock ShiJingSpace seed shared by `src/dev-preview.tsx` and
// the DEV-mode branch of `src/shell/routes/product-area.tsx`. NOT
// imported by production paths — keep the data realistic but bounded so
// the 关注 / 今日 surfaces render with varied state during local
// development.

import type { Event } from '../../domain/event.ts';
import type { NatalInputs, Person, RawBirthInput } from '../../domain/person.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import type { View } from '../../domain/view.ts';

function buildSelfRawBirth(): RawBirthInput {
  return { calendar_system: 'gregorian', local_date_text: '1995-05-12' };
}

function buildSelfNatal(): NatalInputs {
  return {
    raw_birth_input: buildSelfRawBirth(),
    birth_datetime_utc: '1995-05-12T01:30:00Z',
    birth_precision: 'exact',
    calendar_system: 'gregorian',
    birth_location: {
      latitude: 39.9042,
      longitude: 116.4074,
      iana_time_zone: 'Asia/Shanghai',
      place_name: '北京',
    },
    calculation_sex: 'unspecified',
  };
}

function buildXiaomi(): Person {
  return {
    id: 'p_xiaomi',
    display_name: '小米',
    kind: 'person',
    relation_hint: '女友',
    consent_state: 'subject_consented',
    natal_inputs: {
      raw_birth_input: { calendar_system: 'gregorian', local_date_text: '1996-08-23', local_time_text: '14:20' },
      birth_datetime_utc: '1996-08-23T06:20:00Z',
      birth_precision: 'exact',
      calendar_system: 'gregorian',
      birth_location: {
        latitude: 30.2741,
        longitude: 120.1551,
        iana_time_zone: 'Asia/Shanghai',
        place_name: '杭州',
      },
      calculation_sex: 'female',
    },
  };
}

function buildLaoZhou(): Person {
  return {
    id: 'p_laozhou',
    display_name: '老周',
    kind: 'person',
    relation_hint: '工作导师',
    consent_state: 'owner_recorded',
    natal_inputs: {
      raw_birth_input: { calendar_system: 'gregorian', local_date_text: '1982-03-15', local_time_text: '09:05' },
      birth_datetime_utc: '1982-03-15T01:05:00Z',
      birth_precision: 'exact',
      calendar_system: 'gregorian',
      birth_location: {
        latitude: 31.2304,
        longitude: 121.4737,
        iana_time_zone: 'Asia/Shanghai',
        place_name: '上海',
      },
      calculation_sex: 'male',
    },
  };
}

function buildMa(): Person {
  return {
    id: 'p_ma',
    display_name: '妈妈',
    kind: 'person',
    relation_hint: '母亲',
    consent_state: 'owner_recorded',
    natal_inputs: {
      raw_birth_input: {
        calendar_system: 'lunar_chinese',
        local_date_text: '1968-09-12',
        lunar_year: 1968,
        lunar_month: 7,
        lunar_day: 20,
        lunar_is_leap_month: false,
      },
      birth_datetime_utc: '1968-09-12T22:00:00Z',
      birth_precision: 'rough_day',
      calendar_system: 'lunar_chinese',
      birth_location: {
        latitude: 36.0671,
        longitude: 120.3826,
        iana_time_zone: 'Asia/Shanghai',
        place_name: '青岛',
      },
      calculation_sex: 'female',
    },
  };
}

function buildMockViews(): readonly View[] {
  return [
    {
      id: 'v_recent_state',
      title: '最近状态',
      anchor_subject: 'self',
      subjects: ['self'],
      time_scope: 'rolling',
      rolling_window_days: 7,
      context_items: [
        { id: 'ci_recent_1', kind: 'note', body: '连续三天睡眠不足六小时，下午容易暴躁。', created_at: '2026-05-26T22:10:00Z' },
        { id: 'ci_recent_2', kind: 'note', body: '周一早会临场被点名汇报，发挥比预期顺。', created_at: '2026-05-25T03:30:00Z' },
        { id: 'ci_recent_3', kind: 'note', body: '健身房恢复每周三次，深蹲重量回到 80kg。', created_at: '2026-05-23T12:00:00Z' },
      ],
      instructions: '关注我最近一周的整体节奏，识别需要主动减负的信号。',
      view_memory: {
        summary: '本周整体处于"高强度推进 + 睡眠透支"状态，需要警惕情绪反弹与决策疲劳。',
        updated_at: '2026-05-26T23:00:00Z',
        locked: false,
      },
      display_state: 'pinned',
    },
    {
      id: 'v_job_switch',
      title: '跳槽到 AI startup',
      anchor_subject: 'self',
      subjects: ['self', { kind: 'person', id: 'p_laozhou' }],
      time_scope: 'open_ended',
      context_items: [
        { id: 'ci_job_1', kind: 'note', body: '猎头介绍了 N 家公司，目前最有感觉的是做 RAG infra 的 A 公司。', created_at: '2026-05-20T09:00:00Z' },
        { id: 'ci_job_2', kind: 'note', body: '和老周聊过，他提醒我别只看 base，更要看股权 vesting 和 founder 是否 PMF 体感强。', created_at: '2026-05-22T13:45:00Z' },
        { id: 'ci_job_3', kind: 'note', body: 'A 公司二面通过，第三轮要见 CEO，时间在下周。', created_at: '2026-05-26T10:15:00Z' },
        { id: 'ci_job_4', kind: 'document', body: 'A 公司 offer 草案 PDF — 见个人云盘 /offers/2026-A.pdf', created_at: '2026-05-26T11:00:00Z' },
      ],
      instructions: '帮我跟踪这次跳槽决策的关键节点，提醒我关注"长期收益"而不是"短期溢价"。',
      view_memory: {
        summary: '正处在 offer 谈判阶段，决策窗口约 2–3 周，关键变量是 founder 质量与方向。',
        updated_at: '2026-05-26T11:30:00Z',
        locked: false,
      },
      display_state: 'normal',
    },
    {
      id: 'v_q3_sprint',
      title: 'Q3 团队冲刺',
      anchor_subject: 'self',
      subjects: ['self', { kind: 'person', id: 'p_laozhou' }],
      time_scope: 'bounded',
      bounded_range: { start: '2026-06-01T00:00:00Z', end: '2026-08-31T23:59:59Z' },
      context_items: [
        { id: 'ci_q3_1', kind: 'note', body: 'OKR 第一条：把模型推理成本压到原来的 60%。', created_at: '2026-05-19T02:00:00Z' },
        { id: 'ci_q3_2', kind: 'note', body: '老周建议先把评测体系搭好，否则优化方向会跑偏。', created_at: '2026-05-21T06:30:00Z' },
      ],
      instructions: '聚焦 Q3 的两条主线 OKR，识别我自己最容易踩的"过度承诺"陷阱。',
      view_memory: {
        summary: '冲刺尚未正式启动，重点在于先把目标和评测尺子定清楚。',
        updated_at: '2026-05-21T07:00:00Z',
        locked: false,
      },
      display_state: 'normal',
    },
    {
      id: 'v_xiaomi_relation',
      title: '与小米的关系修复',
      anchor_subject: 'self',
      subjects: ['self', { kind: 'person', id: 'p_xiaomi' }],
      time_scope: 'rolling',
      rolling_window_days: 30,
      context_items: [
        { id: 'ci_xm_1', kind: 'note', body: '上周末因为我加班连续放她鸽子，吵了一架，冷战两天。', created_at: '2026-05-18T15:20:00Z' },
        { id: 'ci_xm_2', kind: 'note', body: '主动约她周三晚饭，聊得不错；她希望我把周末时间真正空出来。', created_at: '2026-05-21T14:00:00Z' },
        { id: 'ci_xm_3', kind: 'event_ref', body: 'evt_dinner_makeup', created_at: '2026-05-21T14:30:00Z' },
        { id: 'ci_xm_4', kind: 'note', body: '本周六准备一起去莫干山，提前两天把工作打包好。', created_at: '2026-05-26T01:10:00Z' },
      ],
      instructions: '帮我跟踪我和小米之间的沟通节奏，提醒我不要重复"用加班逃避情绪话题"的旧模式。',
      view_memory: {
        summary: '关系从冷战转入修复期，下一步关键是周末旅行能否真正断开工作。',
        updated_at: '2026-05-26T01:20:00Z',
        locked: false,
      },
      display_state: 'pinned',
    },
    {
      id: 'v_family_visit',
      title: '春节探亲计划',
      anchor_subject: 'self',
      subjects: ['self', { kind: 'person', id: 'p_ma' }],
      time_scope: 'bounded',
      bounded_range: { start: '2027-02-05T00:00:00Z', end: '2027-02-14T23:59:59Z' },
      context_items: [
        { id: 'ci_fv_1', kind: 'note', body: '想带妈妈去一次海南，她念叨好几年了。', created_at: '2026-05-10T08:00:00Z' },
        { id: 'ci_fv_2', kind: 'note', body: '需要提前两个月订春节的机票，否则价格翻倍。', created_at: '2026-05-15T11:30:00Z' },
      ],
      instructions: '提前帮我规划春节探亲的预算和时间窗口，提醒"别又把假期排满工作"。',
      view_memory: {
        summary: '计划处于早期构想阶段，关键节点是 11 月底前订票。',
        updated_at: '2026-05-15T11:35:00Z',
        locked: false,
      },
      display_state: 'normal',
    },
    {
      id: 'v_writing_habit',
      title: '写作习惯养成',
      anchor_subject: 'self',
      subjects: ['self'],
      time_scope: 'open_ended',
      context_items: [
        { id: 'ci_wh_1', kind: 'note', body: '尝试了 21 天每天写 300 字，前两周还行，后一周彻底断更。', created_at: '2026-03-20T13:00:00Z' },
        { id: 'ci_wh_2', kind: 'note', body: '决定先停一下，等手头几件大事告一段落再重启。', created_at: '2026-04-02T22:00:00Z' },
      ],
      instructions: '记录我尝试养成写作习惯的过程，便于将来复盘什么样的节奏才适合我。',
      view_memory: {
        summary: '已主动暂停，归档以便后续重启时回看上一轮的失败原因。',
        updated_at: '2026-04-02T22:05:00Z',
        locked: true,
      },
      display_state: 'archived',
    },
  ];
}

function buildMockEvents(): readonly Event[] {
  return [
    {
      id: 'evt_dinner_makeup',
      primary_subject: 'self',
      participants: [{ kind: 'person', id: 'p_xiaomi' }],
      occurred_at: '2026-05-20T12:30:00Z',
      title: '和小米和好晚餐',
      view_refs: ['v_xiaomi_relation'],
      recap: '主动认错，把下周末空出来。',
    },
    {
      id: 'evt_mentor_1on1',
      primary_subject: 'self',
      participants: [{ kind: 'person', id: 'p_laozhou' }],
      occurred_at: '2026-05-22T06:00:00Z',
      title: '与老周的职业咨询',
      view_refs: ['v_job_switch', 'v_q3_sprint'],
      recap: '聊跳槽决策与 Q3 评测体系。',
    },
    {
      id: 'evt_q3_kickoff',
      primary_subject: 'self',
      participants: [],
      occurred_at: '2026-06-02T01:00:00Z',
      title: 'Q3 OKR 启动会',
      view_refs: ['v_q3_sprint'],
      recap: '团队对齐两条主线 OKR。',
    },
  ];
}

export function buildMockShiJingSpace(userId: string): ShiJingSpace {
  return {
    user_id: userId,
    self_subject: { natal_inputs: buildSelfNatal() },
    persons: [buildXiaomi(), buildLaoZhou(), buildMa()],
    relations: [],
    events: buildMockEvents(),
    views: buildMockViews(),
    readings: [],
    conversations: [],
    settings: {
      response_preferences: { tone: 'neutral', length: 'standard', language: 'zh-Hans' },
    },
  };
}
