// 命镜 · 大运结构 — the full DaYun arc as a scrollable timeline of period cards:
// 干支, age/year span, 十神, 十二长生, 用神 nature, 转折 / 当前 markers, and the
// 大运支 ↔ natal-branch relations. Pure display over MingJingChart.dayun.

import { useEffect, useMemo, useState } from 'react';
import { useProductCopy } from '../../i18n/copy.ts';
import type { DayunPeriodFeature, DayunStructure } from '../../../domain/mingjing.ts';
import type { PillarPosition } from '../../../domain/algorithm.ts';
import { pillarHanzi, STEM_ELEMENT } from './ganzhi-hanzi.ts';
import { MingJingInfo } from './mingjing-info.tsx';

const SHORT_POS: Readonly<Record<PillarPosition, string>> = { year: '年', month: '月', day: '日', hour: '时' };
const DISTANT_DAYUN_START_AGE = 90;

export function MingJingDayun({ dayun }: { readonly dayun: DayunStructure }) {
  const copy = useProductCopy();
  const d = copy.mingjing.dayun;
  const tendencyLabels = copy.tendencyClassLabels;

  const currentIndex = useMemo(
    () => dayun.periods.findIndex((period) => period.is_current),
    [dayun.periods],
  );
  // 高光 = the first 助力 (supportive) period strictly after the current one — the
  // peak the intro points the user toward. If none is current yet, take the first
  // supportive period overall. -1 when there is no upcoming supportive phase.
  const highlightIndex = useMemo(() => {
    const from = currentIndex >= 0 ? currentIndex + 1 : 0;
    for (let i = from; i < dayun.periods.length; i += 1) {
      if (dayun.periods[i]?.nature === 'supportive') return i;
    }
    return -1;
  }, [dayun.periods, currentIndex]);

  const currentPeriod = currentIndex >= 0 ? dayun.periods[currentIndex] : undefined;
  const highlightPeriod = highlightIndex >= 0 ? dayun.periods[highlightIndex] : undefined;
  const currentNatureKey = currentPeriod?.nature ?? null;
  const currentStartYear = currentPeriod?.start_year ?? dayun.periods[0]?.start_year ?? null;
  const distantStartIndex = dayun.periods.findIndex((period) => period.start_age >= DISTANT_DAYUN_START_AGE);
  const regularPeriods = distantStartIndex >= 0 ? dayun.periods.slice(0, distantStartIndex) : dayun.periods;
  const distantPeriods = distantStartIndex >= 0 ? dayun.periods.slice(distantStartIndex) : [];

  const [expandedStartYear, setExpandedStartYear] = useState<number | null>(currentStartYear);

  useEffect(() => {
    setExpandedStartYear(currentStartYear);
  }, [currentStartYear]);

  const introSegments = d.introSegments({
    currentNatureLabel: currentPeriod ? tendencyLabels[currentPeriod.nature] : null,
    highlightAge: highlightPeriod?.start_age ?? null,
  });

  const renderPeriodRow = (period: DayunPeriodFeature, index: number) => {
    const natureLabel = tendencyLabels[period.nature];
    const expanded = expandedStartYear === period.start_year;
    const nextPeriod = dayun.periods[index + 1];
    const distant = period.start_age >= DISTANT_DAYUN_START_AGE;

    return (
      <DayunRow
        key={period.start_year}
        index={index}
        period={period}
        d={d}
        natureLabel={natureLabel}
        distant={distant}
        expanded={expanded}
        onToggle={() => setExpandedStartYear(expanded ? null : period.start_year)}
        explanation={d.periodExplanation({
          tenGod: period.stem_ten_god,
          nature: natureLabel,
          favor: period.favor,
          terrain: period.terrain,
          current: period.is_current,
          ...(nextPeriod ? { nextStartAge: nextPeriod.start_age } : {}),
          ...relationTextFor(period),
        })}
      />
    );
  };

  return (
    <section className="shijing-mingjing-panel shijing-mingjing-dayun" aria-label={d.sectionTitle}>
      <header className="shijing-mingjing-panel__head">
        <div className="shijing-mingjing-panel__title-row">
          <h2 className="shijing-mingjing-panel__title">{d.sectionTitle}</h2>
          <MingJingInfo label={`${d.sectionTitle}说明`}>
            <p>{d.explanation}</p>
            <p>
              {d.directionLabels[dayun.direction]} · {d.startAge(dayun.start_age_years.toFixed(1))}
            </p>
          </MingJingInfo>
        </div>
        <p className="shijing-mingjing-panel__intro shijing-dayun__intro">
          {introSegments.map((seg, i) =>
            seg.tone ? (
              <strong
                key={i}
                className="shijing-dayun__intro-mark"
                data-tone={seg.tone}
                data-nature={seg.tone === 'current' ? (currentNatureKey ?? undefined) : undefined}
              >
                {seg.text}
              </strong>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
        </p>
      </header>

      <DayunTimeline
        periods={dayun.periods}
        currentIndex={currentIndex}
        highlightIndex={highlightIndex}
        currentLabel={d.current}
        highlightLabel={d.highlightLabel}
        tendencyLabels={tendencyLabels}
      />

      <div className="shijing-dayun__matrix-head" aria-hidden="true">
        <span>{d.cols.pillar}</span>
        <span>
          {d.cols.age} / {d.cols.years} / {d.cols.tenGod} / {d.cols.terrain}
        </span>
        <span>{d.cols.nature}</span>
        <span />
      </div>

      <ol className="shijing-dayun__list">
        {regularPeriods.map(renderPeriodRow)}
        {distantPeriods.length > 0 ? (
          <li className="shijing-dayun__distant-shell">
            <details className="shijing-dayun__distant-group">
              <summary className="shijing-dayun__distant-toggle">
                <span className="shijing-dayun__distant-copy">
                  <strong>{d.distantTitle}</strong>
                  <span>{d.distantDescription}</span>
                </span>
                <span className="shijing-dayun__distant-chevron" aria-hidden>›</span>
              </summary>
              <ol className="shijing-dayun__distant-list">
                {distantPeriods.map((period, index) => renderPeriodRow(period, distantStartIndex + index))}
              </ol>
            </details>
          </li>
        ) : null}
      </ol>
    </section>
  );
}

// A compact at-a-glance strip of every 大运 phase: one nature-coloured segment per
// decade, the 高光 peak relabelled, and a 你在这里 marker over the current phase.
// aria-hidden because the expandable card list below carries the same data fully.
function DayunTimeline({
  periods,
  currentIndex,
  highlightIndex,
  currentLabel,
  highlightLabel,
  tendencyLabels,
}: {
  readonly periods: readonly DayunPeriodFeature[];
  readonly currentIndex: number;
  readonly highlightIndex: number;
  readonly currentLabel: string;
  readonly highlightLabel: string;
  readonly tendencyLabels: ReturnType<typeof useProductCopy>['tendencyClassLabels'];
}) {
  return (
    <ol className="shijing-dayun__timeline" aria-hidden="true">
      {periods.map((period, index) => {
        const isCurrent = index === currentIndex;
        const isHighlight = index === highlightIndex;

        return (
          <li
            key={period.start_year}
            className="shijing-dayun__seg"
            data-nature={period.nature}
            data-current={isCurrent ? '' : undefined}
            data-highlight={isHighlight ? '' : undefined}
          >
            {isCurrent ? <span className="shijing-dayun__seg-here">{currentLabel}</span> : null}
            <span className="shijing-dayun__seg-bar">
              <span className="shijing-dayun__seg-label">
                {isHighlight ? highlightLabel : tendencyLabels[period.nature]}
              </span>
            </span>
            <span className="shijing-dayun__seg-age">
              {period.start_age}–{period.end_age}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function DayunRow({
  index,
  period,
  d,
  natureLabel,
  distant,
  expanded,
  onToggle,
  explanation,
}: {
  readonly index: number;
  readonly period: DayunPeriodFeature;
  readonly d: ReturnType<typeof useProductCopy>['mingjing']['dayun'];
  readonly natureLabel: string;
  readonly distant: boolean;
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly explanation: string;
}) {
  const phaseTitle = d.phaseTitle(index, period.is_current);
  const contentId = `shijing-dayun-${period.start_year}`;

  return (
    <li
      className="shijing-dayun__row"
      data-nature={period.nature}
      data-favor={period.favor}
      data-current={period.is_current ? '' : undefined}
      data-inflection={period.is_inflection ? '' : undefined}
      data-distant={distant ? '' : undefined}
      data-expanded={expanded ? '' : undefined}
    >
      <button
        type="button"
        className="shijing-dayun__row-toggle"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={onToggle}
      >
        <span className="shijing-dayun__identity">
          <span className="shijing-dayun__pillar" data-element={STEM_ELEMENT[period.pillar.stem]}>
            {pillarHanzi(period.pillar)}
          </span>
        </span>
        <span className="shijing-dayun__row-copy">
          <span className="shijing-dayun__row-title">
            <span className="shijing-dayun__stage-title">{phaseTitle}</span>
            <span className="shijing-dayun__technical">
              <span className="shijing-dayun__term-grid">
                <span className="shijing-dayun__term">
                  <small>{d.cols.age}</small>
                  {d.ageRange(period.start_age, period.end_age)}
                </span>
                <span className="shijing-dayun__term">
                  <small>{d.cols.years}</small>
                  {d.yearRange(period.start_year, period.end_year)}
                </span>
                <span className="shijing-dayun__term">
                  <small>{d.cols.tenGod}</small>
                  {period.stem_ten_god}
                </span>
                <span className="shijing-dayun__term">
                  <small>{d.cols.terrain}</small>
                  {d.terrainLabel(period.terrain)}
                </span>
              </span>
            </span>
          </span>
        </span>
        <span className="shijing-dayun__row-nature" data-favor={period.favor}>
          <span className="shijing-dayun__nature-dot" aria-hidden />
          {natureLabel}
        </span>
        <span className="shijing-dayun__chevron" aria-hidden>
          {expanded ? '⌄' : '›'}
        </span>
      </button>
      <div id={contentId} className="shijing-dayun__explanation" hidden={!expanded}>
        <p>{explanation}</p>
      </div>
    </li>
  );
}

function relationTextFor(period: DayunPeriodFeature): { readonly relationText?: string } {
  if (period.natal_branch_relations.length === 0) return {};

  return {
    relationText: period.natal_branch_relations
      .map((rel) => `${rel.kind}${rel.positions.map((p) => SHORT_POS[p]).join('')}`)
      .join('、'),
  };
}
