// SJG-ASTRO-05 — YueJing rolling 30-day mirror screen.
//
// V2 layout (per SJG-DSY-01 mockup):
//   1. Header strip — title + window meta + 「导入到问镜」/「生成今日」
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
import type {
  YueJingCell,
  YueJingMirrorOutput,
} from '../../domain/mirror-output.ts';
import type { ReadingGenerationFailure } from '../../domain/reading.ts';
import { generateReadingForStorage } from '../reading/generate-and-store.ts';
import {
  yuejingInputsSummaryStaleForActiveSubset,
} from '../astrology/inputs-summary-expiry.ts';
import { newReadingId } from '../ids/index.ts';
import {
  latestReadingByMirrorKind,
} from '../reading/reading-selectors.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import { MIRROR_KIND_LABELS } from '../i18n/copy.ts';
import { rolling30DayMirrorScopeFromDate } from './mirror-scope-helpers.ts';
import { classifyMirrorTabState } from './mirror-state.ts';
import { persistenceReadyForAutoGeneration } from './auto-generation-readiness.ts';
import { subjectMirrorReadiness } from '../subjects/natal-readiness.ts';
import { CitationDrawer } from './shared/citation-drawer.tsx';
import { ImportToShiJingButton } from './shared/import-to-shijing-button.tsx';
import { FailureBanner } from './shared/failure-banner.tsx';
import { GeneratingButton } from './shared/generating-button.tsx';
import { MirrorPageHeader } from './shared/mirror-page-header.tsx';
import type { ShijingSettingsPageId } from '../../contracts/ia-contract.ts';
import {
  aggregateYuejingCellsByDate,
  latestYuejingReadingForDate,
  nextMissingYuejingDate,
  nowIso,
  relativeTimeShort,
  shortMonthDay,
  todayLocalDate,
} from './yuejing/yuejing-model.ts';
import { YueJingTodayHero } from './yuejing/yuejing-today-hero.tsx';
import { YueJingFilterRow } from './yuejing/yuejing-filter-row.tsx';
import { YueJingCalendar } from './yuejing/yuejing-calendar.tsx';
import { YueJingMonthPanel } from './yuejing/yuejing-month-panel.tsx';
import { YueJingDayPanel } from './yuejing/yuejing-day-panel.tsx';

export { YueJingMonthPanel } from './yuejing/yuejing-month-panel.tsx';

// ===== Pure helpers (no React) =======================================

// ===== Top-level component ==========================================
// ===== Top-level component ==========================================

export interface YueJingTabProps {
  readonly onRequestOpenSettings?: (page?: ShijingSettingsPageId) => void;
}

export function YueJingTab(props: YueJingTabProps) {
  const {
    state,
    replace_snapshot,
    persistence_status,
    persistence_client,
    runtime_ai_client,
  } = useShijingStore();
  const [loading, setLoading] = useState(false);
  const [generatingDate, setGeneratingDate] = useState<string | null>(null);
  const [failure, setFailure] = useState<ReadingGenerationFailure | null>(null);
  const [filterTagId, setFilterTagId] = useState<string | null>(null);
  const [monthPanelOpen, setMonthPanelOpen] = useState(false);
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
  const freshnessNow = useMemo(() => new Date(), [state.snapshot]);
  const stale = reading
    ? yuejingInputsSummaryStaleForActiveSubset({
        reading,
        space: state.snapshot,
        now: freshnessNow,
        active_concern_tag_refs: activeTagIds,
      })
    : false;
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
        activeTagIds,
        space: state.snapshot,
        now: freshnessNow,
      }),
    [state.snapshot, placeholderDates, activeTagIdSet, activeTagIds, freshnessNow],
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
          activeTagIds: targetTagIds,
          space: currentSpace,
          now: new Date(),
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
  // Capability-aware readiness (not a bare non-empty birth string): the scaffold
  // default has a birth_datetime_utc but is NOT ready, and 紫微 needs an exact
  // 时辰. Auto-gen must not fire on data the engine would fail closed on.
  const selfNatalReady = subjectMirrorReadiness({
    subject: 'self',
    space: state.snapshot,
    mirror_kind: 'yuejing',
    mirror_scope: rolling30DayMirrorScopeFromDate(today),
  }).ok;
  // Signature includes method_profile_id so switching the 命理 method
  // invalidates the attempt and regenerates the month under the new engine.
  const autoGenSignature = `${today}|${state.snapshot.settings.method_profile_id ?? 'default'}|${state.snapshot.self_subject.natal_inputs.birth_datetime_utc}|${activeTagIds.join(',')}`;
  const autoGenAttemptRef = useRef<string | null>(null);
  const persistenceReady = persistenceReadyForAutoGeneration({
    persistence_status,
    has_persistence_client: persistence_client !== null,
  });
  useEffect(() => {
    if (loading) return;
    if (!persistenceReady) return;
    if (!selfNatalReady) return;
    if (activeTagIds.length === 0) return;
    if (nextGenerationDate === null && reading && !stale) return;
    if (autoGenAttemptRef.current === autoGenSignature) return;
    autoGenAttemptRef.current = autoGenSignature;
    void handleGenerate(nextGenerationDate ?? today);
  }, [loading, persistenceReady, selfNatalReady, activeTagIds, reading, stale, autoGenSignature, nextGenerationDate]);

  const output = latestReading?.output.mirror_kind === 'yuejing'
    ? (latestReading.output as YueJingMirrorOutput)
    : null;
  const generatedCellCount = useMemo(
    () => Array.from(cellsByDate.values()).reduce((sum, cells) => sum + cells.length, 0),
    [cellsByDate],
  );
  const isReady = generatedCellCount > 0;

  const scopedActiveTags = useMemo(
    () => filterTagId ? activeTags.filter((tag) => tag.id === filterTagId) : activeTags,
    [activeTags, filterTagId],
  );
  const scopedCellsByDate = useMemo(() => {
    if (!filterTagId) return cellsByDate;
    const filtered = new Map<string, readonly YueJingCell[]>();
    for (const [date, entries] of cellsByDate) {
      const kept = entries.filter((e) => e.concern_tag_ref === filterTagId);
      filtered.set(date, kept);
    }
    return filtered;
  }, [cellsByDate, filterTagId]);
  const cellsForToday = cellsByDate.get(today) ?? [];
  const scopedCellsForToday = scopedCellsByDate.get(today) ?? [];

  function handleFilterChange(nextTagId: string | null) {
    setFilterTagId(nextTagId);
    setSelectedDate(null);
    setMonthPanelOpen(false);
  }

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
  const generatedAgo = latestReading?.created_at
    ? relativeTimeShort(latestReading.created_at)
    : null;
  const generateLabel = nextGenerationDate === null
    ? '已完成'
    : nextGenerationDate === today
      ? '生成 30 日'
      : '继续生成';

  return (
    <section
      className="shijing-tab shijing-yuejing"
      data-mirror-kind="yuejing"
      aria-label={MIRROR_KIND_LABELS.yuejing}
    >
      <MirrorPageHeader
        title={MIRROR_KIND_LABELS.yuejing}
        meta={generatedAgo ? <>上次生成 {generatedAgo}</> : undefined}
        actions={(
          <>
            {latestReading?.id ? <ImportToShiJingButton readingId={latestReading.id} /> : null}
            <GeneratingButton
              className="shijing-yuejing__generate"
              disabled={loading || activeTagIds.length === 0 || nextGenerationDate === null}
              busy={loading}
              busyLabel="生成中…"
              onClick={() => {
                void handleGenerate(nextGenerationDate ?? today);
              }}
            >
              {generateLabel}
            </GeneratingButton>
          </>
        )}
      />

      {/* Inline status row above the calendar — a thin hint banner
       * rather than a full empty-state takeover so the calendar grid
       * stays visible underneath. */}
      {!selfNatalReady ? (
        <p role="status" className="shijing-yuejing__notice">
          请先在「设置 → 本人」中填写出生信息,月镜会据此自动推算。
        </p>
      ) : activeTagIds.length === 0 ? (
        <div
          role="status"
          aria-live="polite"
          className="shijing-yuejing__notice shijing-yuejing__notice--action"
        >
          <span>
            <strong>还没有激活关注</strong>
            月镜需要至少一个关注作为镜片，才会自动生成 30 日倾向。
          </span>
          <button
            type="button"
            className="shijing-yuejing__notice-action"
            onClick={() => props.onRequestOpenSettings?.('concerns')}
          >
            去设置关注
          </button>
        </div>
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
          cellsForToday={scopedCellsForToday}
          activeTags={scopedActiveTags}
          onOpenDetails={() => {
            setSelectedDate(null);
            setMonthPanelOpen(true);
          }}
        />
      ) : null}

      {/* Filter row — only meaningful once tendency data exists. */}
      {isReady ? (
        <YueJingFilterRow
          activeTags={activeTags}
          filterTagId={filterTagId}
          onFilterChange={handleFilterChange}
        />
      ) : null}

      {/* Calendar — always rendered, with either real per-concern
       * cells or empty placeholder cells. */}
      <YueJingCalendar
        cellsByDate={scopedCellsByDate}
        today={today}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      {/* Details — only when a reading exists (has summary + cite). */}
      {isReady && latestReading && output && filterTagId === null ? (
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
          entries={scopedCellsByDate.get(selectedDate) ?? []}
          activeTags={scopedActiveTags}
          filterTagId={filterTagId}
          onClose={() => setSelectedDate(null)}
        />
      ) : null}
      {monthPanelOpen ? (
        <YueJingMonthPanel
          dates={placeholderDates}
          cellsByDate={scopedCellsByDate}
          activeTags={scopedActiveTags}
          eventMemories={state.snapshot.event_memories}
          planItems={state.snapshot.plan_items}
          onClose={() => setMonthPanelOpen(false)}
        />
      ) : null}
    </section>
  );
}
