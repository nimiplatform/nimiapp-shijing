// SJG-ASTRO-05 — YueJing rolling 30-day mirror screen.
//
// V2 layout (per SJG-DSY-01 mockup):
//   1. Header strip — title + window meta + 「导入到时镜」/「生成今日」
//      actions + 上次生成 X 前.
//   2. Today hero — a tinted overview card showing today's dominant
//      tendency and per-concern bars. Only rendered when today is
//      inside the reading's window.
//   3. Filter row — concern pills + tendency legend in a single
//      capsule.
//   4. Weekday-aligned 7-column grid — one card per local date, with
//      tinted background by dominant tendency, an explicit weekday
//      label, today badge / edit pencil, and a click-to-expand
//      drawer holding the per-concern projection list and an
//      EventMemory / PlanItem editor.
//   5. Compact concern pill bar — inline add / archive, with a link
//      to Settings for full management.
//
// Data plumbing (generateReadingForStorage, snapshot dispatch,
// per-cell projection cells, citation drawer, import bus) is
// unchanged — this is a presentation-layer refactor.

import { useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmDialog } from '@nimiplatform/kit/ui';
import type {
  YueJingCell,
  YueJingMirrorOutput,
  TendencyClass,
} from '../../domain/mirror-output.ts';
import {
  CONCERN_TAG_ACTIVE_LIMIT,
  type ConcernTag,
} from '../../domain/concern-tag.ts';
import type { EventMemory } from '../../domain/event-memory.ts';
import type { PlanItem } from '../../domain/plan-item.ts';
import type { Reading, ReadingGenerationFailure } from '../../domain/reading.ts';
import { generateReadingForStorage } from '../reading/generate-and-store.ts';
import { inputsSummaryExpired } from '../astrology/inputs-summary-expiry.ts';
import {
  newConcernTagId,
  newEventMemoryId,
  newPlanItemId,
  newReadingId,
} from '../ids/index.ts';
import {
  latestReadingByMirrorKind,
  yuejingReadingStartsOn,
} from '../reading/reading-selectors.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import { MIRROR_KIND_LABELS, TENDENCY_CLASS_LABELS } from '../i18n/copy.ts';
import { rolling30DayMirrorScopeFromDate } from './mirror-scope-helpers.ts';
import { classifyMirrorTabState } from './mirror-state.ts';
import {
  deriveConcernTagLabelForDisplay,
  parseConcernTagInput,
} from '../concern-tags/concern-tag-parser.ts';
import {
  CONCERN_PRESETS,
  type ConcernPreset,
  concernSubtitleFor,
  trimmedConcernLabel as yuejingTagLabel,
} from '../concern-tags/concern-presets.ts';
import { CitationDrawer } from './shared/citation-drawer.tsx';
import { ImportToShiJingButton } from './shared/import-to-shijing-button.tsx';
import { FailureBanner } from './shared/failure-banner.tsx';

// ===== Pure helpers (no React) =======================================

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function todayLocalDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const WEEKDAY_HEADERS = ['一', '二', '三', '四', '五', '六', '日'] as const;
const WEEKDAY_SHORT = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const;

// Severity ordering used to derive a day's *dominant* tendency from N
// concern projections. Higher score = more notable → wins the day's
// color slot. The ordering matches SJG-DSY-01's "what should the user
// notice first" priority.
const TENDENCY_SEVERITY: Record<TendencyClass, number> = {
  blocked: 4,
  turning: 3,
  watch: 2,
  supportive: 1,
  steady: 0,
};

const TODAY_BODY_BY_TENDENCY: Record<TendencyClass, string> = {
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
function yuejingCellDetail(cell: { readonly summary: string } | undefined): string {
  if (!cell) return '';
  const PLACEHOLDER_RE = /^(supportive|steady|watch|blocked|turning)\s*\(/;
  if (PLACEHOLDER_RE.test(cell.summary.trim())) return '';
  return cell.summary;
}

// ISO YYYY-MM-DD → Monday-first weekday index (0..6).
// Parsing at UTC noon avoids any local-tz day shift.
function weekdayIndexMondayFirst(dateStr: string): number {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const dow = d.getUTCDay(); // 0 = Sun … 6 = Sat
  return (dow + 6) % 7; // 0 = Mon … 6 = Sun
}

function shortMonthDay(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${Number(m)}月${Number(d)}日`;
}

function dayOfMonth(dateStr: string): number {
  return Number(dateStr.slice(-2));
}

function monthOf(dateStr: string): number {
  return Number(dateStr.slice(5, 7));
}

function dominantTendency(entries: readonly YueJingCell[]): TendencyClass {
  let best: TendencyClass = 'steady';
  let bestScore = -1;
  for (const e of entries) {
    const s = TENDENCY_SEVERITY[e.tendency_class];
    if (s > bestScore) {
      best = e.tendency_class;
      bestScore = s;
    }
  }
  return best;
}

function relativeTimeShort(iso: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime();
  if (diff < 60_000) return '刚刚';
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / (24 * 60));
  return `${day} 天前`;
}

type DayKind = 'past' | 'today' | 'future';

function classifyDay(date: string, today: string): DayKind {
  if (date < today) return 'past';
  if (date > today) return 'future';
  return 'today';
}

function yuejingReadings(readings: readonly Reading[]): Reading[] {
  return readings.filter((reading) => reading.mirror_kind === 'yuejing');
}

function latestYuejingReadingForDate(
  readings: readonly Reading[],
  date: string,
): Reading | undefined {
  return yuejingReadings(readings)
    .filter((reading) => yuejingReadingStartsOn(reading, date))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
}

function yuejingReadingHasDomainizedDrivers(reading: Reading): boolean {
  if (reading.output.mirror_kind !== 'yuejing') return false;
  const output = reading.output as YueJingMirrorOutput;
  for (const cell of output.cells) {
    const driver = reading.inputs_summary.feature_snapshot.yuejing_tendency_drivers.find(
      (candidate) =>
        candidate.date === cell.date &&
        candidate.concern_tag_ref === cell.concern_tag_ref,
    );
    if (!driver) return false;
    if (!driver.driver_refs.some((ref) => ref.startsWith('domain.'))) return false;
    if (!driver.driver_refs.some((ref) => ref.startsWith('daily_relation.'))) return false;
  }
  return true;
}

function aggregateYuejingCellsByDate(input: {
  readonly readings: readonly Reading[];
  readonly dates: readonly string[];
  readonly activeTagIdSet: ReadonlySet<string>;
}): Map<string, readonly YueJingCell[]> {
  const dateSet = new Set(input.dates);
  const latestByKey = new Map<string, { readonly createdAtMs: number; readonly cell: YueJingCell }>();
  for (const reading of yuejingReadings(input.readings)) {
    if (reading.output.mirror_kind !== 'yuejing') continue;
    if (!yuejingReadingHasDomainizedDrivers(reading)) continue;
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

function nextMissingYuejingDate(input: {
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

// ===== Top-level component ==========================================

export function YueJingTab() {
  const { state, replace_snapshot, runtime_ai_client } = useShijingStore();
  const [loading, setLoading] = useState(false);
  const [generatingDate, setGeneratingDate] = useState<string | null>(null);
  const [failure, setFailure] = useState<ReadingGenerationFailure | null>(null);
  const [filterTagId, setFilterTagId] = useState<string | null>(null);
  // Lifted so the day-detail panel can render at the YueJingTab level
  // (full-viewport right-side drawer) instead of being trapped inside
  // the calendar grid as an inline row-spanning element.
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const today = todayLocalDate();
  const activeTags = useMemo(
    () => state.snapshot.concern_tags.filter((t) => t.status === 'active'),
    [state.snapshot.concern_tags],
  );
  const activeTagIds = useMemo(() => activeTags.map((t) => t.id), [activeTags]);
  const activeTagIdSet = useMemo(() => new Set(activeTagIds), [activeTagIds]);

  const placeholderDates = useMemo(() => {
    const dates: string[] = [];
    const start = new Date(`${today}T00:00:00Z`).getTime();
    for (let i = 0; i < 30; i++) {
      dates.push(new Date(start + i * 86_400_000).toISOString().slice(0, 10));
    }
    return dates;
  }, [today]);

  const reading = latestYuejingReadingForDate(state.snapshot.readings, today);
  const latestReading = latestReadingByMirrorKind({
    readings: state.snapshot.readings,
    mirror_kind: 'yuejing',
  });
  const stale = reading ? inputsSummaryExpired(reading, new Date()) : false;
  const tabState = useMemo(
    () =>
      classifyMirrorTabState({
        ...(reading ? { reading } : {}),
        ...(failure ? { failure } : {}),
        loading,
        stale,
      }),
    [reading, failure, loading, stale],
  );

  const cellsByDate = useMemo(
    () =>
      aggregateYuejingCellsByDate({
        readings: state.snapshot.readings,
        dates: placeholderDates,
        activeTagIdSet,
      }),
    [state.snapshot.readings, placeholderDates, activeTagIdSet],
  );
  const nextGenerationDate = useMemo(
    () => nextMissingYuejingDate({ dates: placeholderDates, cellsByDate, activeTagIds }),
    [placeholderDates, cellsByDate, activeTagIds],
  );

  async function handleGenerate(targetDate: string = nextGenerationDate ?? today) {
    if (loading) return;
    const targetTagIds = [...activeTagIds];
    const targetTagIdSet = new Set(targetTagIds);
    let currentSpace = state.snapshot;
    let currentDate: string | null = targetDate;
    let guard = 0;

    setLoading(true);
    setGeneratingDate(targetDate);
    setFailure(null);

    try {
      while (currentDate && guard < placeholderDates.length) {
        guard += 1;
        setGeneratingDate(currentDate);
        const outcome = await generateReadingForStorage({
          id: newReadingId(),
          created_at: nowIso(),
          mirror_kind: 'yuejing',
          mirror_scope: rolling30DayMirrorScopeFromDate(currentDate),
          related_person_refs: [],
          concern_tag_refs: targetTagIds,
          space: currentSpace,
          deps: { runtime_ai_client },
        });
        if (!outcome.ok) {
          setFailure(outcome.failure);
          return;
        }

        const persistence = await replace_snapshot(outcome.next_space);
        if (persistence.kind !== 'saved' && persistence.kind !== 'idle') return;

        currentSpace = outcome.next_space;
        const nextCellsByDate = aggregateYuejingCellsByDate({
          readings: currentSpace.readings,
          dates: placeholderDates,
          activeTagIdSet: targetTagIdSet,
        });
        currentDate = nextMissingYuejingDate({
          dates: placeholderDates,
          cellsByDate: nextCellsByDate,
          activeTagIds: targetTagIds,
        });
      }
    } finally {
      setGeneratingDate(null);
      setLoading(false);
    }
  }

  // ----- Auto-generation -------------------------------------------
  // Once the user has filled self natal inputs and has
  // at least one active concern, the YueJing data should simply *be
  // there* — the user shouldn't have to press generation manually, nor
  // re-press it for each day. This effect generates missing YueJing days
  // in order when:
  //   - self natal inputs are present,
  //   - there's ≥1 active concern,
  //   - there's no current fresh reading (none yet, or the existing one
  //     has gone stale),
  //   - and we're not already generating.
  // A signature ref keys the attempt on (profile + active tags) so it
  // fires exactly once per meaningful input combination — editing the
  // self data or changing concerns re-triggers it, but a failure won't
  // loop (the user can still retry via the button). Manual 生成 stays
  // available and bypasses this guard.
  const selfNatalReady =
    state.snapshot.self_subject.natal_inputs.birth_datetime_utc.trim().length > 0;
  const autoGenSignature = `${today}|${state.snapshot.self_subject.natal_inputs.birth_datetime_utc}|${activeTagIds.join(',')}`;
  const autoGenAttemptRef = useRef<string | null>(null);
  useEffect(() => {
    if (loading) return;
    if (!selfNatalReady) return;
    if (activeTagIds.length === 0) return;
    if (nextGenerationDate === null && reading && !stale) return;
    if (autoGenAttemptRef.current === autoGenSignature) return;
    autoGenAttemptRef.current = autoGenSignature;
    void handleGenerate(nextGenerationDate ?? today);
  }, [loading, selfNatalReady, activeTagIds, reading, stale, autoGenSignature, nextGenerationDate]);

  const output = latestReading?.output.mirror_kind === 'yuejing'
    ? (latestReading.output as YueJingMirrorOutput)
    : null;
  const generatedCellCount = useMemo(
    () => Array.from(cellsByDate.values()).reduce((sum, cells) => sum + cells.length, 0),
    [cellsByDate],
  );
  const isReady = generatedCellCount > 0;


  const cellsForToday = cellsByDate.get(today) ?? [];

  const visibleByDate = useMemo(() => {
    if (!filterTagId) return cellsByDate;
    const filtered = new Map<string, readonly YueJingCell[]>();
    for (const [date, entries] of cellsByDate) {
      const kept = entries.filter((e) => e.concern_tag_ref === filterTagId);
      if (kept.length > 0) filtered.set(date, kept);
    }
    return filtered;
  }, [cellsByDate, filterTagId]);

  // Tag-drift detection — when the user's active-tag set no longer
  // matches the one the current reading was generated against, we
  // show a hint suggesting a regenerate. Adds (active tag with no
  // cells) and removes (filtered out above) both trip this.
  const tagDriftKind = useMemo<'none' | 'added' | 'removed' | 'both'>(() => {
    if (!reading) return 'none';
    const readingSet = new Set(reading.concern_tag_refs);
    const added = activeTagIds.some((id) => !readingSet.has(id));
    const removed = reading.concern_tag_refs.some((id) => !activeTagIdSet.has(id));
    if (added && removed) return 'both';
    if (added) return 'added';
    if (removed) return 'removed';
    return 'none';
  }, [reading, activeTagIds, activeTagIdSet]);

  return (
    <section
      className="shijing-tab shijing-yuejing"
      data-mirror-kind="yuejing"
      aria-label={MIRROR_KIND_LABELS.yuejing}
    >
      <YueJingHeaderStrip
        generating={loading}
        canGenerate={activeTagIds.length > 0 && nextGenerationDate !== null}
        generateLabel={nextGenerationDate === null ? '已完成' : nextGenerationDate === today ? '生成 30 日' : '继续生成'}
        readingId={latestReading?.id ?? null}
        readingCreatedAt={latestReading?.created_at ?? null}
        onGenerate={() => {
          void handleGenerate(nextGenerationDate ?? today);
        }}
      />

      {/* Inline status row above the calendar — a thin hint banner
       * rather than a full empty-state takeover so the calendar grid
       * stays visible underneath. */}
      {!selfNatalReady ? (
        <p role="status" className="shijing-yuejing__notice">
          请先在「设置 → 本人」中填写出生信息,月镜会据此自动推算。
        </p>
      ) : activeTagIds.length === 0 ? (
        <p role="status" className="shijing-yuejing__notice">
          请先在下方「关注标签」中添加并激活至少一个关注,月镜会自动着色。
        </p>
      ) : null}
      {tabState.kind === 'loading' ? (
        <p role="status" className="shijing-yuejing__notice">
          正在推算 {generatingDate ? shortMonthDay(generatingDate) : '月镜'}…
        </p>
      ) : null}
      {tabState.kind === 'empty' && selfNatalReady && activeTagIds.length > 0 && !loading ? (
        <p role="status" className="shijing-yuejing__notice">
          正在准备月镜倾向…若长时间未出现,可点击右上「生成 30 日」重试。
        </p>
      ) : null}
      {tabState.kind === 'failure' ? <FailureBanner failure={tabState.failure} /> : null}
      {isReady && tabState.kind === 'ready' && tabState.stale ? (
        <p role="alert" className="shijing-yuejing__stale">
          当前月镜解读已超过 7 天,建议重新生成。
        </p>
      ) : null}
      {isReady && tagDriftKind !== 'none' ? (
        <p role="status" className="shijing-yuejing__notice">
          {tagDriftKind === 'added'
            ? '关注集已新增,新关注尚未推算。点击右上「生成今日」用当前关注集重新生成。'
            : tagDriftKind === 'removed'
              ? '已移除部分关注,日历已隐藏对应数据。若想用当前关注集重算,点击右上「生成今日」。'
              : '关注集已变动,日历已按当前激活关注过滤。点击右上「生成今日」用新关注集重新推算。'}
        </p>
      ) : null}

      {/* Hero — only when a reading is ready AND today has projections. */}
      {isReady && cellsForToday.length > 0 ? (
        <YueJingTodayHero
          date={today}
          cellsForToday={cellsForToday}
          activeTags={activeTags}
        />
      ) : null}

      {/* Filter row — only meaningful once tendency data exists. */}
      {isReady ? (
        <YueJingFilterRow
          activeTags={activeTags}
          filterTagId={filterTagId}
          onFilterChange={setFilterTagId}
        />
      ) : null}

      {/* Calendar — always rendered, with either real per-concern
       * cells or empty placeholder cells. */}
      <YueJingCalendar
        cellsByDate={visibleByDate}
        today={today}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      {/* Details — only when a reading exists (has summary + cite). */}
      {isReady && latestReading && output ? (
        <details className="shijing-yuejing__details">
          <summary>30 日解读摘要与生成依据</summary>
          <p className="shijing-yuejing__summary">{output.summary}</p>
          <CitationDrawer reading={latestReading} />
        </details>
      ) : null}

      {/* Right-side day-detail panel — rendered fixed-position at the
       * viewport level (CSS `position: fixed`), backdrop blurs the
       * rest of the page. Holds 当日倾向 cards + the day's
       * EventMemory / PlanItem entry + a list of already-saved
       * records. */}
      {selectedDate ? (
        <YueJingDayPanel
          date={selectedDate}
          today={today}
          entries={cellsByDate.get(selectedDate) ?? []}
          activeTags={activeTags}
          onClose={() => setSelectedDate(null)}
        />
      ) : null}
    </section>
  );
}

// ===== 1) Header strip ==============================================

interface YueJingHeaderStripProps {
  readonly generating: boolean;
  readonly canGenerate: boolean;
  readonly generateLabel: string;
  readonly readingId: string | null;
  readonly readingCreatedAt: string | null;
  readonly onGenerate: () => void;
}

function YueJingHeaderStrip(props: YueJingHeaderStripProps) {
  const ago = props.readingCreatedAt ? relativeTimeShort(props.readingCreatedAt) : null;
  return (
    <header className="shijing-yuejing__strip">
      <div className="shijing-yuejing__strip-titles">
        <h1>{MIRROR_KIND_LABELS.yuejing}</h1>
      </div>
      <div className="shijing-yuejing__strip-actions">
        <div className="shijing-yuejing__strip-buttons">
          {props.readingId ? <ImportToShiJingButton readingId={props.readingId} /> : null}
          <button
            type="button"
            className="shijing-yuejing__generate"
            disabled={props.generating || !props.canGenerate}
            onClick={props.onGenerate}
          >
            {props.generating ? '生成中…' : props.generateLabel}
          </button>
        </div>
        {ago ? <small className="shijing-yuejing__ago">上次生成 {ago}</small> : null}
      </div>
    </header>
  );
}

// ===== 2) Today hero ================================================

function YueJingTodayHero(props: {
  readonly date: string;
  readonly cellsForToday: readonly YueJingCell[];
  readonly activeTags: readonly ConcernTag[];
}) {
  const dominant = dominantTendency(props.cellsForToday);
  const tendencyLabel = TENDENCY_CLASS_LABELS[dominant];
  const body = TODAY_BODY_BY_TENDENCY[dominant];
  const weekday = WEEKDAY_SHORT[weekdayIndexMondayFirst(props.date)];

  return (
    <article
      className="shijing-yuejing__hero"
      data-tendency={dominant}
      aria-label="今日总览"
    >
      <div className="shijing-yuejing__hero-headline">
        <span className="shijing-yuejing__hero-eyebrow">今日 · 总览</span>
        <div className="shijing-yuejing__hero-tendency">
          <strong>{tendencyLabel}</strong>
          <small>{shortMonthDay(props.date)} · {weekday}</small>
        </div>
        <p className="shijing-yuejing__hero-body">{body}</p>
      </div>
      <ul className="shijing-yuejing__hero-rows" aria-label="今日各关注倾向">
        {props.activeTags.map((tag) => {
          const cell = props.cellsForToday.find((c) => c.concern_tag_ref === tag.id);
          // No cell = this tag was activated AFTER the current reading
          // was generated, so the algorithm has no projection for it
          // yet. Render a muted "待生成" placeholder chip instead of
          // falling back to a misleading 'steady' tint; the row reads
          // as "data pending" until the next 生成今日.
          if (!cell) {
            return (
              <li key={tag.id} data-pending="true">
                <span className="shijing-yuejing__hero-row-label">
                  {yuejingTagLabel(tag)}
                </span>
                <span
                  className="shijing-yuejing__hero-row-chip"
                  data-tendency="pending"
                >
                  <span className="shijing-yuejing__hero-row-chip-dot" aria-hidden />
                  待生成
                </span>
              </li>
            );
          }
          const tendency: TendencyClass = cell.tendency_class;
          const detail = yuejingCellDetail(cell);
          return (
            <li key={tag.id}>
              <span className="shijing-yuejing__hero-row-label">
                {yuejingTagLabel(tag)}
              </span>
              <span
                className="shijing-yuejing__hero-row-chip"
                data-tendency={tendency}
              >
                <span className="shijing-yuejing__hero-row-chip-dot" aria-hidden />
                {TENDENCY_CLASS_LABELS[tendency]}
              </span>
              {detail ? (
                <span className="shijing-yuejing__hero-row-detail">{detail}</span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </article>
  );
}

// ===== 4) Filter row ================================================

function YueJingFilterRow(props: {
  readonly activeTags: readonly ConcernTag[];
  readonly filterTagId: string | null;
  readonly onFilterChange: (id: string | null) => void;
}) {
  const [editorOpen, setEditorOpen] = useState(false);
  return (
    <div className="shijing-yuejing__filter-row" role="toolbar" aria-label="按关注筛选 / 倾向图例">
      <div className="shijing-yuejing__filter" role="group" aria-label="关注">
        <span className="shijing-yuejing__filter-label" aria-hidden="true">关注</span>
        <FilterPill
          label="全部"
          selected={props.filterTagId === null}
          onSelect={() => props.onFilterChange(null)}
        />
        {props.activeTags.map((tag) => (
          <FilterPill
            key={tag.id}
            label={yuejingTagLabel(tag)}
            selected={props.filterTagId === tag.id}
            onSelect={() => props.onFilterChange(tag.id)}
          />
        ))}
        <span className="shijing-yuejing__editor-anchor">
          <button
            type="button"
            className="shijing-yuejing__filter-manage"
            aria-expanded={editorOpen}
            aria-haspopup="dialog"
            onClick={() => setEditorOpen((o) => !o)}
          >
            ✎ 编辑关注
          </button>
          {editorOpen ? (
            <YueJingConcernEditorPopover onClose={() => setEditorOpen(false)} />
          ) : null}
        </span>
      </div>
      <ul className="shijing-yuejing__legend" aria-label="倾向图例">
        {(Object.entries(TENDENCY_CLASS_LABELS) as ReadonlyArray<[TendencyClass, string]>).map(
          ([cls, label]) => (
            <li key={cls} data-tendency={cls}>
              <span className="shijing-yuejing__legend-dot" aria-hidden />
              {label}
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function FilterPill(props: {
  readonly label: string;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className="shijing-yuejing__filter-pill"
      aria-pressed={props.selected}
      onClick={props.onSelect}
    >
      {props.label}
    </button>
  );
}

// ===== 4b) Concern editor popover ===================================
// Inline manager rendered when「✎ 编辑关注」is clicked. Mirrors the
// NianJing「编辑关注」popover so concerns can be managed from either
// time-window mirror surface. Lets the user quickly archive an active
// concern, re-activate an archived one, add a preset, or type a free
// form concern. Heavier flows (resolving @person mentions, prompt-text
// editing) still live in Settings → 关注.

function YueJingConcernEditorPopover(props: { readonly onClose: () => void }) {
  const { state, dispatch } = useShijingStore();
  const [draftInput, setDraftInput] = useState('');
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const tags = state.snapshot.concern_tags;
  const active = useMemo(() => tags.filter((t) => t.status === 'active'), [tags]);
  const activeCount = active.length;
  const atLimit = activeCount >= CONCERN_TAG_ACTIVE_LIMIT;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') props.onClose();
    }
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!popoverRef.current || !target) return;
      if (popoverRef.current.contains(target)) return;
      // Don't close on a click of our own trigger; the trigger's click
      // handler will toggle the open state itself.
      const triggerBtn = (target as HTMLElement).closest?.(
        'button[aria-expanded][aria-haspopup="dialog"]',
      );
      if (triggerBtn) return;
      props.onClose();
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [props]);

  function commitTags(next: readonly ConcernTag[]) {
    dispatch({
      type: 'snapshot/replace',
      snapshot: { ...state.snapshot, concern_tags: next },
    });
  }

  function archiveTag(id: string) {
    commitTags(
      tags.map((t) =>
        t.id === id ? { ...t, status: 'archived', updated_at: nowIso() } : t,
      ),
    );
  }

  function activateExisting(id: string) {
    if (atLimit) return;
    commitTags(
      tags.map((t) =>
        t.id === id ? { ...t, status: 'active', updated_at: nowIso() } : t,
      ),
    );
  }

  function addPreset(preset: ConcernPreset) {
    if (atLimit) return;
    const existing = tags.find((t) => t.label === preset.label);
    if (existing) {
      if (existing.status === 'active') return;
      activateExisting(existing.id);
      return;
    }
    const ts = nowIso();
    const tag: ConcernTag = {
      id: newConcernTagId(),
      label: preset.label,
      status: 'active',
      sort_order: tags.length,
      parsed_topics: [...preset.topics],
      mention_refs: [],
      prompt_text: preset.subtitle,
      created_at: ts,
      updated_at: ts,
    };
    commitTags([...tags, tag]);
  }

  function addCustom() {
    if (atLimit) return;
    const trimmed = draftInput.trim();
    if (trimmed.length === 0) return;
    const parsed = parseConcernTagInput(draftInput, {
      persons: state.snapshot.persons,
    });
    const ts = nowIso();
    const tag: ConcernTag = {
      id: newConcernTagId(),
      label: deriveConcernTagLabelForDisplay(parsed) || trimmed,
      status: 'active',
      sort_order: tags.length,
      parsed_topics: [...parsed.parsed_topics],
      mention_refs: [...parsed.mention_refs],
      prompt_text: parsed.prompt_text,
      created_at: ts,
      updated_at: ts,
    };
    commitTags([...tags, tag]);
    setDraftInput('');
  }

  type Suggestion =
    | { readonly kind: 'archived'; readonly id: string; readonly label: string; readonly subtitle: string }
    | { readonly kind: 'preset'; readonly preset: ConcernPreset };

  const suggestions: readonly Suggestion[] = useMemo(() => {
    const archived: Suggestion[] = tags
      .filter((t) => t.status === 'archived')
      .map((t) => ({
        kind: 'archived',
        id: t.id,
        label: t.label,
        subtitle: concernSubtitleFor(t),
      }));
    const presetSuggestions: Suggestion[] = CONCERN_PRESETS
      .filter((p) => !tags.some((t) => t.label === p.label))
      .map((p) => ({ kind: 'preset', preset: p }));
    return [...archived, ...presetSuggestions];
  }, [tags]);

  return (
    <div
      ref={popoverRef}
      className="shijing-yuejing__editor"
      role="dialog"
      aria-label="管理关注"
    >
      <header className="shijing-yuejing__editor-head">
        <strong>管理关注</strong>
        <span className="shijing-yuejing__editor-count">
          {activeCount}/{CONCERN_TAG_ACTIVE_LIMIT}
        </span>
      </header>
      <p className="shijing-yuejing__editor-subtitle">
        激活的关注会按日纳入 30 日推算,并独立着色每天的倾向。
      </p>

      {active.length > 0 ? (
        <section className="shijing-yuejing__editor-section">
          <h4>已激活</h4>
          <ul>
            {active.map((tag) => (
              <li key={tag.id}>
                <div className="shijing-yuejing__editor-row-text">
                  <strong>{yuejingTagLabel(tag)}</strong>
                  <small>{concernSubtitleFor(tag)}</small>
                </div>
                <button
                  type="button"
                  className="shijing-yuejing__editor-remove"
                  onClick={() => archiveTag(tag.id)}
                >
                  移除
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {suggestions.length > 0 ? (
        <section className="shijing-yuejing__editor-section">
          <h4>可添加</h4>
          <ul>
            {suggestions.map((s) => {
              const label = s.kind === 'archived' ? s.label : s.preset.label;
              const subtitle = s.kind === 'archived' ? s.subtitle : s.preset.subtitle;
              const key = s.kind === 'archived' ? `arc-${s.id}` : `pre-${s.preset.label}`;
              return (
                <li key={key}>
                  <div className="shijing-yuejing__editor-row-text">
                    <strong>{label.replace(/^#/, '')}</strong>
                    <small>{subtitle}</small>
                  </div>
                  <button
                    type="button"
                    className="shijing-yuejing__editor-add"
                    disabled={atLimit}
                    title={atLimit ? `已达激活上限 ${CONCERN_TAG_ACTIVE_LIMIT}` : '加入关注'}
                    onClick={() => {
                      if (s.kind === 'archived') {
                        activateExisting(s.id);
                      } else {
                        addPreset(s.preset);
                      }
                    }}
                  >
                    添加
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="shijing-yuejing__editor-custom">
        <input
          type="text"
          value={draftInput}
          onChange={(e) => setDraftInput(e.currentTarget.value)}
          placeholder='自定义关注,如「学业」「创业」'
          disabled={atLimit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !atLimit && draftInput.trim().length > 0) {
              e.preventDefault();
              addCustom();
            }
          }}
        />
        <button
          type="button"
          className="shijing-yuejing__editor-add"
          disabled={atLimit || draftInput.trim().length === 0}
          onClick={addCustom}
        >
          添加
        </button>
      </div>
    </div>
  );
}

// ===== 5) Calendar grid + day card =================================

interface YueJingCalendarProps {
  readonly cellsByDate: Map<string, readonly YueJingCell[]>;
  readonly today: string;
  readonly selectedDate: string | null;
  readonly onSelectDate: (date: string | null) => void;
}

function YueJingCalendar(props: YueJingCalendarProps) {
  const dates = useMemo(
    () => Array.from(props.cellsByDate.keys()).sort(),
    [props.cellsByDate],
  );
  if (dates.length === 0) {
    return (
      <p className="shijing-yuejing__notice" role="status">
        当前关注下,本 30 日窗口没有可显示的日历单元。
      </p>
    );
  }
  const firstWeekday = weekdayIndexMondayFirst(dates[0] as string);
  const lastWeekday = weekdayIndexMondayFirst(dates[dates.length - 1] as string);
  const leadingBlanks = firstWeekday;
  const trailingBlanks = 6 - lastWeekday;

  return (
    <section className="shijing-yuejing__calendar" aria-label="30 日日历">
      <ol className="shijing-yuejing__weekday-row" aria-hidden>
        {WEEKDAY_HEADERS.map((label) => (
          <li key={label}>{label}</li>
        ))}
      </ol>
      <div className="shijing-yuejing__grid" role="grid" aria-label="30 日日历网格">
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <div key={`lead-${i}`} className="shijing-yuejing__blank" role="presentation" />
        ))}
        {dates.map((date) => {
          const entries = props.cellsByDate.get(date) ?? [];
          const selected = props.selectedDate === date;
          return (
            <YueJingDayCard
              key={date}
              date={date}
              entries={entries}
              today={props.today}
              selected={selected}
              onToggle={() => props.onSelectDate(selected ? null : date)}
            />
          );
        })}
        {Array.from({ length: trailingBlanks }, (_, i) => (
          <div key={`tail-${i}`} className="shijing-yuejing__blank" role="presentation" />
        ))}
      </div>
    </section>
  );
}

interface YueJingDayCardProps {
  readonly date: string;
  readonly entries: readonly YueJingCell[];
  readonly today: string;
  readonly selected: boolean;
  readonly onToggle: () => void;
}

function YueJingDayCard(props: YueJingDayCardProps) {
  const { state } = useShijingStore();
  const kind = classifyDay(props.date, props.today);
  const isEmpty = props.entries.length === 0;
  const dominant = isEmpty ? null : dominantTendency(props.entries);
  const weekday = WEEKDAY_SHORT[weekdayIndexMondayFirst(props.date)];
  const dayNum = dayOfMonth(props.date);

  const hasEntries = useMemo(() => {
    const datePrefix = props.date;
    const m = state.snapshot.event_memories.some(
      (x) => x.occurred_at.slice(0, 10) === datePrefix,
    );
    if (m) return true;
    return state.snapshot.plan_items.some(
      (x) => x.planned_for.slice(0, 10) === datePrefix,
    );
  }, [state.snapshot.event_memories, state.snapshot.plan_items, props.date]);

  return (
    <article
      className="shijing-yuejing__day"
      role="gridcell"
      data-day-kind={kind}
      data-tendency={dominant ?? 'empty'}
      data-selected={props.selected}
      data-date={props.date}
    >
      <button
        type="button"
        className="shijing-yuejing__day-face"
        onClick={props.onToggle}
        aria-expanded={props.selected}
        aria-label={dominant ? `${props.date} · ${TENDENCY_CLASS_LABELS[dominant]}` : props.date}
      >
        <span className="shijing-yuejing__day-weekday">{weekday}</span>
        {kind === 'today' ? (
          <span className="shijing-yuejing__day-today-badge">今日</span>
        ) : hasEntries ? (
          <span className="shijing-yuejing__day-edit-mark" aria-label="已有记录">✎</span>
        ) : null}
        <span className="shijing-yuejing__day-number">
          {dayNum}
          {dayNum === 1 ? (
            <span className="shijing-yuejing__day-month-marker">{monthOf(props.date)}月起</span>
          ) : null}
        </span>
        {dominant ? (
          <span className="shijing-yuejing__day-tendency">{TENDENCY_CLASS_LABELS[dominant]}</span>
        ) : null}
      </button>
    </article>
  );
}

// ===== 5b) Right-side day-detail panel ==============================
// Renders fixed-position at the viewport level when a calendar cell is
// selected. Holds three sections per the SJG-DSY-01 panel mockup:
//   1. 当日倾向 — per-concern tendency rows: a round concern-themed
//      icon (heart for 姻缘, briefcase for 事业, …) on the left,
//      label + body in the middle, tinted tendency chip on the right.
//   2. 记一笔事件 / 记一笔今日观察 / 记一笔计划项 — textarea +
//      outlined "关联" / concern chips + dark-green save button.
//   3. 已记录 (N) — list of stored EventMemory (past/today) or
//      PlanItem (future) bodies, or a centered clipboard-icon empty
//      state.
//
// Closes on Esc, backdrop click, or the × button. The backdrop blurs
// the rest of the page so the panel reads as a focused workspace.

// Friendly fallback prose for each tendency, used when the cell's
// `summary` is the algorithm's placeholder form (e.g. `watch (...)`).
// Once the Runtime AI wording layer rewrites summaries, that prose
// passes through `yuejingCellDetail` and these fallbacks are not used.
const PANEL_TENDENCY_FALLBACK: Record<TendencyClass, string> = {
  supportive: '能量助力 · 适合主动推进与新的尝试。',
  steady: '周期基线 · 节奏稳定,无需为情绪 / 方向额外调整。',
  watch: '需要观察 · 留意细节与节奏调整。',
  blocked: '运势阻滞 · 宜守不宜攻,等待结构松动。',
  turning: '处于转折 · 留意拐点信号与窗口期。',
};

// Concern → themed pastel palette for the round icon background and
// stroke color in the tendency rows. Falls back to a neutral gray for
// custom labels that don't match a preset.
interface ConcernIconStyle {
  readonly bg: string;
  readonly fg: string;
  readonly kind: 'heart' | 'briefcase' | 'body' | 'wealth' | 'study' | 'home' | 'dot';
}

const CONCERN_ICON_STYLE: Record<string, ConcernIconStyle> = {
  '姻缘': { bg: '#F8D5D5', fg: '#C76060', kind: 'heart' },
  '事业': { bg: '#CFE5D5', fg: '#3F7A5C', kind: 'briefcase' },
  '身体': { bg: '#E0D2EC', fg: '#7E5DA8', kind: 'body' },
  '财运': { bg: '#F0E0AD', fg: '#9A7E2A', kind: 'wealth' },
  '学业': { bg: '#D0DEED', fg: '#4F6E94', kind: 'study' },
  '家人': { bg: '#F0D8B8', fg: '#9A6E3A', kind: 'home' },
};

function concernIconStyle(label: string): ConcernIconStyle {
  const clean = label.replace(/^#/, '');
  return (
    CONCERN_ICON_STYLE[clean] ?? { bg: '#E4E4E4', fg: '#8B8B8B', kind: 'dot' }
  );
}

function ConcernIcon({ style }: { readonly style: ConcernIconStyle }) {
  return (
    <span
      className="shijing-yuejing__panel-tend-icon"
      style={{ background: style.bg, color: style.fg }}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {style.kind === 'heart' ? (
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        ) : null}
        {style.kind === 'briefcase' ? (
          <>
            <rect x="2.5" y="7" width="19" height="13" rx="2" />
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            <path d="M2.5 12.5h19" />
          </>
        ) : null}
        {style.kind === 'body' ? (
          <>
            <circle cx="12" cy="5" r="2" />
            <path d="M12 8v5m-4 8 4-8 4 8" />
          </>
        ) : null}
        {style.kind === 'wealth' ? (
          <>
            <path d="M7 7l5 7 5-7" />
            <path d="M7 12h10" />
            <path d="M7 16h10" />
            <path d="M12 14v6" />
          </>
        ) : null}
        {style.kind === 'study' ? (
          <>
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </>
        ) : null}
        {style.kind === 'home' ? (
          <>
            <path d="M3 11l9-7 9 7" />
            <path d="M5 9.5V20h14V9.5" />
          </>
        ) : null}
        {style.kind === 'dot' ? <circle cx="12" cy="12" r="4" /> : null}
      </svg>
    </span>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M6 6l12 12M18 6l-12 12" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4.5a2.121 2.121 0 0 1 3 3L7.5 17.5 3.5 19l1.5-4z" />
      <path d="M13 6l3 3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function AskIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 9 9 0 0 1-3.8-.8L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="3" width="8" height="4" rx="1" />
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}

function YueJingDayPanel(props: {
  readonly date: string;
  readonly today: string;
  readonly entries: readonly YueJingCell[];
  readonly activeTags: readonly ConcernTag[];
  readonly onClose: () => void;
}) {
  const { state, dispatch } = useShijingStore();
  const [draft, setDraft] = useState('');
  // In-place editing state for the 已记录 list. `editingId` is the id
  // of the EventMemory / PlanItem currently being edited; `editDraft`
  // holds the textarea value. Both reset when the user navigates to a
  // different date.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState<{
    readonly id: string;
    readonly body: string;
  } | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const kind = classifyDay(props.date, props.today);
  const isPlan = kind === 'future';
  const weekday = WEEKDAY_SHORT[weekdayIndexMondayFirst(props.date)];

  // Reset the draft + edit state whenever the user navigates to a
  // different date so leftover edits from the previous day don't
  // bleed into the new one.
  useEffect(() => {
    setDraft('');
    setEditingId(null);
    setEditDraft('');
  }, [props.date]);

  // Esc closes the panel.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') props.onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [props]);

  // Lookup map id → tag so per-concern rows can show the user's label
  // (e.g. `感情`) instead of the raw `concern_tag_ref` id.
  const tagById = useMemo(() => {
    const m = new Map<string, ConcernTag>();
    for (const t of props.activeTags) m.set(t.id, t);
    return m;
  }, [props.activeTags]);

  const memoriesForDate = useMemo(
    () => state.snapshot.event_memories.filter(
      (m) => m.occurred_at.slice(0, 10) === props.date,
    ),
    [state.snapshot.event_memories, props.date],
  );
  const plansForDate = useMemo(
    () => state.snapshot.plan_items.filter(
      (p) => p.planned_for.slice(0, 10) === props.date,
    ),
    [state.snapshot.plan_items, props.date],
  );

  function saveEntry() {
    const body = draft.trim();
    if (body.length === 0) return;
    const ts = nowIso();
    const concernRefs = props.entries.map((c) => c.concern_tag_ref);
    if (isPlan) {
      const plan: PlanItem = {
        id: newPlanItemId(),
        planned_for: `${props.date}T00:00:00Z`,
        body,
        person_refs: [],
        concern_tag_refs: concernRefs,
        source: 'yuejing',
        created_at: ts,
        updated_at: ts,
      };
      dispatch({
        type: 'snapshot/replace',
        snapshot: {
          ...state.snapshot,
          plan_items: [...state.snapshot.plan_items, plan],
        },
      });
    } else {
      const memory: EventMemory = {
        id: newEventMemoryId(),
        occurred_at: `${props.date}T00:00:00Z`,
        body,
        person_refs: [],
        concern_tag_refs: concernRefs,
        source: 'yuejing',
        admissible_use: 'eligible_for_retrieval',
        created_at: ts,
        updated_at: ts,
      };
      dispatch({
        type: 'snapshot/replace',
        snapshot: {
          ...state.snapshot,
          event_memories: [...state.snapshot.event_memories, memory],
        },
      });
    }
    setDraft('');
  }

  function startEdit(id: string, body: string) {
    setEditingId(id);
    setEditDraft(body);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft('');
  }

  function commitEdit() {
    if (!editingId) return;
    const body = editDraft.trim();
    if (body.length === 0) return;
    const ts = nowIso();
    if (isPlan) {
      dispatch({
        type: 'snapshot/replace',
        snapshot: {
          ...state.snapshot,
          plan_items: state.snapshot.plan_items.map((p) =>
            p.id === editingId ? { ...p, body, updated_at: ts } : p,
          ),
        },
      });
    } else {
      dispatch({
        type: 'snapshot/replace',
        snapshot: {
          ...state.snapshot,
          event_memories: state.snapshot.event_memories.map((m) =>
            m.id === editingId ? { ...m, body, updated_at: ts } : m,
          ),
        },
      });
    }
    cancelEdit();
  }

  // These records feed back into RiJing / NianJing / ShiJing consultation
  // retrieval (`admissible_use: 'eligible_for_retrieval'`), so a destructive
  // delete needs a deliberate confirmation step (ConfirmDialog below).
  function confirmDelete() {
    const record = confirmingDelete;
    if (!record) return;
    const id = record.id;
    if (isPlan) {
      dispatch({
        type: 'snapshot/replace',
        snapshot: {
          ...state.snapshot,
          plan_items: state.snapshot.plan_items.filter((p) => p.id !== id),
        },
      });
    } else {
      dispatch({
        type: 'snapshot/replace',
        snapshot: {
          ...state.snapshot,
          event_memories: state.snapshot.event_memories.filter((m) => m.id !== id),
        },
      });
    }
    if (editingId === id) cancelEdit();
    setConfirmingDelete(null);
  }

  // Seed this record into the ShiJing consultation and jump there. The
  // ShiJing tab reads the matching seed bus to ground the next question
  // on this specific record — past events seed `cited_event_memory_refs`,
  // future plans seed `cited_plan_item_refs`.
  function askInShiJing(recordId: string) {
    if (isPlan) {
      dispatch({ type: 'shijing/seed-plan', plan_id: recordId });
    } else {
      dispatch({ type: 'shijing/seed-memory', memory_id: recordId });
    }
    dispatch({ type: 'tab/activate', tab: 'shijing' });
    props.onClose();
  }

  const entryHeader = kind === 'past'
    ? '记一笔事件'
    : kind === 'today'
      ? '记一笔今日观察'
      : '记一笔计划项';
  const entryPlaceholder = isPlan ? '这一天计划…' : '这一天发生了什么…';
  const saveLabel = isPlan ? '保存计划' : '保存事件';
  const records = isPlan ? plansForDate : memoriesForDate;
  const recordKind = isPlan ? '计划' : '事件';

  return (
    <>
      <div
        className="shijing-yuejing__panel-backdrop"
        onClick={props.onClose}
        role="presentation"
        aria-hidden
      />
      <aside
        ref={panelRef}
        className="shijing-yuejing__panel"
        role="dialog"
        aria-modal="true"
        aria-label={`${shortMonthDay(props.date)} ${weekday} 详情`}
        data-day-kind={kind}
      >
        <button
          type="button"
          className="shijing-yuejing__panel-close"
          onClick={props.onClose}
          aria-label="关闭"
        >
          <CloseIcon />
        </button>

        <header className="shijing-yuejing__panel-head">
          <strong>{shortMonthDay(props.date)}</strong>
          <small>
            {weekday} · {kind === 'past' ? '已过' : kind === 'today' ? '今日' : '未来'}
          </small>
        </header>

        <section className="shijing-yuejing__panel-section">
          <h3>当日倾向</h3>
          {props.entries.length > 0 ? (
            <ul className="shijing-yuejing__panel-tendencies">
              {props.entries.map((entry, i) => {
                const tag = tagById.get(entry.concern_tag_ref);
                const tagName = tag ? yuejingTagLabel(tag) : entry.concern_tag_ref;
                const detail = yuejingCellDetail(entry) || PANEL_TENDENCY_FALLBACK[entry.tendency_class];
                const iconStyle = concernIconStyle(tag?.label ?? tagName);
                return (
                  <li
                    key={`${entry.concern_tag_ref}-${i}`}
                    data-tendency={entry.tendency_class}
                  >
                    <ConcernIcon style={iconStyle} />
                    <div className="shijing-yuejing__panel-tend-text">
                      <strong>{tagName}</strong>
                      <p>{detail}</p>
                    </div>
                    <span
                      className="shijing-yuejing__panel-tend-chip"
                      data-tendency={entry.tendency_class}
                    >
                      <span className="shijing-yuejing__panel-tend-dot" aria-hidden />
                      {TENDENCY_CLASS_LABELS[entry.tendency_class]}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="shijing-yuejing__panel-empty">
              本日还没有推算倾向。点击右上「生成今日」开始。
            </p>
          )}
        </section>

        <section className="shijing-yuejing__panel-section">
          <h3>{entryHeader}</h3>
          <textarea
            className="shijing-yuejing__panel-entry"
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            placeholder={entryPlaceholder}
          />
          <div className="shijing-yuejing__panel-entry-foot">
            <button
              type="button"
              className="shijing-yuejing__panel-save"
              onClick={saveEntry}
              disabled={draft.trim().length === 0}
            >
              <PencilIcon />
              <span>{saveLabel}</span>
            </button>
          </div>
        </section>

        <section className="shijing-yuejing__panel-section">
          <h3>已记录 ({records.length})</h3>
          {records.length === 0 ? (
            <div className="shijing-yuejing__panel-records-empty" role="status">
              <span className="shijing-yuejing__panel-records-empty-icon" aria-hidden>
                <ClipboardIcon />
              </span>
              <p>这一天还没有记录。</p>
            </div>
          ) : (
            <ul className="shijing-yuejing__panel-records" aria-label={`已记录的${recordKind}`}>
              {records.map((r) => {
                const isEditing = editingId === r.id;
                return (
                  <li key={r.id} data-editing={isEditing || undefined}>
                    {isEditing ? (
                      <>
                        <textarea
                          className="shijing-yuejing__panel-record-edit"
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.currentTarget.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              cancelEdit();
                            }
                          }}
                          autoFocus
                          aria-label="编辑记录内容"
                        />
                        <div className="shijing-yuejing__panel-record-edit-actions">
                          <button
                            type="button"
                            className="shijing-yuejing__panel-record-cancel"
                            onClick={cancelEdit}
                          >
                            取消
                          </button>
                          <button
                            type="button"
                            className="shijing-yuejing__panel-record-confirm"
                            disabled={
                              editDraft.trim().length === 0 || editDraft.trim() === r.body
                            }
                            onClick={commitEdit}
                          >
                            保存
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="shijing-yuejing__panel-record-body">{r.body}</span>
                        <div className="shijing-yuejing__panel-record-actions">
                          <button
                            type="button"
                            data-action="ask"
                            aria-label="去时镜问这条"
                            title="去时镜问这条"
                            onClick={() => askInShiJing(r.id)}
                          >
                            <AskIcon />
                          </button>
                          <button
                            type="button"
                            data-action="edit"
                            aria-label={`编辑这条${recordKind}`}
                            title="编辑"
                            onClick={() => startEdit(r.id, r.body)}
                          >
                            <PencilIcon />
                          </button>
                          <button
                            type="button"
                            data-action="delete"
                            aria-label={`删除这条${recordKind}`}
                            title="删除"
                            onClick={() => setConfirmingDelete({ id: r.id, body: r.body })}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </aside>
      <ConfirmDialog
        open={confirmingDelete !== null}
        title={`删除这条${recordKind}？`}
        message={
          confirmingDelete
            ? `「${confirmingDelete.body}」将被永久删除，解读时不再引用。此操作不可撤销。`
            : ''
        }
        confirmLabel="删除"
        cancelLabel="取消"
        confirmTone="danger"
        onConfirm={confirmDelete}
        onClose={() => setConfirmingDelete(null)}
      />
    </>
  );
}

// Concern tags on YueJing are managed inline through the filter row's
// 「✎ 编辑关注」popover (`YueJingConcernEditorPopover` above) — quick
// archive / unarchive, preset templates, and inline custom-tag input.
// Full management (mention resolution, prompt_text editing) still
// lives in Settings → 关注.
