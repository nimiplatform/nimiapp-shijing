import type { YueJingCell, TendencyClass } from '../../../domain/mirror-output.ts';
import type { ConcernTag } from '../../../domain/concern-tag.ts';
import { TENDENCY_CLASS_LABELS } from '../../i18n/copy.ts';
import { trimmedConcernLabel as yuejingTagLabel } from '../../concern-tags/concern-presets.ts';
import { dominantTendency, shortMonthDay, TODAY_BODY_BY_TENDENCY, WEEKDAY_SHORT, weekdayIndexMondayFirst } from './yuejing-model.ts';
import { YUEJING_COPY } from './yuejing-copy.ts';

export function YueJingTodayHero(props: {
  readonly date: string;
  readonly cellsForToday: readonly YueJingCell[];
  readonly activeTags: readonly ConcernTag[];
  readonly onOpenDetails: () => void;
}) {
  const dominant = dominantTendency(props.cellsForToday);
  const tendencyLabel = TENDENCY_CLASS_LABELS[dominant];
  const body = TODAY_BODY_BY_TENDENCY[dominant];
  const weekday = WEEKDAY_SHORT[weekdayIndexMondayFirst(props.date)];

  return (
    <article
      className="shijing-yuejing__hero"
      data-tendency={dominant}
      aria-label={YUEJING_COPY.todayHero.ariaLabel}
    >
      <div className="shijing-yuejing__hero-headline">
        <span className="shijing-yuejing__hero-eyebrow">{YUEJING_COPY.todayHero.eyebrow}</span>
        <div className="shijing-yuejing__hero-tendency">
          <strong>{tendencyLabel}</strong>
          <small>{shortMonthDay(props.date)} · {weekday}</small>
        </div>
        <p className="shijing-yuejing__hero-body">{body}</p>
      </div>
      <ul className="shijing-yuejing__hero-rows" aria-label={YUEJING_COPY.todayHero.rowsAriaLabel}>
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
                  {YUEJING_COPY.todayHero.pending}
                </span>
              </li>
            );
          }
          const tendency: TendencyClass = cell.tendency_class;
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
            </li>
          );
        })}
        <li className="shijing-yuejing__hero-action-row">
          <button
            type="button"
            className="shijing-yuejing__hero-detail-button"
            onClick={props.onOpenDetails}
          >
            {YUEJING_COPY.todayHero.detailButton}
          </button>
        </li>
      </ul>
    </article>
  );
}
