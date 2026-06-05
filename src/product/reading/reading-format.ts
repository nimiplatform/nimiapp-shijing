// W03 — formatting helpers for the Mirror Architecture v1 Reading.
//
// Renderer-facing helpers shaped around `MirrorOutput` discriminants
// and the new `MirrorContextSnapshot` /
// `AstrologyFeatureSnapshot.canonical_window`.

import type { CanonicalMirrorWindow, KeyWindowLabel, MarkerStrength, MethodProfileId } from '../../domain/algorithm.ts';
import type { TendencyClass } from '../../domain/mirror-output.ts';
import type { MirrorKind } from '../../domain/mirror-scope.ts';
import type { ConfidenceLevel, Reading } from '../../domain/reading.ts';

export const METHOD_LABELS: Record<MethodProfileId, string> = {
  bazi_ziping_v1: '八字子平法',
  ziwei_sanhe_v1: '紫微斗数(三合派)',
};

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: '资料较完整',
  medium: '有部分限制',
  low: '限制较多',
};

const TENDENCY_LABELS: Record<TendencyClass, string> = {
  supportive: '助力',
  steady: '平稳',
  watch: '观察',
  blocked: '阻滞',
  turning: '转折',
};

const KEY_WINDOW_LABEL_TEXT: Record<KeyWindowLabel, string> = {
  transition: '转换窗口',
  support: '承托窗口',
  closure: '收束窗口',
  maintenance: '守成窗口',
};

const MARKER_STRENGTH_LABELS: Record<MarkerStrength, string> = {
  high: '强',
  medium: '中',
  low: '弱',
};

const MIRROR_KIND_LABELS: Record<MirrorKind, string> = {
  rijing: '日镜',
  yuejing: '月镜',
  nianjing: '年镜',
  shijing: '时镜',
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

export function formatCanonicalWindow(window: CanonicalMirrorWindow): string {
  return `${formatDateRange(window.start_utc, window.end_utc, window.basis_time_zone)} · ${window.basis_time_zone}`;
}

export function formatReadingCreatedAt(reading: Reading): string {
  return formatTimestamp(reading.created_at, reading.mirror_scope.basis_time_zone);
}

export function formatConfidence(confidence: ConfidenceLevel): string {
  return CONFIDENCE_LABELS[confidence];
}

export function formatTendencyClass(tendency: TendencyClass): string {
  return TENDENCY_LABELS[tendency];
}

export function formatKeyWindowLabel(label: KeyWindowLabel): string {
  return KEY_WINDOW_LABEL_TEXT[label];
}

export function formatMarkerStrength(strength: MarkerStrength): string {
  return MARKER_STRENGTH_LABELS[strength];
}

export function formatMirrorKind(kind: MirrorKind): string {
  return MIRROR_KIND_LABELS[kind];
}

export function formatMethodName(methodId: string): string {
  return METHOD_LABELS[methodId as keyof typeof METHOD_LABELS] ?? '占星算法';
}

export function formatUncertaintyItem(code: string): string {
  return code;
}
