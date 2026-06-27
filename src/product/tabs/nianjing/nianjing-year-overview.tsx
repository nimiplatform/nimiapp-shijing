import { useEffect, useMemo, useState } from 'react';
import type { ConcernTag } from '../../../domain/concern-tag.ts';
import type { NianJingNature } from '../../../domain/mirror-output.ts';
import { TENDENCY_CLASS_LABELS } from '../../i18n/copy.ts';
import { trimmedConcernLabel } from '../../concern-tags/concern-presets.ts';
import {
  buildNianJingAnnualOverview,
  buildNianJingSelectedYearDetail,
  type NianJingAnnualOverviewYear,
  type NianJingSelectedYearConcernCard,
  type NianJingSelectedYearDetail,
  type NianJingYearModule,
  type NianJingYearSegment,
} from './nianjing-year-modules.ts';
import {
  INFLECTION_KIND_LABELS,
  NATURE_GUIDANCE,
  substituteConcernPlaceholder,
  type SelectedDetail,
} from './nianjing-view-model.ts';
import { NIANJING_COPY } from './nianjing-copy.ts';

const NATURE_LEVEL: Record<NianJingNature, number> = {
  supportive: 78,
  steady: 68,
  watch: 57,
  turning: 52,
  blocked: 40,
};

const PATH_TONES = ['primary', 'secondary', 'tertiary', 'quaternary', 'quinary'] as const;

function selectedDefaultYear(modules: readonly NianJingYearModule[]): number | null {
  return modules.find((module) => module.is_current_year)?.year ?? modules[0]?.year ?? null;
}

function monthOf(date: string): number {
  return Number(date.slice(5, 7));
}

function natureLevel(nature: NianJingNature | null): number {
  return nature ? NATURE_LEVEL[nature] : 46;
}

function natureRailWidth(nature: NianJingNature | null): string {
  return `${natureLevel(nature)}%`;
}

function naturePointY(nature: NianJingNature | null): number {
  return 154 - (natureLevel(nature) / 100) * 116;
}

function pointStringForModules(
  modules: readonly NianJingYearModule[],
  tagId: string,
): string {
  if (modules.length === 0) return '';
  return modules
    .map((module, index) => {
      const cell = module.cells.find((item) => item.concern_tag_ref === tagId) ?? null;
      const x = modules.length === 1 ? 500 : 70 + (index * 860) / (modules.length - 1);
      const y = naturePointY(cell?.primary_nature ?? null);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function primaryMonthActive(
  segment: NianJingYearSegment | null,
  month: number,
): boolean {
  if (!segment) return false;
  return monthOf(segment.start_date) <= month && month <= monthOf(segment.end_date);
}

function primarySummaryFor(detail: NianJingSelectedYearDetail): string {
  const primary = detail.concern_cards.find(
    (card) => card.concern_tag_ref === detail.primary_concern_tag_ref,
  );
  return primary?.primary_summary || NIANJING_COPY.yearOverview.selectedSummaryFallback;
}

function yearNatureLabel(nature: NianJingNature | null): string {
  return nature ? TENDENCY_CLASS_LABELS[nature] : '未成段';
}

export function NianJingYearOverview(props: {
  readonly overviewModules: readonly NianJingYearModule[];
  readonly detailModules: readonly NianJingYearModule[];
  readonly overviewTags: readonly ConcernTag[];
  readonly detailTags: readonly ConcernTag[];
  readonly focusedTag: ConcernTag | null;
  readonly onSelectDetail: (selection: SelectedDetail) => void;
}) {
  const overviewYears = useMemo(
    () => buildNianJingAnnualOverview(props.overviewModules),
    [props.overviewModules],
  );
  const defaultYear = useMemo(
    () => selectedDefaultYear(props.detailModules),
    [props.detailModules],
  );
  const [selectedYear, setSelectedYear] = useState<number | null>(defaultYear);

  useEffect(() => {
    if (defaultYear === null) {
      setSelectedYear(null);
      return;
    }
    if (!props.detailModules.some((module) => module.year === selectedYear)) {
      setSelectedYear(defaultYear);
    }
  }, [defaultYear, props.detailModules, selectedYear]);

  const selectedModule = useMemo(() => {
    if (props.detailModules.length === 0) return null;
    return (
      props.detailModules.find((module) => module.year === selectedYear) ??
      props.detailModules.find((module) => module.is_current_year) ??
      props.detailModules[0]
    );
  }, [props.detailModules, selectedYear]);

  const selectedDetail = useMemo(
    () =>
      selectedModule
        ? buildNianJingSelectedYearDetail({
            module: selectedModule,
            active_concern_tags: props.detailTags,
          })
        : null,
    [props.detailTags, selectedModule],
  );

  const detailTagsById = useMemo(
    () => new Map(props.detailTags.map((tag) => [tag.id, tag])),
    [props.detailTags],
  );
  const pathTags = props.focusedTag
    ? [props.focusedTag]
    : props.overviewTags;

  if (props.overviewModules.length === 0 || props.overviewTags.length === 0 || !selectedDetail) {
    return null;
  }

  // Decorative-only: the vertical guide marks which year the detail
  // panel below is showing. No score axis — it just ties the curve to
  // the selection (SJG-REMOVED-04: interpolation, not product truth).
  const selectedDetailYear = selectedDetail.year;
  const selectedIndex = props.overviewModules.findIndex((module) => module.year === selectedDetailYear);
  const selectedX =
    props.overviewModules.length <= 1
      ? 500
      : 70 + (Math.max(0, selectedIndex) * 860) / (props.overviewModules.length - 1);

  return (
    <article
      className="shijing-nianjing__year-overview"
      aria-label={NIANJING_COPY.yearOverview.ariaLabel}
    >
      <section className="shijing-nianjing__path-card" aria-label={NIANJING_COPY.yearOverview.pathTitle}>
        <header className="shijing-nianjing__path-head">
          <div>
            <h2>{NIANJING_COPY.yearOverview.pathTitle}</h2>
            <span>{NIANJING_COPY.yearOverview.pathSubtitle}</span>
          </div>
          <ul
            className="shijing-nianjing__path-legend"
            aria-label={NIANJING_COPY.yearOverview.pathLegendAriaLabel}
          >
            {pathTags.map((tag, index) => (
              <li key={tag.id} data-tone={PATH_TONES[index] ?? 'tertiary'}>
                <span className="shijing-nianjing__path-legend-line" aria-hidden />
                {trimmedConcernLabel(tag)}
              </li>
            ))}
          </ul>
        </header>

        <div className="shijing-nianjing__path-plot" aria-hidden>
          <svg viewBox="0 0 1000 180" preserveAspectRatio="none">
            <g className="shijing-nianjing__path-grid">
              <line x1="70" y1="48" x2="930" y2="48" />
              <line x1="70" y1="86" x2="930" y2="86" />
              <line x1="70" y1="124" x2="930" y2="124" />
            </g>
            {selectedIndex >= 0 ? (
              <line
                className="shijing-nianjing__path-now"
                x1={selectedX}
                y1="20"
                x2={selectedX}
                y2="158"
              />
            ) : null}
            {pathTags.map((tag, index) => (
              <polyline
                key={tag.id}
                className="shijing-nianjing__path-line"
                data-tone={PATH_TONES[index] ?? 'tertiary'}
                points={pointStringForModules(props.overviewModules, tag.id)}
              />
            ))}
            {pathTags.map((tag) =>
              props.overviewModules.map((module, index) => {
                const cell = module.cells.find((item) => item.concern_tag_ref === tag.id) ?? null;
                const x = props.overviewModules.length === 1 ? 500 : 70 + (index * 860) / (props.overviewModules.length - 1);
                const isSelectedYear = module.year === selectedDetailYear;
                // Node color tracks the concern's tendency CLASS for that
                // year (same nature that sets its height) — so a 阻滞 year
                // reads red, 助力 green, etc. The line stays dimension-
                // colored to match the legend.
                return (
                  <circle
                    key={`${tag.id}-${module.year}`}
                    className="shijing-nianjing__path-point"
                    data-nature={cell?.primary_nature ?? 'empty'}
                    data-selected={isSelectedYear ? 'true' : undefined}
                    cx={x}
                    cy={naturePointY(cell?.primary_nature ?? null)}
                    r={isSelectedYear ? '6' : '4.2'}
                  />
                );
              }),
            )}
          </svg>
        </div>

        <YearSelector
          years={overviewYears}
          selectedYear={selectedDetail.year}
          onSelectYear={setSelectedYear}
        />
      </section>

      <SelectedYearPanel
        detail={selectedDetail}
        detailTagsById={detailTagsById}
        onSelectDetail={props.onSelectDetail}
      />
    </article>
  );
}

function YearSelector(props: {
  readonly years: readonly NianJingAnnualOverviewYear[];
  readonly selectedYear: number;
  readonly onSelectYear: (year: number) => void;
}) {
  return (
    <div className="shijing-nianjing__year-selector" aria-label={NIANJING_COPY.yearOverview.summaryAriaLabel}>
      {props.years.map((year) => {
        const selected = year.year === props.selectedYear;
        const label = yearNatureLabel(year.primary_nature);
        return (
          <button
            key={year.year}
            type="button"
            className="shijing-nianjing__year-summary-card"
            data-nature={year.primary_nature ?? 'empty'}
            data-current={year.is_current_year ? 'true' : undefined}
            aria-pressed={selected}
            aria-label={NIANJING_COPY.yearOverview.summaryCardAriaLabel(year.year, label)}
            onClick={() => props.onSelectYear(year.year)}
          >
            {year.is_current_year ? (
              <small className="shijing-nianjing__year-now">{NIANJING_COPY.yearOverview.now}</small>
            ) : null}
            <span className="shijing-nianjing__year-summary-line">
              <span className="shijing-nianjing__year-summary-dot" aria-hidden />
              <strong>{year.year}</strong>
            </span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function SelectedYearPanel(props: {
  readonly detail: NianJingSelectedYearDetail;
  readonly detailTagsById: ReadonlyMap<string, ConcernTag>;
  readonly onSelectDetail: (selection: SelectedDetail) => void;
}) {
  const natureLabel = yearNatureLabel(props.detail.primary_nature);
  const primarySummary = primarySummaryFor(props.detail);
  return (
    <>
      <section className="shijing-nianjing__year-selected" aria-label={NIANJING_COPY.yearOverview.yearDetailTitle}>
        <div className="shijing-nianjing__year-selected-head">
          <div>
            <span className="shijing-nianjing__year-selected-eyebrow">
              {NIANJING_COPY.yearOverview.selectedEyebrow}
            </span>
            <h3>
              {props.detail.year} 年
              <span data-nature={props.detail.primary_nature ?? 'empty'}>{natureLabel}</span>
            </h3>
            <p>{primarySummary}</p>
          </div>
          <div className="shijing-nianjing__year-selected-meter" data-nature={props.detail.primary_nature ?? 'empty'}>
            <span>{NIANJING_COPY.yearOverview.selectedMeta}</span>
            <strong>{natureLabel}</strong>
            <div className="shijing-nianjing__year-meter-rail" aria-hidden>
              <span style={{ width: natureRailWidth(props.detail.primary_nature) }} />
            </div>
          </div>
        </div>

        <div className="shijing-nianjing__year-concerns">
          {props.detail.concern_cards.map((card) => (
            <ConcernYearCard
              key={card.concern_tag_ref}
              card={card}
              tag={props.detailTagsById.get(card.concern_tag_ref) ?? null}
              onSelectDetail={props.onSelectDetail}
            />
          ))}
        </div>
      </section>

      <section className="shijing-nianjing__year-basis" aria-label={NIANJING_COPY.yearOverview.basisTitle}>
        <header>
          <h3>{NIANJING_COPY.yearOverview.basisTitle}</h3>
          <span>{NIANJING_COPY.yearOverview.basisSubtitle}</span>
        </header>
        <div className="shijing-nianjing__year-basis-grid">
          {props.detail.basis_items.map((item) => (
            <article className="shijing-nianjing__year-basis-item" key={item.kind}>
              <strong>{NIANJING_COPY.yearOverview.basisLabels[item.kind]}</strong>
              <p>{NIANJING_COPY.yearOverview.basisSummary(item.count, item.summaries[0] ?? item.dates[0] ?? '')}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function ConcernYearCard(props: {
  readonly card: NianJingSelectedYearConcernCard;
  readonly tag: ConcernTag | null;
  readonly onSelectDetail: (selection: SelectedDetail) => void;
}) {
  const label = props.tag ? trimmedConcernLabel(props.tag) : props.card.label.replace(/^#/, '');
  const natureLabel = yearNatureLabel(props.card.primary_nature);
  const guidance = props.card.primary_nature ? NATURE_GUIDANCE[props.card.primary_nature] : null;
  const favorable =
    props.card.driver_guidance.favorable.length > 0
      ? props.card.driver_guidance.favorable.slice(0, 3)
      : guidance?.suggestions.slice(0, 3).map((item) => item.title) ?? [];
  const guarded =
    props.card.driver_guidance.guarded.length > 0
      ? props.card.driver_guidance.guarded.slice(0, 2)
      : guidance?.cautions.slice(0, 2).map((item) => item.title) ?? [];
  const canOpenBand = Boolean(props.card.primary_segment && props.tag);

  return (
    <article className="shijing-nianjing__year-concern-card" data-nature={props.card.primary_nature ?? 'empty'}>
      <header>
        <div>
          <h4>{label}</h4>
          <span>{natureLabel}</span>
        </div>
        <button
          type="button"
          disabled={!canOpenBand}
          aria-label={NIANJING_COPY.yearOverview.phaseAriaLabel(
            props.card.year,
            label,
            natureLabel,
          )}
          onClick={() => {
            if (!props.card.primary_segment || !props.tag) return;
            props.onSelectDetail({
              kind: 'band',
              band: props.card.primary_segment.band,
              tag: props.tag,
            });
          }}
        >
          查看相位
        </button>
      </header>
      <div className="shijing-nianjing__year-meter-rail" aria-hidden>
        <span style={{ width: natureRailWidth(props.card.primary_nature) }} />
      </div>
      <p>{props.card.primary_summary || NIANJING_COPY.yearOverview.selectedSummaryFallback}</p>

      <div className="shijing-nianjing__year-advice">
        <section>
          <strong>{NIANJING_COPY.yearOverview.favorable}</strong>
          <ul>
            {favorable.map((item) => (
              <li key={item}>{substituteConcernPlaceholder(item, label)}</li>
            ))}
          </ul>
        </section>
        <section>
          <strong>{NIANJING_COPY.yearOverview.guarded}</strong>
          <ul>
            {guarded.map((item) => (
              <li key={item}>{substituteConcernPlaceholder(item, label)}</li>
            ))}
          </ul>
        </section>
      </div>

      <MonthMarkers
        card={props.card}
        tag={props.tag}
        onSelectDetail={props.onSelectDetail}
      />
    </article>
  );
}

function MonthMarkers(props: {
  readonly card: NianJingSelectedYearConcernCard;
  readonly tag: ConcernTag | null;
  readonly onSelectDetail: (selection: SelectedDetail) => void;
}) {
  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  // Footer note restates the year's inflection markers in plain text
  // (e.g. "3月 大运边界 · 9月 流年切换"). Pulled from the same
  // inflection points as the cells — no invented copy.
  const tipLine =
    props.card.month_markers.length > 0
      ? props.card.month_markers
          .map((marker) => `${marker.month}月 ${INFLECTION_KIND_LABELS[marker.kind]}`)
          .join('　·　')
      : NIANJING_COPY.yearOverview.noNodes;
  return (
    <div className="shijing-nianjing__year-months" aria-label={NIANJING_COPY.yearOverview.monthNodes}>
      <strong>{NIANJING_COPY.yearOverview.monthNodes}</strong>
      <div>
        {months.map((month) => {
          const marker = props.card.month_markers.find((item) => item.month === month) ?? null;
          const active = primaryMonthActive(props.card.primary_segment, month);
          if (marker && props.tag) {
            const tag = props.tag;
            const kindLabel = INFLECTION_KIND_LABELS[marker.kind];
            return (
              <button
                type="button"
                key={month}
                data-active={active ? 'true' : undefined}
                data-marker="true"
                aria-label={`${props.card.year} 年 ${month} 月 ${kindLabel}`}
                onClick={() =>
                  props.onSelectDetail({
                    kind: 'inflection',
                    inflection: marker.inflection,
                    tag,
                  })
                }
              >
                {month}
              </button>
            );
          }
          return (
            <span
              key={month}
              data-active={active ? 'true' : undefined}
              aria-label={`${props.card.year} 年 ${month} 月`}
            >
              {month}
            </span>
          );
        })}
      </div>
      <small className="shijing-nianjing__year-months-tip">{tipLine}</small>
    </div>
  );
}
