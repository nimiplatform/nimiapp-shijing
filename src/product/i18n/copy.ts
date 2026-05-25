// Centralized product copy. Domain enum values are kept as canonical
// keys (matching src/domain/**); only their user-facing labels are
// localized here. Do NOT change <option value> in JSX — only labels.

import type { BirthPrecision, CalculationSex, CalendarSystem, ConsentState, CulturalMarker } from '../../domain/person.ts';
import type { ReadingKind, ReadingScope } from '../../domain/reading-matrix.ts';
import type { ResponseLength, ResponseTone } from '../../domain/settings.ts';
import type { DisplayState, TimeScope } from '../../domain/view.ts';

export const BRAND_NAME = '时镜';
export const BRAND_SUB = 'ShiJing';

// === Field labels — keyed by the underlying contract field name. ===
// UI shows the value; reducers / validators continue to use the key.
export const FIELD_LABELS = {
  // RawBirthInput / NatalInputs / BirthLocation
  calendar_system: '历法',
  local_date_text: '出生日期（按记录原文）',
  local_time_text: '出生时间（按记录原文）',
  place_text: '出生地点（按记录原文）',
  lunar_year: '农历年',
  lunar_month: '农历月',
  lunar_day: '农历日',
  lunar_is_leap_month: '是否闰月',
  birth_datetime_utc: '出生时刻（UTC 标准时间）',
  birth_precision: '时间精度',
  calculation_sex: '用于推算的性别',
  cultural_marker: '文化标记（可选）',
  latitude: '出生地纬度',
  longitude: '出生地经度',
  iana_time_zone: '时区',
  place_name: '出生地名称',
  notes: '备注',

  // Person
  display_name: '称呼',
  relation_hint: '与你的关系（简述）',
  consent_state: '同意状态',
  subject_context: '背景说明',

  // View
  view_title: '视角名称',
  anchor_subject: '锚定人物',
  subjects: '包含的人物',
  time_scope: '时间范围',
  bounded_start: '开始时间（UTC）',
  bounded_end: '结束时间（UTC）',
  rolling_window_days: '滚动天数',
  instructions: '给 AI 的指示语',
  view_memory_summary: '视角记忆摘要',
  view_memory_locked: '锁定视角记忆',
  display_state: '显示状态',

  // Event
  event_title: '事件名称',
  occurred_at: '发生时间（UTC）',
  primary_subject: '主要相关人物',
  participants: '其他参与人物',
  view_refs: '关联的视角',
  recap: '经过简述',

  // Relation
  from_subject: '从（人物）',
  to_subject: '到（人物）',
  relation_kind: '关系类型',

  // Settings
  response_tone: '回应语气',
  response_length: '回应详略',
  response_language: '回应语言',
  extra_instructions: '额外指示（可选）',
  daily_today_card_enabled: '每日「今日」提醒',
  daily_today_card_local_time: '提醒时间',
} as const;

export const FIELD_PLACEHOLDERS = {
  local_date_text: '例：1990 年 4 月 12 日',
  local_time_text: '例：上午 8:30',
  place_text: '例：上海市黄浦区',
  birth_datetime_utc: '1990-04-12T08:30:00Z',
  latitude: '-90 到 90',
  longitude: '-180 到 180',
  iana_time_zone: '例：Asia/Shanghai',
  response_language: 'zh-Hans',
  extra_instructions: '例：偏好引用 Carl Jung 的视角',
  consultation_question: '例如：下个月要不要换工作？目前的犹豫主要是…',
} as const;

// === Enum labels — value → 中文 ===
// Key is the canonical domain value. Lookups go through enumLabel().

export const CALENDAR_SYSTEM_LABELS: Record<CalendarSystem, string> = {
  gregorian: '公历',
  lunar_chinese: '农历',
};

export const BIRTH_PRECISION_LABELS: Record<BirthPrecision, string> = {
  exact: '精确',
  rough_day: '仅日期',
  rough_month: '仅月份',
  rough_year: '仅年份',
  unknown: '不详',
};

export const CALCULATION_SEX_LABELS: Record<CalculationSex, string> = {
  male: '男',
  female: '女',
  unspecified: '未指定',
};

export const CULTURAL_MARKER_LABELS: Record<CulturalMarker, string> = {
  natal_yang: '阳命',
  natal_yin: '阴命',
  unspecified: '未指定',
};

export const CONSENT_STATE_LABELS: Record<ConsentState, string> = {
  owner_recorded: '本人代录',
  subject_consented: '本人同意',
  withheld: '暂未告知',
};

export const TIME_SCOPE_LABELS: Record<TimeScope, string> = {
  bounded: '固定区间',
  open_ended: '不限',
  rolling: '滚动窗口',
};

export const DISPLAY_STATE_LABELS: Record<DisplayState, string> = {
  normal: '显示',
  pinned: '置顶',
  archived: '归档',
};

export const RESPONSE_TONE_LABELS: Record<ResponseTone, string> = {
  neutral: '中立',
  warm: '温和',
  concise: '简洁',
};

export const RESPONSE_LENGTH_LABELS: Record<ResponseLength, string> = {
  short: '简短',
  standard: '标准',
  long: '详尽',
};

export const READING_KIND_LABELS: Record<ReadingKind, string> = {
  today: '今日',
  period_outlook: '区间展望',
  key_window: '关键窗口',
  sign: '兆象',
  consultation: '此刻提问',
};

export const READING_SCOPE_LABELS: Record<ReadingScope, string> = {
  subject: '围绕个人',
  view: '围绕视角',
  ad_hoc: '临场',
};

export type ConversationRole = 'user' | 'ai' | 'system';
export const CONVERSATION_ROLE_LABELS: Record<ConversationRole, string> = {
  user: '我',
  ai: '时镜',
  system: '系统',
};

// === Button / status / empty-state / misc text ===

export const BUTTONS = {
  add_person: '新增人物',
  add_view: '新增视角',
  add_event: '新增事件',
  add_relation: '新增关系',
  edit: '编辑',
  delete: '删除',
  save: '保存',
  cancel: '取消',
  save_settings: '保存偏好',
  save_natal: '保存生辰',
  send: '发送',
  generate_today: '生成今日占卜',
  generating: '生成中…',
  ask: '提问',
  asking: '生成中…',
  sending: '发送中…',
  open_conversation: '打开会话',
  new_conversation: '新建会话',
  required_marker: ' *',
} as const;

export const STATUS = {
  generating: '正在生成…',
  saved_generic: '已保存。',
  saved_reading: '占卜结果已保存。',
  saved_consultation: '提问记录已保存。',
  sending: '发送中…',
} as const;

export const EMPTY_STATES = {
  persons: '还没有人物。点击右上角"新增人物"开始添加。',
  views: '还没有观察视角。',
  events: '还没有事件。',
  relations: '还没有人物关系。',
  conversations: '还没有会话。',
  conversation_turns: '还没有消息。',
  views_to_reference: '暂无可关联的视角。请先在「视角」中创建。',
  today_reading: '今日尚未生成占卜。',
  consultation_reading: '还没有提问记录。',
  conversation_select: '选择一个会话以开始对话。',
} as const;

export const TAB_EYEBROWS = {
  consultation: '此刻提问',
  views: '关注的人 + 关注的时段',
  me: '个人空间',
} as const;

export const HEADINGS = {
  persons: '人物',
  views: '观察视角',
  events: '事件',
  relations: '人物关系',
  conversations: '会话',
  settings: '偏好设置',
  add_person: '新增人物',
  edit_person: '编辑人物',
  add_view: '新增视角',
  edit_view: '编辑视角',
  add_event: '新增事件',
  edit_event: '编辑事件',
  add_relation: '新增关系',
  edit_relation: '编辑关系',
  natal_section_raw: '原始记录',
  natal_section_canonical: '标准化时刻',
  natal_section_location: '出生地点',
  natal_section_notes: '备注',
  conversation_dialog: '会话',
  today_card_title: '生成今日占卜',
  today_latest: '最新今日占卜',
  consultation_card_title: '提出你的问题',
  consultation_latest: '最新提问',
} as const;

// Body copy (for action cards / descriptions)
export const BODY = {
  today_intro: '基于你的生辰与当下时空，生成一份只属于你的今日解读。如果生成失败，会原样显示原因，不会拼凑替代文本。',
  consultation_intro: '描述当下的具体情境或决策困惑，时镜会结合你的生辰特征给出一份解读。',
  consultation_label: '问题描述',
  reading_expired_24h: '当前占卜已超过 24 小时，建议重新生成。',
  reading_expired_7d: '当前占卜已超过 7 天，建议重新生成。',
} as const;

// === Failure headlines ===
// Each headline is plain-language + an actionable hint; the raw code /
// detail belongs in <TechnicalDetails>.
export const FAILURE_HEADLINES = {
  pipeline_stage_failed: '生成失败：推算阶段出错，请稍后重试。',
  runtime_ai_failed: '生成失败：AI 服务暂不可用，请稍后重试。',
  reading_validation_failed: '生成失败：占卜结果格式不合规，请重新生成。',
  chat_generator_failed: '回复失败：AI 服务暂不可用，请稍后再试。',
  snapshot_rejected: '数据加载失败：本地数据不符合规范，请重新登录或联系支持。',
  create_refused: '无法新建：数据校验未通过，请检查输入或稍后重试。',
  delete_refused_validator: '暂时无法删除（数据校验未通过）。',
  save_refused: '保存失败，请检查输入。',
  person_invalid: '人物信息有误，请检查"称呼"和"同意状态"。',
  natal_invalid: '生辰信息有误，请检查输入。',
  settings_invalid: '设置无效，请检查"回应语言"和"提醒时间"格式。',
  consultation_empty: '请先填写问题描述。',
  view_invalid: '视角设置有误，请检查必填项。',
  event_invalid: '事件信息有误，请检查必填项。',
  relation_invalid: '关系信息有误，请检查必填项。',
} as const;

// Empty-select placeholder for required dropdowns
export const SELECT_REQUIRED_PLACEHOLDER = '— 请选择';
export const SELECT_OPTIONAL_PLACEHOLDER = '— 未指定';
export const SELECT_TEMPLATE_PLACEHOLDER = '— 无模板';
export const TECHNICAL_DETAILS_SUMMARY = '查看技术详情';

// LeapMonth tri-state labels
export const LEAP_MONTH_LABELS = {
  unanswered: '— 请选择',
  normal: '非闰月',
  leap: '闰月',
} as const;

// Memory-locked select labels
export const MEMORY_LOCKED_LABELS = {
  locked: '已锁定',
  unlocked: '未锁定',
} as const;

// Subject self label
export const SELF_DISPLAY_NAME = '本人';
export const UNKNOWN_SUBJECT_DISPLAY_NAME = '未知人物';
