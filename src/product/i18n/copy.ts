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
  gregorian_date: '公历日期',
  local_date_text: '出生日期',
  local_time_text: '出生时间',
  place_text: '出生地点',
  lunar_year: '农历年',
  lunar_month: '农历月',
  lunar_day: '农历日',
  lunar_is_leap_month: '是否闰月',
  birth_datetime_utc: 'UTC 写入时间',
  birth_precision: '时间记忆程度',
  calculation_sex: '用于推算的性别',
  cultural_marker: '文化标记（可选）',
  latitude: '纬度',
  longitude: '经度',
  iana_time_zone: 'IANA 时区',
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
  bounded_start: '开始日期',
  bounded_end: '结束日期',
  rolling_window_days: '滚动天数',
  instructions: '观察重点',
  view_memory_summary: '视角记忆摘要',
  view_memory_locked: '锁定视角记忆',
  display_state: '显示状态',
  context_note: '新增上下文记录',

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
  consultation_horizon_days: '提问时间范围（天）',
  consultation_basis: '提问基准',
  consultation_view_context: '借用视角',
} as const;

export const FIELD_PLACEHOLDERS = {
  gregorian_date: '例：1990-04-12 或 1990 年 4 月 12 日',
  local_date_text: '例：1990 年 4 月 12 日',
  local_time_text: '例：08:30',
  place_text: '例：上海市黄浦区、北京、格尔木市',
  lunar_year: '例：1990',
  lunar_month: '1–12',
  lunar_day: '1–30',
  birth_datetime_utc: '由系统标准化生成',
  latitude: '由出生地点标准化生成',
  longitude: '由出生地点标准化生成',
  iana_time_zone: '由出生地点标准化生成',
  notes: '可记录资料来源、家人说法或不确定之处',
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
  exact: '准确到具体时间',
  rough_day: '大概时间或仅日期',
  rough_month: '仅月份',
  rough_year: '仅年份',
  unknown: '不确定',
};

export const CALCULATION_SEX_LABELS: Record<CalculationSex, string> = {
  female: '女',
  male: '男',
  unspecified: '暂不确定',
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
  save_natal: '保存出生记录',
  send: '发送',
  generate_today: '生成今日占卜',
  complete_birth_info: '去补全',
  retry_generate: '重试生成',
  generate_view_period: '生成区间展望',
  generate_view_key_window: '生成关键窗口',
  save_context_note: '记录上下文',
  generating: '生成中…',
  ask: '提问',
  asking: '生成中…',
  sending: '发送中…',
  start_followup_conversation: '开启跟进会话',
  open_conversation: '打开会话',
  new_conversation: '新建会话',
  required_marker: ' *',
} as const;

export const STATUS = {
  generating: '正在生成…',
  saved_generic: '已保存。',
  saved_reading: '占卜结果已保存。',
  saved_consultation: '提问记录已保存。',
  saved_view_reading: '视角解读已保存。',
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
  today_reading_ready: '出生信息已满足生成要求，今日尚未生成占卜。',
  today_reading_needs_birth_info: '完善出生信息后，才能生成今日占卜。',
  consultation_reading: '还没有提问记录。',
  conversation_select: '选择一个会话以开始对话。',
  view_workspace_select: '选择一个视角查看它的观察范围、事件与解读。',
  view_context_items: '暂无上下文条目。',
  view_events: '暂无关联事件。',
  view_readings: '暂无视角解读。',
  view_instructions: '暂无指示语。',
  view_memory: '暂无视角记忆。',
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
  natal_onboarding_title: '建立你的本命资料',
  natal_onboarding_body: '你填写出生记录，时镜负责标准化为排盘所需的时间与地点。',
  natal_profile_title: '本命资料',
  natal_profile_completion_title: '完善本命资料',
  natal_section_record: '出生记录',
  natal_section_raw: '出生记录',
  natal_section_canonical: '标准化详情',
  natal_section_location: '出生地点',
  natal_section_notes: '备注',
  natal_section_standardized_preview: '系统标准化预览',
  conversation_dialog: '会话',
  today_card_title: '生成今日占卜',
  today_latest: '最新今日占卜',
  consultation_card_title: '提出你的问题',
  consultation_latest: '最新提问',
  consultation_flow_basis: '提问基准',
  view_workspace: '视角工作台',
  view_subjects: '包含人物',
  view_time_scope: '时间范围',
  view_instructions: '指示语',
  view_memory: '视角记忆',
  view_generation: '生成视角解读',
  view_primary_actions: '主要动作',
  view_context_items: '上下文',
  view_scoped_events: '关联事件',
  view_scoped_readings: '视角解读',
  view_scoped_reading: '视角解读',
} as const;

// Body copy (for action cards / descriptions)
export const BODY = {
  today_intro: '基于你的生辰与当下时空，生成一份只属于你的今日解读。如果生成失败，会原样显示原因，不会拼凑替代文本。',
  today_basis_pending: '今日基准：出生资料待完善',
  today_waiting_notice: '正在生成今日占卜，请保持当前窗口打开。',
  consultation_intro: '描述当下的具体情境或决策困惑，时镜会结合你的生辰特征给出一份解读。',
  consultation_label: '问题描述',
  consultation_subject_basis: '围绕当前查看的人生成临场解读。',
  consultation_view_basis: '借用保存的视角，将其中的人物、时间范围和上下文纳入这次临场提问。结果仍作为临场提问保存，不写入视角工作台。',
  consultation_invalid_horizon: '提问时间范围必须是正整数天数。',
  consultation_view_required: '请选择一个可借用的视角。',
  reading_expired_24h: '当前占卜已超过 24 小时，建议重新生成。',
  reading_expired_7d: '当前占卜已超过 7 天，建议重新生成。',
  view_generation_intro: '基于这个视角的锚点、人物、时间范围、上下文与事件，生成一份可追溯的视角解读。',
  view_bounded_generation_unavailable: '当前视角的固定时间范围无效，请先编辑视角。',
  view_rolling_generation_unavailable: '当前视角的滚动天数无效，请先编辑视角。',
  view_context_note_empty: '请先写下要记录的上下文。',
} as const;

// === Failure headlines ===
// Each headline is plain-language + an actionable hint; the raw code /
// detail belongs in <TechnicalDetails>.
export const FAILURE_HEADLINES = {
  pipeline_stage_failed: '生成失败：推算阶段出错，请稍后重试。',
  runtime_ai_failed: '生成失败：AI 服务暂不可用，请稍后重试。',
  input_readiness_failed: '生成前需要先完善当前对象的生辰资料。',
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
