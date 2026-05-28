import type {
  ConfidenceLevel,
  RecommendationHorizon,
  Reading,
  ReadingTimeWindow,
} from '../../domain/reading.ts';
import type {
  CycleMarkerKind,
  KeyWindowLabel,
  MarkerStrength,
  ReadingTimeWindowSource,
  UncertaintyInputCode,
} from '../../domain/algorithm.ts';

export const METHOD_LABELS = {
  bazi_ganzhi_jieqi_dayun_v1: '八字干支节气大运法',
} as const;

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: '资料较完整',
  medium: '有部分限制',
  low: '限制较多',
};

const HORIZON_LABELS: Record<RecommendationHorizon, string> = {
  today: '今日',
  this_week: '本周',
  this_month: '本月',
  long_term: '长期',
};

const MARKER_KIND_LABELS: Record<CycleMarkerKind, string> = {
  dayun_boundary: '大运交界',
  annual_transition: '年运转换',
  monthly_transition: '月令转换',
  clash: '冲动',
  combination: '合动',
  storage: '收束',
  resource: '滋养',
  output: '表达',
  wealth: '取用',
  constraint: '约束',
};

const MARKER_STRENGTH_LABELS: Record<MarkerStrength, string> = {
  high: '强',
  medium: '中',
  low: '弱',
};

const KEY_WINDOW_LABEL_TEXT: Record<KeyWindowLabel, string> = {
  transition: '转换窗口',
  support: '承托窗口',
  closure: '收束窗口',
  maintenance: '守成窗口',
};

const TIME_WINDOW_SOURCE_LABELS: Record<ReadingTimeWindowSource, string> = {
  kind_default: '默认时间窗',
  view_time_scope: '关注时间窗',
  user_selected: '手动选择',
  ad_hoc_question: '提问时间窗',
};

const UNCERTAINTY_LABELS: Record<UncertaintyInputCode, string> = {
  birth_precision_exact: '出生时间资料较完整',
  birth_precision_rough_day: '出生时间只精确到日期，小时柱会受限',
  birth_precision_rough_month: '出生时间只精确到月份，可判断范围明显收窄',
  birth_precision_rough_year: '出生时间只精确到年份，当前解读需谨慎',
  birth_precision_unknown: '出生时间不确定，无法形成可靠解读',
  location_missing: '缺少出生地点，真太阳时校正受限',
  timezone_missing: '缺少出生时区，时间换算受限',
  ephemeris_missing: '缺少节气表证据，干支边界无法确认',
  calculation_sex_unspecified: '大运顺逆所需性别未指定',
  consent_withheld: '相关人物未明确同意，仅作有限参考',
  view_context_sparse: '关注上下文较少，解读会偏保守',
  ai_parse_failed: 'AI 返回未通过结构解析',
};

function dateTimeParts(iso: string, timeZone: string): Intl.DateTimeFormatPart[] | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat('zh-CN-u-ca-gregory', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(date);
  } catch {
    return null;
  }
}

function partValue(parts: readonly Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? '';
}

export function formatTimestamp(iso: string, basisTimeZone: string): string {
  const parts = dateTimeParts(iso, basisTimeZone);
  if (!parts) return iso;
  return `${partValue(parts, 'year')}年${partValue(parts, 'month')}月${partValue(parts, 'day')}日 ${partValue(parts, 'hour')}:${partValue(parts, 'minute')}`;
}

export function formatDateRange(
  startUtc: string | undefined,
  endUtc: string | undefined,
  basisTimeZone: string,
): string {
  if (!startUtc || !endUtc) return '未限定';
  return `${formatTimestamp(startUtc, basisTimeZone)} - ${formatTimestamp(endUtc, basisTimeZone)}`;
}

export function formatTimeWindow(window: ReadingTimeWindow): string {
  if (window.mode === 'natal') {
    return `本命盘时间 · ${window.basis_time_zone} · ${TIME_WINDOW_SOURCE_LABELS[window.source]}`;
  }
  return `${formatDateRange(window.start_utc, window.end_utc, window.basis_time_zone)} · ${window.basis_time_zone}`;
}

export function formatReadingCreatedAt(reading: Reading): string {
  return formatTimestamp(reading.created_at, reading.time_window.basis_time_zone);
}

export function formatConfidence(confidence: ConfidenceLevel): string {
  return CONFIDENCE_LABELS[confidence];
}

export function formatRecommendationHorizon(horizon: RecommendationHorizon): string {
  return HORIZON_LABELS[horizon];
}

export function formatMarkerKind(kind: CycleMarkerKind): string {
  return MARKER_KIND_LABELS[kind];
}

export function formatMarkerStrength(strength: MarkerStrength): string {
  return MARKER_STRENGTH_LABELS[strength];
}

export function formatKeyWindowLabel(label: KeyWindowLabel): string {
  return KEY_WINDOW_LABEL_TEXT[label];
}

export function formatUncertaintyItem(item: string): string {
  return UNCERTAINTY_LABELS[item as UncertaintyInputCode] ?? item;
}

export function formatMethodName(methodId: string): string {
  return METHOD_LABELS[methodId as keyof typeof METHOD_LABELS] ?? '占星算法';
}
