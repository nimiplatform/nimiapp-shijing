import { useMemo } from 'react';
import { Tooltip } from '@nimiplatform/kit/ui';
import { TENDENCY_CLASS_LABELS } from '../../i18n/copy.ts';
import { trimmedConcernLabel } from '../../concern-tags/concern-presets.ts';
import {
  INFLECTION_KIND_LABELS,
  bandYearRangeLabel,
  yearOf,
  type LaneViewModel,
  type SelectedDetail,
} from './nianjing-view-model.ts';
import { NIANJING_COPY } from './nianjing-copy.ts';

interface NianJingTimelineProps {
  readonly lanes: readonly LaneViewModel[];
  readonly horizon: { readonly start_date: string; readonly end_date: string };
  readonly nowPct: number;
  readonly percentOf: (date: string) => number;
  readonly onSelectDetail: (selection: SelectedDetail) => void;
}

export function NianJingTimeline(props: NianJingTimelineProps) {
  const startYear = yearOf(props.horizon.start_date);
  const endYear = yearOf(props.horizon.end_date);
  // One tick per year from (start+1) to end inclusive. The start year
  // slot is reserved for the "现在" badge at today's actual position.
  const tickYears: readonly number[] = useMemo(() => {
    const xs: number[] = [];
    for (let y = startYear + 1; y <= endYear; y += 1) xs.push(y);
    return xs;
  }, [startYear, endYear]);

  function tickPct(year: number): number {
    return props.percentOf(`${year}-01-01`);
  }

  if (props.lanes.length === 0) {
    return (
      <p className="shijing-nianjing__notice" role="status">
        {NIANJING_COPY.timeline.emptyNotice}
      </p>
    );
  }

  return (
    <article
      className="shijing-nianjing__timeline"
      aria-label={NIANJING_COPY.timeline.ariaLabel}
    >
      <div className="shijing-nianjing__lanes-wrap">
        <div className="shijing-nianjing__axis" aria-hidden>
          <span
            className="shijing-nianjing__now-tag"
            style={{ left: `${props.nowPct}%` }}
          >
            {NIANJING_COPY.timeline.now}
          </span>
          {tickYears.map((year) => (
            <span
              key={year}
              className="shijing-nianjing__axis-tick"
              style={{ left: `${tickPct(year)}%` }}
            >
              {year}
            </span>
          ))}
        </div>
        {props.lanes.map((lane) => (
          <div className="shijing-nianjing__lane" key={lane.tag.id}>
            <span className="shijing-nianjing__lane-label">
              <strong>{trimmedConcernLabel(lane.tag)}</strong>
              {lane.current ? (
                <small>{TENDENCY_CLASS_LABELS[lane.current.nature]}{NIANJING_COPY.timeline.currentSuffix}</small>
              ) : (
                <small>—</small>
              )}
            </span>
            <div className="shijing-nianjing__lane-track">
              {lane.phases.map((band, i) => {
                const left = props.percentOf(band.start_date);
                const right = props.percentOf(band.end_date);
                const width = Math.max(0.5, right - left);
                const natureLabel = TENDENCY_CLASS_LABELS[band.nature];
                const tooltip = `${band.start_date} → ${band.end_date} · ${natureLabel}${NIANJING_COPY.timeline.currentSuffix} · ${NIANJING_COPY.timeline.clickToView}`;
                return (
                  <Tooltip key={i} content={tooltip} placement="top">
                    <button
                      type="button"
                      className="shijing-nianjing__band"
                      data-nature={band.nature}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      aria-label={NIANJING_COPY.timeline.bandAriaLabel(
                        bandYearRangeLabel(band),
                        natureLabel,
                      )}
                      onClick={() =>
                        props.onSelectDetail({ kind: 'band', band, tag: lane.tag })
                      }
                    >
                      <span className="shijing-nianjing__band-label">
                        {natureLabel}
                      </span>
                      <span className="shijing-nianjing__band-detail">
                        {bandYearRangeLabel(band)}
                      </span>
                    </button>
                  </Tooltip>
                );
              })}
              {lane.inflections.map((inflection, i) => {
                const left = props.percentOf(inflection.date);
                const kindLabel = INFLECTION_KIND_LABELS[inflection.kind];
                const tooltip = `${inflection.date} · ${kindLabel} · ${NIANJING_COPY.timeline.clickToView}`;
                return (
                  <Tooltip key={`marker-${i}`} content={tooltip} placement="top">
                    <button
                      type="button"
                      className="shijing-nianjing__marker"
                      data-kind={inflection.kind}
                      style={{ left: `${left}%` }}
                      aria-label={NIANJING_COPY.timeline.markerAriaLabel(inflection.date, kindLabel)}
                      onClick={() =>
                        props.onSelectDetail({
                          kind: 'inflection',
                          inflection,
                          tag: lane.tag,
                        })
                      }
                    />
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}
        {/* Vertical "现在" line laid across all lanes. The track region
         * starts at lane-label (96px) + grid gap (14px) = 110px and
         * spans the remaining width. The CSS calc projects nowPct
         * (0..100) onto that sub-range. */}
        <div
          className="shijing-nianjing__nowline"
          aria-hidden
          style={{
            left: `calc(110px + (100% - 110px) * ${(props.nowPct / 100).toFixed(4)})`,
          }}
        />
      </div>

      <ul className="shijing-nianjing__timeline-legend" aria-label={NIANJING_COPY.timeline.legendAriaLabel}>
        <li>
          <span className="shijing-nianjing__legend-marker" data-kind="dayun_boundary" aria-hidden />
          大运边界
        </li>
        <li>
          <span className="shijing-nianjing__legend-marker" data-kind="annual_transition" aria-hidden />
          流年切换
        </li>
        <li>
          <span className="shijing-nianjing__legend-marker" data-kind="marker_cluster" aria-hidden />
          多重节点
        </li>
        <li className="shijing-nianjing__legend-now">
          <span className="shijing-nianjing__legend-now-line" aria-hidden />
          {NIANJING_COPY.timeline.now}
        </li>
      </ul>
    </article>
  );
}

// ===== 6) Right-side detail drawer ==================================
// Opens when the user clicks a phase band OR an inflection marker in
// the timeline. Visual treatment matches the YueJing day panel
// (flush-to-edge, nearly-opaque white glass, left-only border, soft
// leftward shadow, light white-wash backdrop). The two kinds share
// the same shell + close button + escape handling; only the body
// content differs.
