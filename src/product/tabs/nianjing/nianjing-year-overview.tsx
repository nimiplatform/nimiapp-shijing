import { useMemo } from 'react';
import { Tooltip } from '@nimiplatform/kit/ui';
import type { ConcernTag } from '../../../domain/concern-tag.ts';
import { TENDENCY_CLASS_LABELS } from '../../i18n/copy.ts';
import { trimmedConcernLabel } from '../../concern-tags/concern-presets.ts';
import {
  nianjingYearSegmentFlex,
  type NianJingYearCell,
  type NianJingYearModule,
} from './nianjing-year-modules.ts';
import {
  INFLECTION_KIND_LABELS,
  formatDateDots,
  type SelectedDetail,
} from './nianjing-view-model.ts';
import { NIANJING_COPY } from './nianjing-copy.ts';

function cellPrimaryLabel(cell: NianJingYearCell): string {
  return cell.primary_nature ? TENDENCY_CLASS_LABELS[cell.primary_nature] : '—';
}

export function NianJingYearOverview(props: {
  readonly modules: readonly NianJingYearModule[];
  readonly activeTags: readonly ConcernTag[];
  readonly onSelectDetail: (selection: SelectedDetail) => void;
}) {
  const tagsById = useMemo(
    () => new Map(props.activeTags.map((tag) => [tag.id, tag])),
    [props.activeTags],
  );

  if (props.modules.length === 0 || props.activeTags.length === 0) {
    return null;
  }

  return (
    <article
      className="shijing-nianjing__year-overview"
      aria-label={NIANJING_COPY.yearOverview.ariaLabel}
    >
      <header className="shijing-nianjing__year-overview-head">
        <h2>{NIANJING_COPY.yearOverview.title}</h2>
        <span>{NIANJING_COPY.yearOverview.subtitle}</span>
      </header>
      <div className="shijing-nianjing__year-grid">
        <div className="shijing-nianjing__year-labels" aria-hidden>
          <span className="shijing-nianjing__year-label-head">{NIANJING_COPY.yearOverview.concern}</span>
          {props.activeTags.map((tag) => (
            <span className="shijing-nianjing__year-row-label" key={tag.id}>
              {trimmedConcernLabel(tag)}
            </span>
          ))}
        </div>
        {props.modules.map((module) => (
          <div
            className="shijing-nianjing__year-column"
            data-current={module.is_current_year ? 'true' : undefined}
            key={module.year}
          >
            <span className="shijing-nianjing__year-head">
              {module.is_current_year ? (
                <small className="shijing-nianjing__year-now">{NIANJING_COPY.yearOverview.now}</small>
              ) : null}
              {module.year}
            </span>
            {module.cells.map((cell) => (
              <NianJingYearCellView
                key={cell.concern_tag_ref}
                cell={cell}
                tag={tagsById.get(cell.concern_tag_ref) ?? null}
                onSelectDetail={props.onSelectDetail}
              />
            ))}
          </div>
        ))}
      </div>
    </article>
  );
}

function NianJingYearCellView(props: {
  readonly cell: NianJingYearCell;
  readonly tag: ConcernTag | null;
  readonly onSelectDetail: (selection: SelectedDetail) => void;
}) {
  const primaryLabel = cellPrimaryLabel(props.cell);
  const ariaLabel = `${props.cell.year} ${props.cell.label} ${primaryLabel}`;
  const primarySegment = props.cell.primary_segment;
  const primaryTooltip = primarySegment
    ? `${formatDateDots(primarySegment.start_date)} → ${formatDateDots(primarySegment.end_date)} · ${primaryLabel}`
    : ariaLabel;

  return (
    <div
      className="shijing-nianjing__year-cell"
      data-nature={props.cell.primary_nature ?? 'empty'}
      data-current={props.cell.is_current_year ? 'true' : undefined}
      aria-label={ariaLabel}
    >
      {primarySegment ? (
        <Tooltip content={primaryTooltip} placement="top">
          <button
            type="button"
            className="shijing-nianjing__year-cell-main"
            aria-label={NIANJING_COPY.yearOverview.phaseAriaLabel(
              props.cell.year,
              props.cell.label,
              primaryLabel,
            )}
            onClick={() => {
              if (!props.tag) return;
              props.onSelectDetail({
                kind: 'band',
                band: primarySegment.band,
                tag: props.tag,
              });
            }}
          >
            <span className="shijing-nianjing__year-cell-label">{primaryLabel}</span>
          </button>
        </Tooltip>
      ) : (
        <span className="shijing-nianjing__year-cell-main" aria-hidden>
          <span className="shijing-nianjing__year-cell-label">{primaryLabel}</span>
        </span>
      )}
      {props.cell.segments.length > 1 ? (
        <div className="shijing-nianjing__year-cell-stripe" aria-hidden>
          {props.cell.segments.map((segment) => (
            <span
              key={`${segment.start_date}-${segment.end_date}-${segment.nature}`}
              className="shijing-nianjing__year-cell-stripe-segment"
              data-nature={segment.nature}
              data-current={segment.is_current ? 'true' : undefined}
              style={{ flex: nianjingYearSegmentFlex(segment) }}
            />
          ))}
        </div>
      ) : null}
      {props.cell.inflections.length > 0 ? (
        <div
          className="shijing-nianjing__year-markers"
          aria-label={NIANJING_COPY.yearOverview.markersAriaLabel(props.cell.year, props.cell.label)}
        >
          {props.cell.inflections.map((inflection, i) => {
            const kindLabel = INFLECTION_KIND_LABELS[inflection.kind];
            const tooltip = `${formatDateDots(inflection.date)} · ${kindLabel}`;
            return (
              <Tooltip
                key={`${inflection.date}-${inflection.kind}-${i}`}
                content={tooltip}
                placement="top"
              >
                <button
                  type="button"
                  className="shijing-nianjing__year-marker"
                  data-kind={inflection.kind}
                  aria-label={`${props.cell.year} ${props.cell.label} ${kindLabel}`}
                  onClick={() => {
                    if (!props.tag) return;
                    props.onSelectDetail({
                      kind: 'inflection',
                      inflection,
                      tag: props.tag,
                    });
                  }}
                />
              </Tooltip>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

// ===== 6) Long-horizon timeline =====================================
