import { useMemo } from 'react';
import type { YueJingCell } from '../../../domain/mirror-output.ts';
import { TENDENCY_CLASS_LABELS } from '../../i18n/copy.ts';
import { useShijingStore } from '../../state/shijing-store.tsx';
import {
  classifyDay,
  dayOfMonth,
  deriveYueJingLunisolarMarker,
  dominantTendency,
  WEEKDAY_HEADERS,
  WEEKDAY_SHORT,
  weekdayIndexMondayFirst,
} from './yuejing-model.ts';
import { YUEJING_COPY } from './yuejing-copy.ts';

export interface YueJingCalendarProps {
  readonly cellsByDate: Map<string, readonly YueJingCell[]>;
  readonly today: string;
  readonly selectedDate: string | null;
  readonly highlightedDates?: readonly string[];
  readonly onSelectDate: (date: string | null) => void;
}

export function YueJingCalendar(props: YueJingCalendarProps) {
  const dates = useMemo(
    () => Array.from(props.cellsByDate.keys()).sort(),
    [props.cellsByDate],
  );
  const highlightedDateSet = useMemo(
    () => new Set(props.highlightedDates ?? []),
    [props.highlightedDates],
  );
  if (dates.length === 0) {
    return (
      <p className="shijing-yuejing__notice" role="status">
        {YUEJING_COPY.calendar.emptyNotice}
      </p>
    );
  }
  const firstWeekday = weekdayIndexMondayFirst(dates[0] as string);
  const lastWeekday = weekdayIndexMondayFirst(dates[dates.length - 1] as string);
  const leadingBlanks = firstWeekday;
  const trailingBlanks = 6 - lastWeekday;

  return (
    <section className="shijing-yuejing__calendar" aria-label={YUEJING_COPY.calendar.ariaLabel}>
      <ol className="shijing-yuejing__weekday-row" aria-hidden>
        {WEEKDAY_HEADERS.map((label) => (
          <li key={label}>{label}</li>
        ))}
      </ol>
      <div className="shijing-yuejing__grid" role="grid" aria-label={YUEJING_COPY.calendar.gridAriaLabel}>
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
              highlighted={highlightedDateSet.has(date)}
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
  readonly highlighted: boolean;
  readonly onToggle: () => void;
}

function YueJingDayCard(props: YueJingDayCardProps) {
  const { state } = useShijingStore();
  const kind = classifyDay(props.date, props.today);
  const isEmpty = props.entries.length === 0;
  const dominant = isEmpty ? null : dominantTendency(props.entries);
  const weekday = WEEKDAY_SHORT[weekdayIndexMondayFirst(props.date)];
  const dayNum = dayOfMonth(props.date);
  const marker = deriveYueJingLunisolarMarker(props.date);

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
      data-window-highlighted={props.highlighted}
      data-date={props.date}
    >
      <button
        type="button"
        className="shijing-yuejing__day-face"
        onClick={props.onToggle}
        aria-expanded={props.selected}
        aria-label={YUEJING_COPY.calendar.dayAriaLabel(
          props.date,
          marker?.label ?? null,
          dominant ? TENDENCY_CLASS_LABELS[dominant] : null,
        )}
      >
        <span className="shijing-yuejing__day-weekday">{weekday}</span>
        {kind === 'today' ? (
          <span className="shijing-yuejing__day-today-badge">{YUEJING_COPY.calendar.today}</span>
        ) : hasEntries ? (
          <span className="shijing-yuejing__day-edit-mark" aria-label={YUEJING_COPY.calendar.hasRecordAriaLabel}>✎</span>
        ) : null}
        <span className="shijing-yuejing__day-number">
          <span className="shijing-yuejing__day-number-value">{dayNum}</span>
          {marker ? (
            <span
              className="shijing-yuejing__day-lunisolar"
              data-marker-kind={marker.kind}
            >
              {marker.label}
            </span>
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

export function concernIconStyle(label: string): ConcernIconStyle {
  const clean = label.replace(/^#/, '');
  return (
    CONCERN_ICON_STYLE[clean] ?? { bg: '#E4E4E4', fg: '#8B8B8B', kind: 'dot' }
  );
}

export function ConcernIcon({ style }: { readonly style: ConcernIconStyle }) {
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
