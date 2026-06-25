import { SolarDay } from 'tyme4ts';
import type { YueJingCell, YueJingMirrorOutput, TendencyClass } from '../../../domain/mirror-output.ts';
import type { Reading } from '../../../domain/reading.ts';
import type { ShiJingSpace } from '../../../domain/shijing-space.ts';
import { yuejingInputsSummaryStaleForActiveSubset } from '../../astrology/inputs-summary-expiry.ts';
import { yuejingReadingStartsOn } from '../../reading/reading-selectors.ts';
import { YUEJING_TENDENCY_SEVERITY } from '../yuejing-month-interpretation.ts';

export function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function todayLocalDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export const WEEKDAY_HEADERS = ['一', '二', '三', '四', '五', '六', '日'] as const;
export const WEEKDAY_SHORT = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const;

// Severity ordering used to derive a day's *dominant* tendency from N
// concern projections. Higher score = more notable → wins the day's
// color slot. The ordering matches SJG-DSY-01's "what should the user
// notice first" priority.
export const TODAY_BODY_BY_TENDENCY: Record<TendencyClass, string> = {
  supportive: '整体助力,今天适合主动推进。',
  steady: '节奏平稳,适合按部就班的推进。',
  watch: '需要观察,留意细节与节奏。',
  blocked: '运势阻滞,宜守不宜攻。',
  turning: '局面转折,留意拐点信号。',
};

// The YueJing generator (`yuejing-generator.ts`) emits a placeholder
// summary of the form `<tendency_class> (<driver_ref>)` — e.g.
// `watch (constraint@2026-05-29T00:00:00Z)` — until the Runtime AI
// wording layer rewrites it into prose. Surface that form as empty in
// the hero detail column: the tendency chip already communicates the
// tendency, and the raw form reads as debug output to end users.
// Once AI wording replaces the summary with real prose, this filter
// passes it through and the detail column populates automatically.
export function yuejingCellDetail(cell: { readonly summary: string } | undefined): string {
  if (!cell) return '';
  const PLACEHOLDER_RE = /^(supportive|steady|watch|blocked|turning)\s*\(/;
  if (PLACEHOLDER_RE.test(cell.summary.trim())) return '';
  return cell.summary;
}

// ISO YYYY-MM-DD → Monday-first weekday index (0..6).
// Parsing at UTC noon avoids any local-tz day shift.
export function weekdayIndexMondayFirst(dateStr: string): number {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const dow = d.getUTCDay(); // 0 = Sun … 6 = Sat
  return (dow + 6) % 7; // 0 = Mon … 6 = Sun
}

export function shortMonthDay(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${Number(m)}月${Number(d)}日`;
}

export function dayOfMonth(dateStr: string): number {
  return Number(dateStr.slice(-2));
}

export type YueJingLunisolarMarkerKind =
  | 'solar_term'
  | 'festival'
  | 'lunar_month'
  | 'lunar_day';

export interface YueJingLunisolarMarker {
  readonly kind: YueJingLunisolarMarkerKind;
  readonly label: string;
  readonly lunar_label: string;
}

export interface YueJingCalendarDetails {
  readonly lunar_label: string;
  readonly ganzhi_label: string;
  readonly solar_term_label: string | null;
  readonly festival_labels: readonly string[];
}

const FIXED_SOLAR_OBSERVANCES: Readonly<Record<string, string>> = {
  '07-11': '中国航海日',
};

function solarDayFromIsoDate(dateStr: string): SolarDay | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  try {
    return SolarDay.fromYmd(year, month, day);
  } catch {
    return null;
  }
}

function fixedSolarObservance(dateStr: string): string | null {
  return FIXED_SOLAR_OBSERVANCES[dateStr.slice(5, 10)] ?? null;
}

function uniqueLabels(labels: readonly (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const label of labels) {
    if (!label || seen.has(label)) continue;
    seen.add(label);
    result.push(label);
  }
  return result;
}

export function deriveYueJingLunisolarMarker(dateStr: string): YueJingLunisolarMarker | null {
  const solarDay = solarDayFromIsoDate(dateStr);
  if (!solarDay) return null;

  const lunarDay = solarDay.getLunarDay();
  const lunarLabel = lunarDay.getDay() === 1
    ? lunarDay.getLunarMonth().getName()
    : lunarDay.getName();
  const termDay = solarDay.getTermDay();
  if (termDay.getDayIndex() === 0) {
    return {
      kind: 'solar_term',
      label: termDay.getSolarTerm().getName(),
      lunar_label: lunarLabel,
    };
  }

  const festivalLabel =
    lunarDay.getFestival()?.getName()
    ?? solarDay.getFestival()?.getName()
    ?? solarDay.getLegalHoliday()?.getName()
    ?? fixedSolarObservance(dateStr);
  if (festivalLabel) {
    return {
      kind: 'festival',
      label: festivalLabel,
      lunar_label: lunarLabel,
    };
  }

  if (lunarDay.getDay() === 1) {
    return {
      kind: 'lunar_month',
      label: lunarLabel,
      lunar_label: lunarLabel,
    };
  }

  return {
    kind: 'lunar_day',
    label: lunarLabel,
    lunar_label: lunarLabel,
  };
}

export function deriveYueJingCalendarDetails(dateStr: string): YueJingCalendarDetails | null {
  const solarDay = solarDayFromIsoDate(dateStr);
  if (!solarDay) return null;

  const lunarDay = solarDay.getLunarDay();
  const termDay = solarDay.getTermDay();
  const solarTermLabel = termDay.getDayIndex() === 0
    ? termDay.getSolarTerm().getName()
    : null;
  const festivalLabels = uniqueLabels([
    lunarDay.getFestival()?.getName(),
    solarDay.getFestival()?.getName(),
    solarDay.getLegalHoliday()?.getName(),
    fixedSolarObservance(dateStr),
  ]);

  return {
    lunar_label: `农历${lunarDay.getLunarMonth().getName()}${lunarDay.getName()}`,
    ganzhi_label: `${lunarDay.getYearSixtyCycle().getName()}年 ${lunarDay.getMonthSixtyCycle().getName()}月 ${lunarDay.getSixtyCycle().getName()}日`,
    solar_term_label: solarTermLabel,
    festival_labels: festivalLabels,
  };
}

export function dominantTendency(entries: readonly YueJingCell[]): TendencyClass {
  let best: TendencyClass = 'steady';
  let bestScore = -1;
  for (const e of entries) {
    const s = YUEJING_TENDENCY_SEVERITY[e.tendency_class];
    if (s > bestScore) {
      best = e.tendency_class;
      bestScore = s;
    }
  }
  return best;
}

export function relativeTimeShort(iso: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime();
  if (diff < 60_000) return '刚刚';
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / (24 * 60));
  return `${day} 天前`;
}

export type DayKind = 'past' | 'today' | 'future';

export function classifyDay(date: string, today: string): DayKind {
  if (date < today) return 'past';
  if (date > today) return 'future';
  return 'today';
}

export function yuejingReadings(readings: readonly Reading[]): Reading[] {
  return readings.filter((reading) => reading.mirror_kind === 'yuejing');
}

export function latestYuejingReadingForDate(
  readings: readonly Reading[],
  date: string,
): Reading | undefined {
  return yuejingReadings(readings)
    .filter((reading) => yuejingReadingStartsOn(reading, date))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
}

// SJG-ALGO-08 — Layer-3 binds to the common surface STRUCTURE, never parses the
// opaque, method-namespaced driver_refs. A reading is aggregatable iff every
// cell has a matching per-concern tendency driver (keyed by date + concern_tag_ref)
// that carries at least one evidence ref; the ref payload stays opaque (a 八字
// `bazi:domain.*` and a 紫微 `ziwei:hua@*` are treated identically here).
// (Old-schema readings without this shape already fail validateReading and are
// dropped on load, so this is a structural integrity guard, not a format sniff.)
export function yuejingReadingHasPerConcernDrivers(reading: Reading): boolean {
  if (reading.output.mirror_kind !== 'yuejing') return false;
  const output = reading.output as YueJingMirrorOutput;
  for (const cell of output.cells) {
    const driver = reading.inputs_summary.feature_snapshot.common.yuejing_tendency_drivers.find(
      (candidate) =>
        candidate.date === cell.date &&
        candidate.concern_tag_ref === cell.concern_tag_ref,
    );
    if (!driver || driver.driver_refs.length === 0) return false;
  }
  return true;
}

export function aggregateYuejingCellsByDate(input: {
  readonly readings: readonly Reading[];
  readonly dates: readonly string[];
  readonly activeTagIdSet: ReadonlySet<string>;
  readonly activeTagIds: readonly string[];
  readonly space: ShiJingSpace;
  readonly now: Date;
}): Map<string, readonly YueJingCell[]> {
  const dateSet = new Set(input.dates);
  const latestByKey = new Map<string, { readonly createdAtMs: number; readonly cell: YueJingCell }>();
  for (const reading of yuejingReadings(input.readings)) {
    if (reading.output.mirror_kind !== 'yuejing') continue;
    if (!yuejingReadingHasPerConcernDrivers(reading)) continue;
    if (
      yuejingInputsSummaryStaleForActiveSubset({
        reading,
        space: input.space,
        now: input.now,
        active_concern_tag_refs: input.activeTagIds,
      })
    ) {
      continue;
    }
    const createdAtMs = Date.parse(reading.created_at);
    const output = reading.output as YueJingMirrorOutput;
    for (const cell of output.cells) {
      if (!dateSet.has(cell.date)) continue;
      if (!input.activeTagIdSet.has(cell.concern_tag_ref)) continue;
      const key = `${cell.date}::${cell.concern_tag_ref}`;
      const current = latestByKey.get(key);
      if (!current || createdAtMs >= current.createdAtMs) {
        latestByKey.set(key, { createdAtMs, cell });
      }
    }
  }
  const grouped = new Map<string, YueJingCell[]>();
  for (const date of input.dates) grouped.set(date, []);
  for (const { cell } of latestByKey.values()) {
    grouped.get(cell.date)?.push(cell);
  }
  return grouped;
}

export function nextMissingYuejingDate(input: {
  readonly dates: readonly string[];
  readonly cellsByDate: ReadonlyMap<string, readonly YueJingCell[]>;
  readonly activeTagIds: readonly string[];
}): string | null {
  if (input.activeTagIds.length === 0) return null;
  for (const date of input.dates) {
    const existing = new Set((input.cellsByDate.get(date) ?? []).map((cell) => cell.concern_tag_ref));
    if (input.activeTagIds.some((tagId) => !existing.has(tagId))) return date;
  }
  return null;
}
