// W05 — Centralized product copy for the four-mirror IA.

import type {
  BirthPrecision,
  CalculationSex,
  CalendarSystem,
  ConsentState,
} from '../../domain/person.ts';
import type { MirrorKind } from '../../domain/mirror-scope.ts';
import type {
  NianJingInflectionKind,
  TendencyClass,
} from '../../domain/mirror-output.ts';
import type { ConversationRole } from '../../domain/conversation.ts';
import type { ResponseLength, ResponseTone } from '../../domain/settings.ts';
import type { ShijingSettingsPageId } from '../../contracts/ia-contract.ts';

export const BRAND_NAME = '时镜';
export const BRAND_SUB = 'ShiJing';

export const MIRROR_KIND_LABELS: Record<MirrorKind, string> = {
  rijing: '日镜',
  yuejing: '月镜',
  nianjing: '年镜',
  shijing: '时镜',
};

export const TENDENCY_CLASS_LABELS: Record<TendencyClass, string> = {
  supportive: '助力',
  steady: '平稳',
  watch: '观察',
  blocked: '阻滞',
  turning: '转折',
};

export const NIANJING_INFLECTION_KIND_LABELS: Record<
  NianJingInflectionKind,
  string
> = {
  dayun_boundary: '大运边界',
  annual_transition: '流年切换',
  monthly_transition: '流月切换',
  marker_cluster: '多重节点',
};

export const CALENDAR_SYSTEM_LABELS: Record<CalendarSystem, string> = {
  gregorian: '公历',
  lunar_chinese: '农历',
};

export const BIRTH_PRECISION_LABELS: Record<BirthPrecision, string> = {
  exact: '准确到分钟',
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

// 资料来源 — relabels the consent_state enum into user-facing「资料来源」
// language (who provided this person's birth data). Enum values are unchanged.
export const CONSENT_STATE_LABELS: Record<ConsentState, string> = {
  owner_recorded: '我代为记录',
  subject_consented: '本人提供',
  withheld: '暂不确定',
};

// Display order for the 资料来源 dropdown (本人提供 first, per product copy).
export const CONSENT_STATE_ORDER: readonly ConsentState[] = [
  'subject_consented',
  'owner_recorded',
  'withheld',
];

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

export const CONVERSATION_ROLE_LABELS: Record<ConversationRole, string> = {
  user: '我',
  ai: '时镜',
};

// SJG-IA-06 — friendly labels for concern-tag status. The stored values stay
// active / archived; users see warmer wording.
export const CONCERN_TAG_STATUS_LABELS = {
  active: '关注中',
  archived: '已收起',
} as const;

// Where a memory or plan came from. Internally the value is a runtime id
// (manual / rijing / …); users just need to know who recorded it.
export const RECORD_SOURCE_LABELS = {
  manual: '我自己记的',
  rijing: '来自日镜',
  yuejing: '来自月镜',
  nianjing: '来自年镜',
  shijing: '来自时镜',
} as const;

// Whether a memory may be drawn on while generating a reading. Replaces the
// raw record_only / eligible_for_retrieval enum in the UI.
export const MEMORY_USE_LABELS = {
  record_only: '只自己留个底',
  eligible_for_retrieval: '可以作为解读参考',
} as const;

export const SETTINGS_SURFACE_LABELS = {
  self: '本人',
  people: '人物',
  concern_tags: '关注标签',
  memory_and_plans: '记忆与计划',
  response_preferences: '回应偏好',
  privacy_local_data: '隐私与本地数据',
  diagnostics: '诊断',
} as const;

// SJG-IA-04 — labels for the settings sub-pages (see SHIJING_SETTINGS_PAGES).
export const SETTINGS_PAGE_LABELS: Record<ShijingSettingsPageId, string> = {
  profile: '档案',
  concerns: '关注',
  memory: '重要经历',
  settings: '设置',
};

export const READINESS_BLOCKER_LABELS = {
  missing_self_natal_inputs: '尚未填写本人生辰',
  invalid_self_natal_inputs: '本人生辰格式有误',
  unresolved_person_mention: '关注中存在未解析的人员提及',
  incomplete_related_person_natal_inputs: '相关人物的本命输入不完整',
  stale_reading_inputs: '解读所基于的输入已过期',
  runtime_ai_failure: 'AI 服务暂不可用',
  persistence_failure: '本地数据读写失败',
  hash_mismatch: '哈希校验未通过,需要重新生成',
} as const;
