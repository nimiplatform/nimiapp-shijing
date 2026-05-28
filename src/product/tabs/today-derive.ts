// Visual-first content derivation for the Today tab.
//
// The mockup surfaces several rhetorical structures (headline conclusion,
// three action chips, three time-of-day suggestions, reflection question,
// recent-event chips, evidence chips) that do NOT map 1:1 to the existing
// Reading data model. This module converts whatever Reading data is
// available into those visual slots, falling back to static copy when the
// generator has not run yet.
//
// Nothing here invents claims that aren't supported by the Reading — when
// no Reading exists, every "derived" value is a clear placeholder ("尚未
// 生成今日时镜") rather than fabricated wording.

import type { Reading, Recommendation } from '../../domain/reading.ts';
import type { Event } from '../../domain/event.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import { subjectRefKey, type SubjectRef } from '../../domain/subject-ref.ts';
import { subjectDisplayName } from '../i18n/subject-display-name.ts';
import {
  formatRecommendationHorizon,
  formatUncertaintyItem,
} from '../reading/reading-format.ts';

export interface TodayHeroContent {
  readonly hasReading: boolean;
  readonly eyebrow: string;
  readonly headline: string;
  readonly keywords: readonly string[];
  readonly description: string;
  readonly leanings: readonly string[];
  readonly confidence_label: string;
  readonly confidence_note: string;
  readonly reminder: string;
}

export interface TodayActionItem {
  readonly slot: 'do' | 'say' | 'avoid';
  readonly eyebrow: string;
  readonly title: string;
  readonly body: string;
}

export interface TodayTimeSlotItem {
  readonly slot: 'morning' | 'afternoon' | 'evening';
  readonly label: string;
  readonly time_range: string;
  readonly body: string;
}

export interface TodaySplitCards {
  readonly interpretation: readonly string[];
  readonly relations: string;
  readonly affairs: string;
}

export interface TodayReflection {
  readonly eyebrow: string;
  readonly question: string;
  readonly hint: string;
}

export interface TodayEvidenceChip {
  readonly group: string;
  readonly value: string;
}

export interface TodayRecentEvent {
  readonly id: string;
  readonly date_label: string;
  readonly title: string;
  readonly feeling: string;
  readonly category: string;
}

export interface TodayDateLabel {
  readonly date: string;
  readonly weekday: string;
  readonly zone: string;
}

const HEADLINE_FALLBACK = '尚未生成今日时镜';

// Maps the deterministic ShijingStageLabel (carried on every Reading
// via inputs_summary.feature_snapshot.stage_label) to a short evocative
// Hero headline phrase. Headlines are intentionally 4–6 characters,
// non-mystical, and survivable in a 32-px serif slot without truncation.
//
// We deliberately do NOT mine the AI-generated `summary` text for the
// headline anymore. The first sentence of `summary` is mechanical
// metadata (e.g. "日主资料未足，年柱..., 大运...") and mechanically
// truncating it produced reader-hostile fragments like
// "日主资料未足，年…".
const STAGE_HEADLINE: Record<string, string> = {
  进时: '顺势承担',
  收时: '收束归档',
  养时: '修养蓄力',
  转时: '处于转折',
  守时: '稳中守节',
};

const STAGE_HEADLINE_FALLBACK = '如常推进';

const STATIC_LEANINGS: Record<'high' | 'medium' | 'low', readonly string[]> = {
  high: ['宜推进', '宜沟通', '稳节奏'],
  medium: ['宜推进', '宜沟通', '稳节奏'],
  low: ['宜守', '宜整理', '宜复盘'],
};

const STATIC_CONFIDENCE_LABEL: Record<'high' | 'medium' | 'low', string> = {
  high: '较高',
  medium: '中等',
  low: '较低',
};

function take<T>(items: readonly T[], n: number): readonly T[] {
  return items.slice(0, n);
}

function condense(text: string, max = 22): string {
  const cleaned = text.trim().replace(/\s+/g, '');
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max)}…`;
}

function keywordsFromReading(reading: Reading): readonly string[] {
  const labels = reading.output.highlights.map((h) => condense(h.label, 6)).filter((s) => s.length > 0);
  if (labels.length >= 3) return take(labels, 3);
  if (labels.length > 0) return labels;
  return ['确认', '推进', '守节奏'];
}

export function deriveTodayHero(reading: Reading | undefined): TodayHeroContent {
  if (!reading) {
    return {
      hasReading: false,
      eyebrow: '今日结论',
      headline: HEADLINE_FALLBACK,
      keywords: ['待生成'],
      description: '点击下方"刷新今日"，会基于你的生辰资料与当下时空，给出一份只属于你的今日解读。',
      leanings: STATIC_LEANINGS.medium,
      confidence_label: '—',
      confidence_note: '今日时镜尚未生成。',
      reminder: '生成前请先确认上方的"查看对象"与日期，是否符合你想要的视角。',
    };
  }
  const summary = reading.output.summary;
  // Headline derives from the contracted stage_label, not from the
  // summary text. This keeps the Hero title short, evocative, and
  // semantically aligned with the deterministic pipeline output —
  // independent of how the AI phrased its narrative.
  const stageLabel = reading.inputs_summary.feature_snapshot.stage_label;
  const headline = STAGE_HEADLINE[stageLabel] ?? STAGE_HEADLINE_FALLBACK;
  const description = summary || HEADLINE_FALLBACK;
  const leanings = STATIC_LEANINGS[reading.uncertainty.confidence];
  const caveat = reading.uncertainty.caveats[0];
  const dataGap = reading.uncertainty.data_gaps[0];
  const reminder = (() => {
    if (caveat) return formatUncertaintyItem(caveat);
    if (dataGap) return formatUncertaintyItem(dataGap);
    return '今天可以稳定推进，但仍记得在动作前再做一次"是否真的准备好了"的确认。';
  })();
  const confidence_note = (() => {
    if (caveat) return formatUncertaintyItem(caveat);
    if (dataGap) return formatUncertaintyItem(dataGap);
    return '推演基于完整资料，结论可作为节奏参考。';
  })();
  return {
    hasReading: true,
    eyebrow: '今日结论',
    headline,
    keywords: keywordsFromReading(reading),
    description,
    leanings,
    confidence_label: STATIC_CONFIDENCE_LABEL[reading.uncertainty.confidence],
    confidence_note,
    reminder,
  };
}

export function deriveTodayActions(reading: Reading | undefined): readonly TodayActionItem[] {
  const recs = reading?.output.recommendations ?? [];
  const highlights = reading?.output.highlights ?? [];
  const caveats = reading?.uncertainty.caveats ?? [];

  const doRec: Recommendation | undefined = recs.find((r) => r.horizon === 'today') ?? recs[0];
  const sayHighlight = highlights[0];
  const avoidCaveat = caveats[0];

  return [
    {
      slot: 'do',
      eyebrow: '今天做一件事',
      title: doRec ? condense(doRec.body, 14) : '推进一件已经准备好的事情',
      body: doRec
        ? `${formatRecommendationHorizon(doRec.horizon)}建议：${doRec.body}`
        : '选一件已有基础的事，把它往前送一步，不必追求一次完成。',
    },
    {
      slot: 'say',
      eyebrow: '今天说一句话',
      title: sayHighlight ? condense(sayHighlight.label, 14) : '和关键人物确认彼此预期',
      body: sayHighlight ? sayHighlight.body : '适合把时间、分工、边界说清楚，减少后面来回反复解释。',
    },
    {
      slot: 'avoid',
      eyebrow: '今天避免一件事',
      title: avoidCaveat ? condense(formatUncertaintyItem(avoidCaveat), 14) : '不要为了赶进度而打乱原本节奏',
      body: avoidCaveat
        ? formatUncertaintyItem(avoidCaveat)
        : '今天不适合临时加码，也不适合因为一时焦虑就推翻原本计划。',
    },
  ];
}

const TIME_SLOTS: readonly { slot: TodayTimeSlotItem['slot']; label: string; time_range: string; fallback: string }[] = [
  {
    slot: 'morning',
    label: '上午',
    time_range: '08:00 — 12:00',
    fallback: '适合整理信息、确认安排，把今天要推进的事收束到一两个重点。',
  },
  {
    slot: 'afternoon',
    label: '下午',
    time_range: '12:00 — 18:00',
    fallback: '适合沟通、递交、推进。已经谈过的事情，可以给出更明确的下一步。',
  },
  {
    slot: 'evening',
    label: '晚上',
    time_range: '18:00 — 23:00',
    fallback: '适合复盘和收尾，不宜临时做重大决定。把今天看见的问题记下来即可。',
  },
];

export function deriveTodayTimeSlots(reading: Reading | undefined): readonly TodayTimeSlotItem[] {
  const recs = reading?.output.recommendations.filter((r) => r.horizon === 'today') ?? [];
  return TIME_SLOTS.map((slot, idx): TodayTimeSlotItem => {
    const rec: Recommendation | undefined = recs[idx];
    return {
      slot: slot.slot,
      label: slot.label,
      time_range: slot.time_range,
      body: rec ? rec.body : slot.fallback,
    };
  });
}

export function deriveTodaySplitCards(reading: Reading | undefined): TodaySplitCards {
  if (!reading) {
    return {
      interpretation: [
        '今日时镜尚未生成。生成后会在这里展开节奏的内在结构、关键细节与建议的落地动作。',
      ],
      relations: '生成后会给出今日适合与关键人物沟通的角度。',
      affairs: '生成后会给出今日适合推进的事务与需要避免的分支。',
    };
  }
  const highlights = reading.output.highlights;
  const interpretation = highlights.slice(0, 2).map((h) => h.body);
  if (interpretation.length === 0) interpretation.push(reading.output.summary);

  const recs = reading.output.recommendations;
  const relationRec = recs.find((r) => /关系|沟通|说|聊|谈/.test(r.body)) ?? recs[0];
  const affairRec = recs.find((r) => /事|推进|落地|完成|做/.test(r.body)) ?? recs[1] ?? recs[0];

  return {
    interpretation,
    relations: relationRec
      ? relationRec.body
      : '今日适合主动沟通，但不要急着要求结果。先把意思说准确，把期待摆到明面上。',
    affairs: affairRec
      ? affairRec.body
      : '今日适合推进已有计划，不适合重新打开太多分支。先处理最接近落地的一件事。',
  };
}

export function deriveTodayReflection(reading: Reading | undefined): TodayReflection {
  const eyebrow = '今日最值得问自己的';
  if (!reading) {
    return {
      eyebrow,
      question: '今天要不要去生成今日时镜？',
      hint: '生成后，问时镜会基于今日推演陪你想下一步。',
    };
  }
  const dataGap = reading.uncertainty.data_gaps[0];
  const caveat = reading.uncertainty.caveats[0];
  const question = (() => {
    if (dataGap) return `${formatUncertaintyItem(dataGap)}——这件事会影响今天的判断吗？`;
    if (caveat) return `${formatUncertaintyItem(caveat)}——我打算如何应对？`;
    return '这件事是真的没准备好，还是我在等一个更稳的确认？';
  })();
  return {
    eyebrow,
    question,
    hint: '问时镜会基于今日推演陪你想下一步。',
  };
}

const STEM_LABELS: Record<string, string> = {
  jia: '甲', yi: '乙', bing: '丙', ding: '丁', wu: '戊',
  ji: '己', geng: '庚', xin: '辛', ren: '壬', gui: '癸',
};
const BRANCH_LABELS: Record<string, string> = {
  zi: '子', chou: '丑', yin: '寅', mao: '卯', chen: '辰', si: '巳',
  wu: '午', wei: '未', shen: '申', you: '酉', xu: '戌', hai: '亥',
};

function pillarLabel(pillar: { stem: string; branch: string } | undefined): string {
  if (!pillar) return '待补';
  const stem = STEM_LABELS[pillar.stem] ?? pillar.stem;
  const branch = BRANCH_LABELS[pillar.branch] ?? pillar.branch;
  return `${stem}${branch}`;
}

export function deriveEvidenceChips(reading: Reading | undefined): readonly TodayEvidenceChip[] {
  if (!reading) {
    return [
      { group: '数据完整度', value: '待生成' },
    ];
  }
  const summary = reading.inputs_summary;
  const feature = summary.feature_snapshot;
  const subject = feature.subjects[0];
  const chips: TodayEvidenceChip[] = [];
  if (subject?.natal_chart.day_pillar) {
    chips.push({ group: '日柱', value: pillarLabel(subject.natal_chart.day_pillar) });
  }
  if (subject?.natal_chart.month_pillar) {
    chips.push({ group: '月令', value: pillarLabel(subject.natal_chart.month_pillar) });
  }
  chips.push({ group: '阶段驱动', value: `${feature.stage_label}` });
  const totalPillars = 4;
  const missing = subject?.natal_chart.missing_pillars.length ?? 0;
  const filled = totalPillars - missing;
  chips.push({ group: '数据完整度', value: `约 ${filled}/${totalPillars}` });
  return chips;
}

function eventCategoryGuess(event: Event): string {
  const text = `${event.title} ${event.recap ?? ''} ${event.notes ?? ''}`;
  if (/(离|辞|转|换|跳|新职|调动)/.test(text)) return '阶段拐点';
  if (/(休|搬|节奏|睡|作息|放慢)/.test(text)) return '节奏调整';
  if (/(吵|矛盾|分手|和好|谈话|沟通|关系)/.test(text)) return '关系动向';
  if (/(决定|确认|拍板|定)/.test(text)) return '关键决策';
  return '近况记录';
}

function feelingGuess(event: Event): string {
  const text = `${event.recap ?? ''} ${event.notes ?? ''}`;
  if (text.length === 0) return '当时的感受 · 已记录';
  return `当时的感受 · ${condense(text, 14)}`;
}

export function deriveRecentEvents(events: readonly Event[], limit = 5): readonly TodayRecentEvent[] {
  return events
    .slice()
    .sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at))
    .slice(0, limit)
    .map((event): TodayRecentEvent => ({
      id: event.id,
      date_label: event.occurred_at.slice(0, 10),
      title: event.title,
      feeling: feelingGuess(event),
      category: eventCategoryGuess(event),
    }));
}

// Mapping from IANA identifier to a short user-readable Chinese label.
// "Etc/UTC" and friends are unhelpful to a non-technical reader; we want
// a friendly fallback that still hints at the timezone's locale. Anything
// not in this table falls back to "<City>（GMT±N）" — see helper below.
const FRIENDLY_TIME_ZONE_LABELS: Record<string, string> = {
  'Etc/UTC': '国际标准时间',
  'UTC': '国际标准时间',
  'GMT': '国际标准时间',
  'Asia/Shanghai': '北京时间',
  'Asia/Chongqing': '北京时间',
  'Asia/Urumqi': '乌鲁木齐时间',
  'Asia/Hong_Kong': '香港时间',
  'Asia/Macau': '澳门时间',
  'Asia/Taipei': '台北时间',
  'Asia/Tokyo': '东京时间',
  'Asia/Seoul': '首尔时间',
  'Asia/Singapore': '新加坡时间',
  'Asia/Bangkok': '曼谷时间',
  'Asia/Kolkata': '印度时间',
  'Asia/Dubai': '迪拜时间',
  'Europe/London': '伦敦时间',
  'Europe/Paris': '巴黎时间',
  'Europe/Berlin': '柏林时间',
  'Europe/Moscow': '莫斯科时间',
  'America/New_York': '纽约时间',
  'America/Los_Angeles': '洛杉矶时间',
  'America/Chicago': '芝加哥时间',
  'America/Toronto': '多伦多时间',
  'America/Vancouver': '温哥华时间',
  'America/Mexico_City': '墨西哥城时间',
  'America/Sao_Paulo': '圣保罗时间',
  'Australia/Sydney': '悉尼时间',
  'Australia/Melbourne': '墨尔本时间',
  'Pacific/Auckland': '奥克兰时间',
};

function gmtOffsetFor(iana: string, now: Date): string {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: iana,
      timeZoneName: 'shortOffset',
    });
    const parts = dtf.formatToParts(now);
    const offset = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
    return offset; // e.g. "GMT+8", "GMT-5"
  } catch {
    return '';
  }
}

export function friendlyTimeZoneLabel(iana: string, now: Date = new Date()): string {
  if (!iana) return '本地时间';
  if (FRIENDLY_TIME_ZONE_LABELS[iana]) return FRIENDLY_TIME_ZONE_LABELS[iana];
  // Fall back to the city portion of the IANA id, optionally with the
  // GMT offset, so a user still sees something recognizable rather than
  // the raw zone path.
  const parts = iana.split('/');
  const tail = parts[parts.length - 1] ?? iana;
  const city = tail.replace(/_/g, ' ');
  const offset = gmtOffsetFor(iana, now);
  if (offset) return `${city}（${offset}）`;
  return city || iana;
}

export function todayDateLabel(basisTimeZone: string, now: Date = new Date()): TodayDateLabel {
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

export interface SubjectOneLineInputs {
  readonly ref: SubjectRef;
  readonly space: ShiJingSpace;
  readonly birthYear?: string;
  readonly pillar?: string;
  readonly precisionHint?: string;
}

export function describeSubjectOneLine(input: SubjectOneLineInputs): string {
  const name = subjectDisplayName(input.ref, input.space);
  const segments = [name];
  if (input.birthYear) segments.push(input.birthYear);
  if (input.pillar) segments.push(input.pillar);
  if (input.precisionHint) segments.push(input.precisionHint);
  return segments.join(' · ');
}

export function subjectIsCurrent(target: SubjectRef, ref: SubjectRef): boolean {
  return subjectRefKey(target) === subjectRefKey(ref);
}

export type { SubjectRef };
