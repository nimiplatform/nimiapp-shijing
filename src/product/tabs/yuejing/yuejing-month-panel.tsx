import { useEffect, useMemo } from 'react';
import { Tooltip } from '@nimiplatform/kit/ui';
import type { YueJingCell } from '../../../domain/mirror-output.ts';
import type { ConcernTag } from '../../../domain/concern-tag.ts';
import type { EventMemory } from '../../../domain/event-memory.ts';
import type { PlanItem } from '../../../domain/plan-item.ts';
import { TENDENCY_CLASS_LABELS } from '../../i18n/copy.ts';
import { deriveYueJingMonthInterpretation, YUEJING_MONTH_TENDENCY_CLASSES } from '../yuejing-month-interpretation.ts';
import { ConcernIcon, concernIconStyle } from './yuejing-calendar.tsx';
import { CloseIcon } from './yuejing-icons.tsx';
import { CheckIcon, MonthPhaseGlyph, MonthTendencyGlyph, MonthWindowGlyph } from './yuejing-month-glyphs.tsx';
import { YUEJING_COPY } from './yuejing-copy.ts';

export function YueJingMonthPanel(props: {
  readonly dates: readonly string[];
  readonly cellsByDate: ReadonlyMap<string, readonly YueJingCell[]>;
  readonly activeTags: readonly ConcernTag[];
  readonly eventMemories: readonly EventMemory[];
  readonly planItems: readonly PlanItem[];
  readonly onClose: () => void;
  readonly onHighlightDates?: (dates: readonly string[]) => void;
  readonly onSelectDate?: (date: string) => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') props.onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [props.onClose]);

  const interpretation = useMemo(
    () => deriveYueJingMonthInterpretation({
      dates: props.dates,
      cellsByDate: props.cellsByDate,
      activeTags: props.activeTags,
      eventMemories: props.eventMemories,
      planItems: props.planItems,
    }),
    [props.activeTags, props.cellsByDate, props.dates, props.eventMemories, props.planItems],
  );
  const hasGeneratedCells = interpretation.generated_day_count > 0;

  function highlightDates(dates: readonly string[]) {
    if (dates.length === 0) return;
    props.onHighlightDates?.(dates);
  }

  function selectActionDate(dates: readonly string[]) {
    if (dates.length === 0) return;
    props.onHighlightDates?.(dates);
    const firstDate = dates[0];
    if (firstDate) props.onSelectDate?.(firstDate);
  }

  return (
    <>
      <div
        className="shijing-yuejing__panel-backdrop"
        onClick={props.onClose}
        role="presentation"
        aria-hidden
      />
      <aside
        className="shijing-yuejing__panel shijing-yuejing__month-panel"
        role="dialog"
        aria-modal="true"
        aria-label={YUEJING_COPY.monthPanel.ariaLabel(interpretation.range_label)}
        data-panel-kind="month"
      >
        <button
          type="button"
          className="shijing-yuejing__panel-close"
          onClick={props.onClose}
          aria-label={YUEJING_COPY.monthPanel.close}
        >
          <CloseIcon />
        </button>

        <header className="shijing-yuejing__panel-head shijing-yuejing__month-head">
          <strong>{YUEJING_COPY.monthPanel.title}</strong>
          <small>
            {YUEJING_COPY.monthPanel.meta(
              interpretation.range_label,
              interpretation.generated_day_count,
              interpretation.active_tag_count,
            )}
          </small>
        </header>

        {!hasGeneratedCells ? (
          <div className="shijing-yuejing__month-empty">
            {YUEJING_COPY.monthPanel.empty}
          </div>
        ) : (
          <>
            <p className="shijing-yuejing__month-action-notice">
              <span aria-hidden>
                <MonthWindowGlyph index={0} />
              </span>
              {YUEJING_COPY.monthPanel.actionNotice}
            </p>

            <section className="shijing-yuejing__month-section" aria-label={YUEJING_COPY.monthPanel.conclusion}>
              <h3>
                <span className="shijing-yuejing__month-num" aria-hidden>1</span>
                {YUEJING_COPY.monthPanel.conclusion}
              </h3>
              <div className="shijing-yuejing__month-conclusion">
                <article className="shijing-yuejing__month-primary" data-tendency={interpretation.primary}>
                  <div className="shijing-yuejing__month-primary-head">
                    <span className="shijing-yuejing__month-primary-icon" aria-hidden>
                      <MonthTendencyGlyph tendency={interpretation.primary} />
                    </span>
                    <strong className="shijing-yuejing__month-primary-label">
                      {TENDENCY_CLASS_LABELS[interpretation.primary]}
                    </strong>
                  </div>
                  <p className="shijing-yuejing__month-primary-body">{interpretation.mainline.body}</p>
                  <div className="shijing-yuejing__month-tag-groups">
                    <div>
                      <span>{YUEJING_COPY.monthPanel.bestFor}</span>
                      <ul>
                        {interpretation.mainline.best_for.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div data-kind="avoid">
                      <span>{YUEJING_COPY.monthPanel.avoid}</span>
                      <ul>
                        {interpretation.mainline.avoid_tags.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
                <article className="shijing-yuejing__month-distribution">
                  <h4>{YUEJING_COPY.monthPanel.distribution}</h4>
                  <ul>
                    {YUEJING_MONTH_TENDENCY_CLASSES.map((tendency) => (
                      <li key={tendency} data-tendency={tendency}>
                        <span className="shijing-yuejing__month-stat-dot" aria-hidden />
                        <span>{TENDENCY_CLASS_LABELS[tendency]}</span>
                        <strong>{interpretation.day_counts[tendency]} {YUEJING_COPY.monthPanel.dayUnit}</strong>
                      </li>
                    ))}
                  </ul>
                </article>
              </div>
            </section>

            <section className="shijing-yuejing__month-section" aria-label={YUEJING_COPY.monthPanel.keyWindows}>
              <h3>
                <span className="shijing-yuejing__month-num" aria-hidden>2</span>
                {YUEJING_COPY.monthPanel.keyWindows}
              </h3>
              <ul className="shijing-yuejing__month-windows-grid">
                {interpretation.key_windows.map((window, index) => (
                  <li key={window.title} data-tendency={window.tendency ?? 'steady'}>
                    <button
                      type="button"
                      onClick={() => highlightDates(window.target_dates)}
                      aria-label={`${window.title} ${window.window}`}
                    >
                      <span className="shijing-yuejing__month-window-icon" aria-hidden>
                        <MonthWindowGlyph index={index} />
                      </span>
                      <strong>{window.title}</strong>
                      <span className="shijing-yuejing__month-window-dates">
                        {window.date_ranges.map((range) => (
                          <span key={`${window.title}-${range.label}`}>{range.label}</span>
                        ))}
                      </span>
                      <p>{window.brief}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="shijing-yuejing__month-section" aria-label={YUEJING_COPY.monthPanel.concernActions}>
              <h3>
                <span className="shijing-yuejing__month-num" aria-hidden>3</span>
                {YUEJING_COPY.monthPanel.concernActions}
              </h3>
              <ul className="shijing-yuejing__month-concerns">
                {interpretation.concern_interpretations.map((insight) => {
                  const tagName = insight.tag_label;
                  const iconStyle = concernIconStyle(insight.tag.label ?? tagName);
                  return (
                    <li key={insight.tag.id} data-primary={insight.primary}>
                      <div className="shijing-yuejing__month-concern-head">
                        <ConcernIcon style={iconStyle} />
                        <div>
                          <strong>{tagName}</strong>
                          {insight.has_cells ? (
                            <span className="shijing-yuejing__month-concern-axis">{YUEJING_COPY.monthPanel.primaryAxis(insight.axis)}</span>
                          ) : (
                            <span className="shijing-yuejing__month-concern-axis" data-pending="true">{YUEJING_COPY.monthPanel.notGenerated}</span>
                          )}
                        </div>
                      </div>
                      {insight.has_cells ? (
                        <>
                          <p className="shijing-yuejing__month-concern-summary">{insight.summary}</p>
                          <div className="shijing-yuejing__month-concern-checklist">
                            <h5>{YUEJING_COPY.monthPanel.checklist}</h5>
                            <ul>
                              {insight.action_items.map((item) => (
                                <li key={`${insight.tag.id}-${item.window}-${item.label}`}>
                                  <button type="button" onClick={() => selectActionDate(item.target_dates)}>
                                    <span className="shijing-yuejing__month-check" aria-hidden>
                                      <CheckIcon />
                                    </span>
                                    <span>
                                      <strong>{item.window}</strong>
                                      {item.label}
                                    </span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <ul className="shijing-yuejing__month-reminders" aria-label={`${tagName} 行动提醒`}>
                            {insight.reminders.map((item) => (
                              <li key={`${insight.tag.id}-${item}`}>{item}</li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <p className="shijing-yuejing__month-concern-summary">
                          {YUEJING_COPY.monthPanel.pendingConcernBody}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>

            <section
              className="shijing-yuejing__month-section shijing-yuejing__month-more"
              aria-label={YUEJING_COPY.monthPanel.supplementaryAriaLabel}
            >
              <div className="shijing-yuejing__month-accordion-list">
                <details className="shijing-yuejing__month-accordion">
                  <summary>
                    <span className="shijing-yuejing__month-accordion-icon" aria-hidden>
                      <MonthPhaseGlyph index={0} />
                    </span>
                    {YUEJING_COPY.monthPanel.rhythm}
                    <span className="shijing-yuejing__month-accordion-chevron" aria-hidden>›</span>
                  </summary>
                  <ol className="shijing-yuejing__month-timeline">
                    {interpretation.phases.map((phase, index) => (
                      <li key={`${phase.title}-${phase.window}`} data-tendency={phase.tendency}>
                        <span className="shijing-yuejing__month-timeline-icon" aria-hidden>
                          <MonthPhaseGlyph index={index} />
                        </span>
                        <div className="shijing-yuejing__month-timeline-card">
                          <header>
                            <strong>{phase.title} {phase.name}</strong>
                            <span>{phase.window}</span>
                          </header>
                          <dl className="shijing-yuejing__month-timeline-meta">
                            <div>
                              <dt>{YUEJING_COPY.monthPanel.theme}</dt>
                              <dd>{phase.theme}</dd>
                            </div>
                            <div>
                              <dt>{YUEJING_COPY.monthPanel.suitable}</dt>
                              <dd>{phase.suitable}</dd>
                            </div>
                            <div data-kind="avoid">
                              <dt>{YUEJING_COPY.monthPanel.unsuitable}</dt>
                              <dd>{phase.unsuitable}</dd>
                            </div>
                          </dl>
                        </div>
                      </li>
                    ))}
                  </ol>
                </details>

                <details className="shijing-yuejing__month-accordion">
                  <summary>
                    <span className="shijing-yuejing__month-accordion-icon" aria-hidden>
                      <MonthTendencyGlyph tendency={interpretation.primary} />
                    </span>
                    {YUEJING_COPY.monthPanel.dailyDistribution}
                    <span className="shijing-yuejing__month-accordion-chevron" aria-hidden>›</span>
                  </summary>
                  <ul className="shijing-yuejing__month-stats" aria-label={YUEJING_COPY.monthPanel.rhythmDistribution}>
                    {YUEJING_MONTH_TENDENCY_CLASSES.map((tendency) => (
                      <li key={tendency} data-tendency={tendency}>
                        <span className="shijing-yuejing__month-stat-head">
                          <span className="shijing-yuejing__month-stat-dot" aria-hidden />
                          {TENDENCY_CLASS_LABELS[tendency]}
                          <strong>{interpretation.day_counts[tendency]} {YUEJING_COPY.monthPanel.dayUnit}</strong>
                        </span>
                        <span className="shijing-yuejing__month-stat-bar" aria-hidden>
                          <i
                            style={{
                              width: `${Math.round(
                                (interpretation.day_counts[tendency] / interpretation.generated_day_count) * 100,
                              )}%`,
                            }}
                          />
                        </span>
                      </li>
                    ))}
                  </ul>
                  <ol
                    className="shijing-yuejing__month-rhythm-grid"
                    aria-label={YUEJING_COPY.monthPanel.dailyRhythmAriaLabel(interpretation.range_label)}
                  >
                    {interpretation.day_series.map((day) => {
                      const tooltip = `${Number(day.date.slice(5, 7))}/${Number(day.date.slice(8, 10))}${day.tendency ? ` · ${TENDENCY_CLASS_LABELS[day.tendency]}` : ` · ${YUEJING_COPY.monthPanel.pending}`}`;
                      return (
                        <li
                          key={day.date}
                          data-tendency={day.tendency ?? 'empty'}
                        >
                          <Tooltip
                            content={tooltip}
                            placement="top"
                            className="shijing-yuejing__month-rhythm-cell"
                          >
                            <span aria-hidden />
                          </Tooltip>
                        </li>
                      );
                    })}
                  </ol>
                  <div className="shijing-yuejing__month-rhythm-axis" aria-hidden>
                    <span>{interpretation.start_label}</span>
                    <span>{interpretation.end_label}</span>
                  </div>
                </details>

                <details className="shijing-yuejing__month-accordion">
                  <summary>
                    <span className="shijing-yuejing__month-accordion-icon" aria-hidden>
                      <CheckIcon />
                    </span>
                    {YUEJING_COPY.monthPanel.evidence}
                    <span className="shijing-yuejing__month-accordion-chevron" aria-hidden>›</span>
                  </summary>
                  <ul className="shijing-yuejing__month-evidence-list">
                    {interpretation.basis_items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <ul className="shijing-yuejing__month-counts" aria-label={YUEJING_COPY.monthPanel.monthTendencyCountsAriaLabel}>
                    {YUEJING_MONTH_TENDENCY_CLASSES.filter((tendency) => interpretation.counts[tendency] > 0).map((tendency) => (
                      <li key={tendency} data-tendency={tendency}>
                        <span className="shijing-yuejing__panel-tend-dot" aria-hidden />
                        {TENDENCY_CLASS_LABELS[tendency]} {interpretation.counts[tendency]} {YUEJING_COPY.monthPanel.countUnit}
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            </section>
          </>
        )}
      </aside>
    </>
  );
}
