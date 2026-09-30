import { useProductCopy } from '../../i18n/copy.ts';
import { useMemo, useState } from 'react';
import type { Reading } from '../../../domain/reading.ts';
import type { NianJingMirrorOutput, NianJingNature } from '../../../domain/mirror-output.ts';
import type { ConcernTag } from '../../../domain/concern-tag.ts';

import { trimmedConcernLabel } from '../../concern-tags/concern-presets.ts';
import { CitationDrawer } from '../shared/citation-drawer.tsx';
import { buildNianJingYearModules } from './nianjing-year-modules.ts';
import { NianJingFilterRow } from './nianjing-filter-row.tsx';
import { NianJingYearOverview } from './nianjing-year-overview.tsx';
import { NianJingTimeline } from './nianjing-timeline.tsx';
import {
  buildLanes,
  dateToMs,
  dominantCurrentNature,
  todayIsoDate,
  yearOf,
  type LaneViewModel,
  type SelectedDetail,
} from './nianjing-view-model.ts';

interface NianJingReadyViewProps {
  readonly reading: Reading | null;
  readonly output: NianJingMirrorOutput;
  readonly activeTags: readonly ConcernTag[];
  readonly filterTagId: string | null;
  readonly onFilterChange: (id: string | null) => void;
  readonly onSelectDetail: (selection: SelectedDetail) => void;
}

export function NianJingReadyView(props: NianJingReadyViewProps) {
  const [concernEditorOpen, setConcernEditorOpen] = useState(false);
  const today = todayIsoDate();
  const lanes = useMemo(
    () => buildLanes(props.output, props.activeTags, today),
    [props.output, props.activeTags, today],
  );
  // Both hero + timeline scope to the user's concern filter. Without
  // this, picking 事业 would still leave the hero on 姻缘's more-severe
  // 观察 (since dominantCurrentNature picks the highest severity across
  // ALL lanes), which reads as "the filter is broken".
  const lanesForView = useMemo(
    () =>
      props.filterTagId
        ? lanes.filter((l) => l.tag.id === props.filterTagId)
        : lanes,
    [lanes, props.filterTagId],
  );
  const focusedTag = useMemo(
    () =>
      props.filterTagId
        ? props.activeTags.find((t) => t.id === props.filterTagId) ?? null
        : null,
    [props.activeTags, props.filterTagId],
  );
  const detailTags = useMemo(
    () => (focusedTag ? [focusedTag] : props.activeTags),
    [focusedTag, props.activeTags],
  );
  const overviewYearModules = useMemo(
    () =>
      buildNianJingYearModules({
        output: props.output,
        active_concern_tags: props.activeTags,
        today,
      }),
    [props.output, props.activeTags, today],
  );
  const detailYearModules = useMemo(
    () =>
      focusedTag
        ? buildNianJingYearModules({
            output: props.output,
            active_concern_tags: detailTags,
            today,
          })
        : overviewYearModules,
    [props.output, detailTags, focusedTag, overviewYearModules, today],
  );
  const horizonStartMs = dateToMs(props.output.horizon.start_date);
  const horizonEndMs = dateToMs(props.output.horizon.end_date);
  const horizonSpan = Math.max(1, horizonEndMs - horizonStartMs);
  const todayMs = dateToMs(today);
  const nowPct = Math.max(
    0,
    Math.min(100, ((todayMs - horizonStartMs) / horizonSpan) * 100),
  );

  function percentOf(date: string): number {
    const ms = dateToMs(date);
    if (!Number.isFinite(ms)) return 0;
    return Math.max(0, Math.min(100, ((ms - horizonStartMs) / horizonSpan) * 100));
  }

  const hasCurrent = lanesForView.some((l) => l.current !== null);
  const heroNature = dominantCurrentNature(lanesForView);

  return (
    <>
      {hasCurrent ? (
        <NianJingPhaseHero
          horizon={props.output.horizon}
          nature={heroNature}
          today={today}
          lanes={lanesForView}
          focusedTag={focusedTag}
        />
      ) : null}

      <NianJingFilterRow
        activeTags={props.activeTags}
        filterTagId={props.filterTagId}
        onFilterChange={props.onFilterChange}
        editorOpen={concernEditorOpen}
        onEditorOpenChange={setConcernEditorOpen}
      />

      <NianJingYearOverview
        overviewModules={overviewYearModules}
        detailModules={detailYearModules}
        overviewTags={props.activeTags}
        detailTags={detailTags}
        focusedTag={focusedTag}
        onSelectDetail={props.onSelectDetail}
      />

      <NianJingTimeline
        lanes={lanesForView}
        horizon={props.output.horizon}
        nowPct={nowPct}
        percentOf={percentOf}
        onSelectDetail={props.onSelectDetail}
      />
      {props.reading ? <CitationDrawer reading={props.reading} /> : null}
    </>
  );
}

// ===== 3) Current-phase hero ========================================

function NianJingPhaseHero(props: {
  readonly horizon: { readonly start_date: string; readonly end_date: string };
  readonly nature: NianJingNature;
  readonly today: string;
  readonly lanes: readonly LaneViewModel[];
  readonly focusedTag: ConcernTag | null;
}) {
  const TENDENCY_CLASS_LABELS = useProductCopy().tendencyClassLabels;
  const NIANJING_COPY = useProductCopy().nianjingSurface;
  const natureLabel = TENDENCY_CLASS_LABELS[props.nature];
  const body = NIANJING_COPY.bodyByNature[props.nature];
  const currentYear = yearOf(props.today);
  const horizonLabel = `${yearOf(props.horizon.start_date)}–${yearOf(props.horizon.end_date)}`;
  const eyebrowText = props.focusedTag
    ? NIANJING_COPY.hero.focusedEyebrow(trimmedConcernLabel(props.focusedTag))
    : NIANJING_COPY.hero.defaultEyebrow;

  return (
    <article
      className="shijing-nianjing__hero"
      data-nature={props.nature}
      aria-label={NIANJING_COPY.hero.ariaLabel}
    >
      <div className="shijing-nianjing__hero-headline">
        <span className="shijing-nianjing__hero-eyebrow">{eyebrowText}</span>
        <div className="shijing-nianjing__hero-nature">
          <strong>{natureLabel}</strong>
          <small>{NIANJING_COPY.yearLabel(currentYear)} · {horizonLabel} {NIANJING_COPY.hero.horizonSuffix}</small>
        </div>
        <p className="shijing-nianjing__hero-body">{body}</p>
      </div>
      <ul className="shijing-nianjing__hero-rows" aria-label={NIANJING_COPY.hero.rowsAriaLabel}>
        {props.lanes.map((lane) => {
          const nature = lane.current?.nature ?? 'steady';
          return (
            <li key={lane.tag.id}>
              <span className="shijing-nianjing__hero-row-label">
                {trimmedConcernLabel(lane.tag)}
              </span>
              <span
                className="shijing-nianjing__hero-row-chip"
                data-nature={nature}
              >
                <span className="shijing-nianjing__hero-row-chip-dot" aria-hidden />
                {TENDENCY_CLASS_LABELS[nature]}
              </span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

// ===== 4) Filter row + tendency legend ==============================
