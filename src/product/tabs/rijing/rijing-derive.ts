// Visual-first derivation helpers for the RiJing tab.
//
// The mirror pipeline gives us a Reading whose `output` is the
// discriminated `RiJingMirrorOutput` (summary / daily_overview /
// concern_projections). The Hero presentation wants a calmer
// register than the raw pipeline output: a short evocative headline,
// a small set of tendency leanings, a confidence note, and a
// reminder line. These helpers shape that presentation without
// inventing claims beyond what the Reading already says.

import type { Reading } from '../../../domain/reading.ts';
import type {
  RiJingConcernProjection,
  RiJingMirrorOutput,
  TendencyClass,
} from '../../../domain/mirror-output.ts';
import type { EventMemory } from '../../../domain/event-memory.ts';
import { TENDENCY_CLASS_LABELS } from '../../i18n/copy.ts';
import { deriveMethodEvidenceChips, type MethodEvidenceChip } from '../shared/method-evidence-chips.ts';

export interface RiJingHeroContent {
  readonly hasReading: boolean;
  readonly eyebrow: string;
  readonly headline: string;
  readonly description: string;
  readonly leanings: readonly string[];
  readonly confidence_label: string;
  readonly confidence_note: string;
  readonly reminder: string;
}

export type RiJingEmptyStateKind =
  | 'ready_to_generate'
  | 'profile_incomplete'
  | 'missing_focus'
  | 'runtime_ai_failed'
  | 'persistence_pending'
  | 'persistence_failed';

export interface RiJingHeroDeriveOptions {
  readonly empty_state?: RiJingEmptyStateKind;
}

export interface RiJingDateLabel {
  readonly date: string;
  readonly weekday: string;
  readonly zone: string;
}

// Maps the deterministic ShijingStageLabel (carried on every Reading
// via inputs_summary.feature_snapshot.stage_label) to a short evocative
// Hero headline phrase. 4-character serif phrases survive in the
// 32-px Hero slot without truncation.
const STAGE_HEADLINE: Record<string, string> = {
  进时: '顺势承担',
  收时: '收束归档',
  养时: '修养蓄力',
  转时: '处于转折',
  守时: '稳中守节',
};

const STAGE_HEADLINE_FALLBACK = '如常推进';
const HEADLINE_FALLBACK = '尚未生成今日日镜';

const EMPTY_HERO_COPY: Record<
  RiJingEmptyStateKind,
  Pick<RiJingHeroContent, 'description' | 'confidence_note' | 'reminder'>
> = {
  ready_to_generate: {
    description: '资料与关注已就绪，点击右上角刷新即可生成今日判断。',
    confidence_note: '今日日镜尚未生成。',
    reminder: '生成前请确认解读视角是否符合你今天真正关心的问题。',
  },
  profile_incomplete: {
    description: '先完善本人生辰资料，日镜才能计算当下时空与命盘关系。',
    confidence_note: '资料未就绪，今日判断尚未生成。',
    reminder: '补全资料后，系统会按当前关注自动生成今日日镜。',
  },
  missing_focus: {
    description: '先添加并激活一个关注，日镜会围绕你正在意的事生成。',
    confidence_note: '缺少解读视角，今日判断尚未生成。',
    reminder: '关注是日镜的镜片；没有关注时，系统不会生成泛化建议。',
  },
  runtime_ai_failed: {
    description: 'Runtime AI wording 未完成，当前不会生成替代解读。',
    confidence_note: 'AI 生成失败，日镜按 fail-close 规则停止。',
    reminder: '请先确认 AI 模型配置，再重新生成今日日镜。',
  },
  persistence_pending: {
    description: '正在加载本地数据，完成后才能生成今日日镜。',
    confidence_note: '本地快照尚未就绪。',
    reminder: '等待本地数据加载完成，可以避免覆盖尚未读取的快照。',
  },
  persistence_failed: {
    description: '本地数据读写失败，日镜已停止生成以保护快照一致性。',
    confidence_note: '本地持久化不可用。',
    reminder: '请到设置检查隐私与本地数据，再重新生成今日日镜。',
  },
};

const CONFIDENCE_LABEL: Record<'high' | 'medium' | 'low', string> = {
  high: '较高',
  medium: '中等',
  low: '较低',
};

// Tendency class → leaning chip text. We use the i18n labels for the
// dominant tendency (e.g. supportive → 助力) so the leanings strip
// reads as a derived projection summary, not a hand-written phrase.
function leaningsForReading(reading: Reading): readonly string[] {
  const output = reading.output as RiJingMirrorOutput;
  if (output.concern_projections.length === 0) return ['平稳'];
  const counts = new Map<TendencyClass, number>();
  for (const p of output.concern_projections) {
    counts.set(p.tendency_class, (counts.get(p.tendency_class) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => TENDENCY_CLASS_LABELS[t]);
}

function condense(text: string, max: number): string {
  const cleaned = text.trim().replace(/\s+/g, '');
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max)}…`;
}

export function deriveRiJingHero(
  reading: Reading | undefined,
  options: RiJingHeroDeriveOptions = {},
): RiJingHeroContent {
  if (!reading) {
    const emptyCopy = EMPTY_HERO_COPY[options.empty_state ?? 'ready_to_generate'];
    return {
      hasReading: false,
      eyebrow: '今日总览',
      headline: HEADLINE_FALLBACK,
      description: emptyCopy.description,
      leanings: [],
      confidence_label: '—',
      confidence_note: emptyCopy.confidence_note,
      reminder: emptyCopy.reminder,
    };
  }
  const output = reading.output as RiJingMirrorOutput;
  // stage_label comes from the feature snapshot's stage_drivers list.
  // We use the first driver's label as the dominant stage for the
  // headline; downstream copy (description) still carries the full
  // pipeline narrative.
  const firstStage = reading.inputs_summary.feature_snapshot.common.stage_drivers[0]?.stage_label;
  const headline = firstStage
    ? STAGE_HEADLINE[firstStage] ?? STAGE_HEADLINE_FALLBACK
    : STAGE_HEADLINE_FALLBACK;
  const summary = output.summary || output.daily_overview || HEADLINE_FALLBACK;
  const description = output.daily_overview || summary;
  const caveat = reading.uncertainty.caveats[0];
  const dataGap = reading.uncertainty.data_gaps[0];
  const reminder =
    caveat ||
    dataGap ||
    '今日可以稳定推进，仍记得在动作前再做一次"是否真的准备好了"的确认。';
  const confidence_note =
    caveat ||
    dataGap ||
    '推演基于完整资料，结论可作为节奏参考。';
  return {
    hasReading: true,
    eyebrow: '今日总览',
    headline,
    description,
    leanings: leaningsForReading(reading),
    confidence_label: CONFIDENCE_LABEL[reading.uncertainty.confidence],
    confidence_note,
    reminder,
  };
}

// ----- action cards -----
//
// Action cards are rendered only from generated Reading content. Empty output
// stays empty; the product must not synthesize guidance copy.

export type RiJingActionSlot = 'do' | 'say' | 'avoid';

export interface RiJingActionItem {
  readonly slot: RiJingActionSlot;
  readonly eyebrow: string;
  readonly title: string;
  readonly body: string;
}

const NON_ACTIONABLE_UNCERTAINTY_CODES = new Set<string>([
  'birth_precision_exact',
]);

function firstActionableCaveat(reading: Reading | undefined): string | undefined {
  if (!reading) return undefined;
  for (let i = 0; i < reading.uncertainty.caveats.length; i += 1) {
    const code = reading.uncertainty.data_gaps[i];
    if (code && NON_ACTIONABLE_UNCERTAINTY_CODES.has(code)) continue;
    return reading.uncertainty.caveats[i];
  }
  return undefined;
}

export function deriveRiJingActions(
  reading: Reading | undefined,
): readonly RiJingActionItem[] {
  if (!reading) return [];
  const output = reading?.output as RiJingMirrorOutput | undefined;
  const recs = output
    ? output.concern_projections.flatMap((p) => p.recommendations)
    : [];
  const summaries = output
    ? output.concern_projections.map((p) => p.summary).filter((s) => s.length > 0)
    : [];
  const avoidCaveat = firstActionableCaveat(reading);

  const doText = recs[0];
  const sayText = recs[1] ?? summaries[0];
  const items: RiJingActionItem[] = [];

  if (doText) {
    items.push({
      slot: 'do',
      eyebrow: '今天做一件事',
      title: condense(doText, 14),
      body: doText,
    });
  }

  if (sayText) {
    items.push({
      slot: 'say',
      eyebrow: '今天说一句话',
      title: condense(sayText, 14),
      body: sayText,
    });
  }

  if (avoidCaveat) {
    items.push({
      slot: 'avoid',
      eyebrow: '今天避免一件事',
      title: condense(avoidCaveat, 14),
      body: avoidCaveat,
    });
  }

  return items;
}

// Friendly Chinese name for common IANA timezones; falls back to
// "City (GMT±N)" so the user never sees a raw "Etc/UTC" string.
const FRIENDLY_TIME_ZONE_LABELS: Record<string, string> = {
  'Etc/UTC': '国际标准时间',
  UTC: '国际标准时间',
  GMT: '国际标准时间',
  'Asia/Shanghai': '北京时间',
  'Asia/Chongqing': '北京时间',
  'Asia/Hong_Kong': '香港时间',
  'Asia/Taipei': '台北时间',
  'Asia/Tokyo': '东京时间',
  'Asia/Seoul': '首尔时间',
  'Asia/Singapore': '新加坡时间',
  'Asia/Bangkok': '曼谷时间',
  'Asia/Dubai': '迪拜时间',
  'Europe/London': '伦敦时间',
  'Europe/Paris': '巴黎时间',
  'Europe/Berlin': '柏林时间',
  'Europe/Moscow': '莫斯科时间',
  'America/New_York': '纽约时间',
  'America/Los_Angeles': '洛杉矶时间',
  'America/Chicago': '芝加哥时间',
  'Australia/Sydney': '悉尼时间',
};

function gmtOffsetFor(iana: string, now: Date): string {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', { timeZone: iana, timeZoneName: 'shortOffset' });
    const parts = dtf.formatToParts(now);
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

export function friendlyTimeZoneLabel(iana: string, now: Date = new Date()): string {
  if (!iana) return '本地时间';
  if (FRIENDLY_TIME_ZONE_LABELS[iana]) return FRIENDLY_TIME_ZONE_LABELS[iana]!;
  const segs = iana.split('/');
  const tail = (segs[segs.length - 1] ?? iana).replace(/_/g, ' ');
  const offset = gmtOffsetFor(iana, now);
  return offset ? `${tail}（${offset}）` : tail || iana;
}

export function rijingDateLabel(basisTimeZone: string, now: Date = new Date()): RiJingDateLabel {
  const tz = basisTimeZone === '' ? 'Etc/UTC' : basisTimeZone;
  const formatter = new Intl.DateTimeFormat('zh-CN-u-ca-gregory', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'long',
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  return {
    date: `${year}年${month}月${day}日`,
    weekday,
    zone: friendlyTimeZoneLabel(tz, now),
  };
}

export interface RecentMemoryItem {
  readonly memory: EventMemory;
  readonly date_label: string;
  readonly text: string;
}

export function deriveRecentMemories(
  memories: readonly EventMemory[],
  limit = 3,
): readonly RecentMemoryItem[] {
  return memories
    .slice()
    .sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at))
    .slice(0, limit)
    .map((memory) => ({
      memory,
      date_label: memory.occurred_at.slice(0, 10),
      text: memory.body,
    }));
}

// ----- evidence chips -----

export type RijingEvidenceChip = MethodEvidenceChip;

export function deriveEvidenceChips(reading: Reading | undefined): readonly RijingEvidenceChip[] {
  if (!reading) {
    return [{ group: '数据完整度', value: '待生成' }];
  }
  return deriveMethodEvidenceChips(reading);
}

export type { RiJingConcernProjection };
