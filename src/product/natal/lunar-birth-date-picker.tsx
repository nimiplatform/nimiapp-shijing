import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { LunarDay, LunarHour, LunarYear } from 'tyme4ts';
import { DRUM_ITEM_H, DrumColumn } from './drum-column.tsx';
import { useProductCopy, type ProductCopy } from '../i18n/copy.ts';

const DEFAULT_MIN_YEAR = 1900;
const WHEEL_ROWS = 5;
const PANEL_HEIGHT = 340;

type LunarLeapState = 'normal' | 'leap';

interface PanelPosition {
  readonly left: number;
  readonly top: number;
  readonly width: number;
}

interface LunarSelection {
  readonly year: number;
  readonly monthWithLeap: number;
  readonly day: number;
}

interface LunarMonthOption {
  readonly value: number;
  readonly month: number;
  readonly isLeap: boolean;
  readonly label: string;
  readonly dayCount: number;
}

export interface LunarBirthDateChange {
  readonly local_date_text: string;
  readonly lunar_year: string;
  readonly lunar_month: string;
  readonly lunar_day: string;
  readonly lunar_is_leap_month: LunarLeapState;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function pad4(n: number): string {
  const s = String(n);
  return s.length >= 4 ? s : '0'.repeat(4 - s.length) + s;
}

function todayAtNoon(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
}

function formatIsoDate(date: Date): string {
  return `${pad4(date.getFullYear())}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function compareIsoDate(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function years(minYear: number, maxYear: number): number[] {
  const start = Math.min(minYear, maxYear);
  return Array.from({ length: maxYear - start + 1 }, (_, i) => start + i);
}

function getPanelPosition(
  anchorRef: RefObject<HTMLDivElement | null>,
  minimumWidth: number,
  panelHeight: number,
): PanelPosition | null {
  const el = anchorRef.current;
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const width = Math.min(Math.max(rect.width, minimumWidth), window.innerWidth - 16);
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
  const below = rect.bottom + 6;
  const top =
    below + panelHeight <= window.innerHeight - 8
      ? below
      : Math.max(8, rect.top - panelHeight - 6);
  return { left, top, width };
}

function safeLunarYear(year: number): LunarYear | null {
  try {
    return LunarYear.fromYear(year);
  } catch {
    return null;
  }
}

function lunarMonthOptions(year: number): LunarMonthOption[] {
  const lunarYear = safeLunarYear(year);
  if (!lunarYear) return [];
  return lunarYear.getMonths().map((month) => ({
    value: month.getMonthWithLeap(),
    month: month.getMonth(),
    isLeap: month.isLeap(),
    label: month.getName(),
    dayCount: month.getDayCount(),
  }));
}

function monthOption(year: number, monthWithLeap: number): LunarMonthOption | null {
  return lunarMonthOptions(year).find((option) => option.value === monthWithLeap) ?? null;
}

function lunarDayLabel(year: number, monthWithLeap: number, day: number): string {
  try {
    return LunarDay.fromYmd(year, monthWithLeap, day).getName();
  } catch {
    return String(day);
  }
}

function lunarYearCycle(year: number): string {
  try {
    return LunarYear.fromYear(year).getSixtyCycle().getName();
  } catch {
    return '';
  }
}

function lunarToGregorianDate(selection: LunarSelection): string | null {
  try {
    const solarDay = LunarHour.fromYmdHms(
      selection.year,
      selection.monthWithLeap,
      selection.day,
      0,
      0,
      0,
    ).getSolarTime().getSolarDay();
    return `${pad4(solarDay.getYear())}-${pad2(solarDay.getMonth())}-${pad2(solarDay.getDay())}`;
  } catch {
    return null;
  }
}

function parseLunarSelection(
  yearText: string,
  monthText: string,
  dayText: string,
  leapState: string,
): LunarSelection | null {
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  const monthWithLeap = leapState === 'leap' ? -month : month;
  const option = monthOption(year, monthWithLeap);
  if (!option || day < 1 || day > option.dayCount) return null;
  const solarDate = lunarToGregorianDate({ year, monthWithLeap, day });
  if (!solarDate) return null;
  return { year, monthWithLeap, day };
}

function normalizeLunar(selection: LunarSelection): LunarSelection {
  const options = lunarMonthOptions(selection.year);
  const matched =
    options.find((option) => option.value === selection.monthWithLeap)
    ?? options.find((option) => option.month === Math.abs(selection.monthWithLeap) && !option.isLeap)
    ?? options[0];
  if (!matched) return selection;
  return {
    year: selection.year,
    monthWithLeap: matched.value,
    day: Math.max(1, Math.min(selection.day, matched.dayCount)),
  };
}

function fallbackLunarSelection(minYear: number, maxYear: number): LunarSelection {
  const year = Math.min(Math.max(1987, minYear), maxYear);
  return normalizeLunar({ year, monthWithLeap: 1, day: 1 });
}

function lunarDisplay(selection: LunarSelection | null, copy: ProductCopy['lunarDatePicker']): string {
  if (!selection) return '';
  const option = monthOption(selection.year, selection.monthWithLeap);
  if (!option) return '';
  return `${copy.yearLabel(selection.year, lunarYearCycle(selection.year))} / ${copy.monthLabel(option.label, option.month, option.isLeap)} / ${copy.dayLabel(lunarDayLabel(selection.year, selection.monthWithLeap, selection.day), selection.day)}`;
}

function CalendarIcon({ size = 16, className }: { readonly size?: number; readonly className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

interface LunarPanelProps {
  readonly panelId: string;
  readonly anchorRef: RefObject<HTMLDivElement | null>;
  readonly open: boolean;
  readonly value: LunarSelection | null;
  readonly minYear: number;
  readonly maxYear: number;
  readonly maxGregorianDate: string;
  readonly allowClear: boolean;
  readonly onCommit: (value: LunarBirthDateChange) => void;
  readonly onClear: () => void;
}

const LunarBirthDatePanel = forwardRef<HTMLDivElement, LunarPanelProps>(
  function LunarBirthDatePanel(
    { panelId, anchorRef, open, value, minYear, maxYear, maxGregorianDate, allowClear, onCommit, onClear },
    ref,
  ) {
    const copy = useProductCopy().lunarDatePicker;
    const [pos, setPos] = useState<PanelPosition | null>(null);
    const [draft, setDraft] = useState<LunarSelection>(() => value ?? fallbackLunarSelection(minYear, maxYear));
    const monthOptions = lunarMonthOptions(draft.year);
    const selectedMonth = monthOption(draft.year, draft.monthWithLeap) ?? monthOptions[0];
    const dayItems = selectedMonth ? Array.from({ length: selectedMonth.dayCount }, (_, i) => i + 1) : [1];
    const gregorianDate = lunarToGregorianDate(draft);
    const isFuture = gregorianDate ? compareIsoDate(gregorianDate, maxGregorianDate) > 0 : true;

    useEffect(() => {
      const update = () => setPos(getPanelPosition(anchorRef, 392, PANEL_HEIGHT));
      update();
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }, [anchorRef, open]);

    useEffect(() => {
      if (open) setDraft(value ?? fallbackLunarSelection(minYear, maxYear));
    }, [maxYear, minYear, open, value]);

    if (!pos) return null;

    return (
      <div
        ref={ref}
        id={panelId}
        role="dialog"
        aria-label={copy.title}
        aria-hidden={!open}
        inert={!open}
        className="sjp-birth-wheel-panel sjp-birth-wheel-panel--lunar"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          left: pos.left,
          top: pos.top,
          width: pos.width,
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.98)',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        <div className="sjp-birth-wheel-panel__head">
          <span className="sjp-birth-wheel-panel__title">{copy.title}</span>
          <span className="sjp-birth-wheel-panel__value">{lunarDisplay(draft, copy)}</span>
        </div>
        <div className="sjp-birth-wheel-panel__labels" aria-hidden="true">
          <span>{copy.year}</span>
          <span>{copy.month}</span>
          <span>{copy.day}</span>
        </div>
        <div className="sjp-birth-wheel-panel__wheel">
          <div className="sjp-birth-wheel-panel__band" />
          <div className="sjp-birth-wheel-panel__columns">
            <DrumColumn
              items={years(minYear, maxYear)}
              selected={draft.year}
              onSelect={(year) => setDraft((prev) => normalizeLunar({ ...prev, year }))}
              label={copy.yearAria}
              itemHeight={DRUM_ITEM_H}
              visibleRows={WHEEL_ROWS}
              renderValue={(year) => String(year)}
            />
            <div className="sjp-birth-wheel-panel__divider" />
            <DrumColumn
              items={monthOptions.map((option) => option.value)}
              selected={draft.monthWithLeap}
              onSelect={(monthWithLeap) => setDraft((prev) => normalizeLunar({ ...prev, monthWithLeap }))}
              label={copy.monthAria}
              itemHeight={DRUM_ITEM_H}
              visibleRows={WHEEL_ROWS}
              renderValue={(monthWithLeap) => {
                const option = monthOption(draft.year, monthWithLeap);
                return option ? copy.monthLabel(option.label, option.month, option.isLeap) : String(monthWithLeap);
              }}
            />
            <div className="sjp-birth-wheel-panel__divider" />
            <DrumColumn
              items={dayItems}
              selected={draft.day}
              onSelect={(day) => setDraft((prev) => normalizeLunar({ ...prev, day }))}
              label={copy.dayAria}
              itemHeight={DRUM_ITEM_H}
              visibleRows={WHEEL_ROWS}
              renderValue={(day) => copy.dayLabel(lunarDayLabel(draft.year, draft.monthWithLeap, day), day)}
            />
          </div>
        </div>
        <div className={`sjp-birth-wheel-panel__preview${isFuture ? ' is-invalid' : ''}`}>
          {copy.gregorian}{gregorianDate ? gregorianDate.replaceAll('-', '/') : copy.conversionFailed}
          {isFuture ? ` · ${copy.futureDate}` : ''}
        </div>
        <div className="sjp-birth-wheel-panel__actions">
          <span />
          <div className="sjp-birth-wheel-panel__action-group">
            {allowClear && value ? (
              <button type="button" className="sjp-birth-wheel-panel__text-btn is-muted" onClick={onClear}>
                {copy.clear}
              </button>
            ) : null}
            <button
              type="button"
              className="sjp-birth-wheel-panel__confirm"
              disabled={!gregorianDate || isFuture}
              onClick={() => {
                if (!gregorianDate || isFuture) return;
                const option = monthOption(draft.year, draft.monthWithLeap);
                if (!option) return;
                onCommit({
                  local_date_text: gregorianDate,
                  lunar_year: String(draft.year),
                  lunar_month: String(option.month),
                  lunar_day: String(draft.day),
                  lunar_is_leap_month: option.isLeap ? 'leap' : 'normal',
                });
              }}
            >
              {copy.confirm}
            </button>
          </div>
        </div>
      </div>
    );
  },
);

export interface LunarBirthDatePickerProps {
  readonly id?: string;
  readonly localDateText: string;
  readonly lunarYear: string;
  readonly lunarMonth: string;
  readonly lunarDay: string;
  readonly lunarIsLeapMonth: 'unanswered' | LunarLeapState;
  readonly onChange: (value: LunarBirthDateChange) => void;
  readonly onClear?: () => void;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly minYear?: number;
}

export function LunarBirthDatePicker({
  id,
  localDateText,
  lunarYear,
  lunarMonth,
  lunarDay,
  lunarIsLeapMonth,
  onChange,
  onClear,
  className = '',
  style,
  minYear = DEFAULT_MIN_YEAR,
}: LunarBirthDatePickerProps) {
  const copy = useProductCopy().lunarDatePicker;
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const maxYear = todayAtNoon().getFullYear();
  const maxGregorianDate = formatIsoDate(todayAtNoon());
  const parsedSelection = parseLunarSelection(lunarYear, lunarMonth, lunarDay, lunarIsLeapMonth);
  const displayValue = lunarDisplay(parsedSelection, copy);

  useEffect(() => {
    if (!open) return;
    const first = panelRef.current?.querySelector<HTMLElement>('[tabindex="0"], button:not(:disabled)');
    first?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    // The natal editors close on document capture. Consume the inner panel's
    // Escape at window capture first, independent of listener registration order.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);

  useEffect(() => {
    if (!mounted || open) return;
    const timer = setTimeout(() => setMounted(false), 220);
    return () => clearTimeout(timer);
  }, [mounted, open]);

  useEffect(() => {
    if (!mounted) return;
    const handler = (event: globalThis.MouseEvent) => {
      if (
        wrapRef.current &&
        !wrapRef.current.contains(event.target as Node) &&
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mounted]);

  const openPanel = () => {
    setMounted(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)));
  };

  const toggle = () => {
    if (open) setOpen(false);
    else openPanel();
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="group/field relative flex items-center">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          onClick={toggle}
          aria-label={copy.placeholder}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={panelId}
          className={`w-full rounded-2xl border border-[var(--nimi-border-subtle)] bg-[var(--nimi-field-bg)] pl-3 pr-9 py-2 text-left text-[14px] cursor-pointer outline-none transition-shadow focus:ring-2 focus:ring-[var(--nimi-ring)] ${className}`}
          style={style}
        >
          {displayValue || copy.placeholder}
        </button>
        <div className="pointer-events-none absolute right-2 flex items-center">
          <CalendarIcon
            size={16}
            className={`transition-colors ${open ? 'text-[var(--nimi-text-primary)]' : 'text-gray-400 group-focus-within/field:text-[var(--nimi-text-primary)]'}`}
          />
        </div>
      </div>
      {localDateText && parsedSelection ? (
        <div className="sjp-birth-wheel-trigger-note">{copy.gregorian}{localDateText.replaceAll('-', '/')}</div>
      ) : null}
      {mounted &&
        createPortal(
          <LunarBirthDatePanel
            ref={panelRef}
            panelId={panelId}
            anchorRef={wrapRef}
            open={open}
            value={parsedSelection}
            minYear={minYear}
            maxYear={maxYear}
            maxGregorianDate={maxGregorianDate}
            allowClear={Boolean(onClear)}
            onCommit={(next) => {
              onChange(next);
              setOpen(false);
              triggerRef.current?.focus();
            }}
            onClear={() => {
              onClear?.();
              setOpen(false);
              triggerRef.current?.focus();
            }}
          />,
          document.body,
        )}
    </div>
  );
}
