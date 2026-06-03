// Birth-date picker — a thin in-repo wrap of the nimi-kit DatePicker.
//
// The kit's DatePicker (and its exported DatePickerPanel) hard-code the
// year wheel to start at 2000, which is unusable for birth dates that
// commonly fall in 1900–2000. The kit exposes no prop to widen this, so we
// vendor the panel here with a configurable `minYear` (default 1900).
//
// Kept faithful to the kit's behaviour and look: scroll-based DrumColumn wheel
// for month/year, calendar grid with future-day clamping, today/clear/close
// actions, and a body-portaled fixed panel. Two intentional deviations:
//   • the three lucide icons are inlined as SVG (lucide-react is not a
//     declared dependency of this app);
//   • the pure value helpers (parse/format/clamp) are reused from the kit so
//     value semantics stay identical to the rest of the platform.

import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { clampToMax, formatDateValue, parseDateValue } from '@nimiplatform/kit/ui';
import { DrumColumn } from './drum-column.tsx';

const DEFAULT_MIN_YEAR = 1900;

/* ── local helpers (not exported by the kit) ── */
function formatDateDisplay(value: string): string {
  const [y, m, d] = value.split('-');
  return y && m && d ? `${y}/${m}/${d}` : '';
}
function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1, 12, 0, 0, 0);
}
function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function isAfterDay(a: Date, b: Date): boolean {
  if (a.getFullYear() !== b.getFullYear()) return a.getFullYear() > b.getFullYear();
  if (a.getMonth() !== b.getMonth()) return a.getMonth() > b.getMonth();
  return a.getDate() > b.getDate();
}
function startOfCalendarMonth(date: Date): Date {
  const first = new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0);
  const day = first.getDay();
  const offset = (day + 6) % 7;
  first.setDate(first.getDate() - offset);
  return first;
}

/* ── inline icons (replace lucide-react) ── */
function ChevronLeftIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
function ChevronRightIcon({ size = 16, strokeWidth = 1.75, className, style }: { size?: number; strokeWidth?: number; className?: string; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
function CalendarIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

/* ── Panel ── */
interface BirthDatePickerPanelProps {
  readonly anchorRef: RefObject<HTMLDivElement | null>;
  readonly open: boolean;
  readonly value: string;
  readonly displayMonth: Date;
  readonly maxDate: Date | null;
  readonly minYear: number;
  readonly onDisplayMonthChange: (date: Date) => void;
  readonly onChange: (value: string) => void;
  readonly onClear?: () => void;
  readonly onClose: () => void;
}

const BirthDatePickerPanel = forwardRef<HTMLDivElement, BirthDatePickerPanelProps>(
  function BirthDatePickerPanel(
    { anchorRef, open, value, displayMonth, maxDate, minYear, onDisplayMonthChange, onChange, onClear, onClose },
    ref,
  ) {
    const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);
    const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);

    useEffect(() => {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPos({ left: rect.left, top: rect.bottom + 4, width: Math.max(rect.width, 304) });
    }, [anchorRef, open]);

    useEffect(() => {
      if (!open) setShowMonthYearPicker(false);
    }, [open]);

    if (!pos) return null;

    const selectedDate = value ? parseDateValue(value) : new Date();
    const today = new Date();
    const safeToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0, 0);
    const effectiveMax = maxDate ?? safeToday;
    const isCurrentMonth =
      displayMonth.getFullYear() === effectiveMax.getFullYear() &&
      displayMonth.getMonth() === effectiveMax.getMonth();
    const calendarStart = startOfCalendarMonth(displayMonth);
    const currentYear = effectiveMax.getFullYear();
    // Widened range: minYear … currentYear+1 (kit hard-codes a 2000 floor).
    const yearItems = Array.from(
      { length: Math.max(1, currentYear + 1 - minYear + 1) },
      (_, i) => minYear + i,
    );
    const monthItems = Array.from({ length: 12 }, (_, i) => i + 1);
    const days = Array.from({ length: 42 }, (_, i) => {
      const d = new Date(calendarStart);
      d.setDate(calendarStart.getDate() + i);
      return d;
    });
    const left = Math.min(pos.left, window.innerWidth - pos.width - 8);
    const top = Math.min(pos.top, window.innerHeight - 380);

    return (
      <div
        ref={ref}
        className="nimi-date-picker-panel fixed z-[120] rounded-2xl overflow-hidden border border-[var(--nimi-border-subtle)] bg-[var(--nimi-surface-overlay)] p-3 shadow-[var(--nimi-elevation-floating)]"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          left,
          top,
          width: pos.width,
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.97)',
          transformOrigin: 'top center',
          transition: 'opacity 0.2s ease, transform 0.2s ease',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        <div className="mb-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onDisplayMonthChange(addMonths(displayMonth, -1))}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--nimi-action-primary-bg)_10%,transparent)] text-[var(--nimi-action-primary-bg)] transition-colors hover:bg-[var(--nimi-action-ghost-hover)]"
              aria-label="上个月"
            >
              <ChevronLeftIcon size={16} />
            </button>
            <div className="relative flex-1">
              <button
                type="button"
                onClick={() => setShowMonthYearPicker((p) => !p)}
                className="relative flex w-full items-center justify-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--nimi-action-primary-bg)_10%,transparent)] px-4 py-2 text-[var(--nimi-action-primary-bg)] transition-colors hover:bg-[var(--nimi-action-ghost-hover)]"
              >
                <span className="text-[16px] font-semibold tracking-[0.02em]">{displayMonth.getFullYear()}年</span>
                <span className="relative pr-4 text-[16px] font-semibold tracking-[0.02em]">
                  {displayMonth.getMonth() + 1}月
                  <ChevronRightIcon
                    size={13}
                    strokeWidth={2}
                    className="absolute right-[-1px] bottom-[1px] transition-transform"
                    style={{ transform: `rotate(${showMonthYearPicker ? 270 : 90}deg)` }}
                  />
                </span>
              </button>
              {showMonthYearPicker && (
                <div
                  className="absolute left-1/2 top-[calc(100%+10px)] z-20 w-[216px] -translate-x-1/2 overflow-hidden rounded-2xl border border-[var(--nimi-border-subtle)] bg-[var(--nimi-surface-overlay)] shadow-[var(--nimi-elevation-floating)]"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div
                    className="absolute inset-x-0 pointer-events-none z-[5] bg-[color-mix(in_srgb,var(--nimi-action-primary-bg)_10%,transparent)]"
                    style={{ top: 28, height: 28 }}
                  />
                  <div className="absolute top-0 bottom-0 left-1/2 w-px z-[6] bg-[var(--nimi-border-subtle)]" />
                  <div className="flex relative" style={{ height: 84 }}>
                    <DrumColumn
                      items={yearItems}
                      selected={displayMonth.getFullYear()}
                      onSelect={(y) => onDisplayMonthChange(new Date(y, displayMonth.getMonth(), 1, 12, 0, 0, 0))}
                      label="年份"
                      itemHeight={28}
                      visibleRows={3}
                      renderValue={(y) => String(y)}
                    />
                    <DrumColumn
                      items={monthItems}
                      selected={displayMonth.getMonth() + 1}
                      onSelect={(m) => onDisplayMonthChange(new Date(displayMonth.getFullYear(), m - 1, 1, 12, 0, 0, 0))}
                      label="月份"
                      itemHeight={28}
                      visibleRows={3}
                      renderValue={(m) => `${m}月`}
                    />
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                if (!isCurrentMonth) onDisplayMonthChange(addMonths(displayMonth, 1));
              }}
              className={`flex h-8 w-8 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--nimi-action-primary-bg)_10%,transparent)] text-[var(--nimi-action-primary-bg)] transition-colors hover:bg-[var(--nimi-action-ghost-hover)] ${
                isCurrentMonth ? 'opacity-70' : ''
              }`}
              style={{ cursor: isCurrentMonth ? 'not-allowed' : 'pointer' }}
              aria-label="下个月"
              disabled={isCurrentMonth}
            >
              <ChevronRightIcon size={16} />
            </button>
          </div>
        </div>
        <div className="mb-2 grid grid-cols-7 gap-1 px-1">
          {['一', '二', '三', '四', '五', '六', '日'].map((label) => (
            <div
              key={label}
              className="flex h-8 items-center justify-center text-[13px] font-medium text-[var(--nimi-text-muted)]"
            >
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 rounded-2xl bg-[color-mix(in_srgb,var(--nimi-action-primary-bg)_8%,var(--nimi-surface-card))] p-2.5">
          {days.map((day) => {
            const inMonth = day.getMonth() === displayMonth.getMonth();
            const isSelected = sameDay(day, selectedDate);
            const isToday = sameDay(day, safeToday);
            const isFuture = isAfterDay(day, effectiveMax);
            const dayTone = isSelected
              ? 'text-[var(--nimi-action-primary-bg)]'
              : isFuture
                ? 'text-[var(--nimi-text-muted)]'
                : inMonth
                  ? 'text-[var(--nimi-text-primary)]'
                  : 'text-[var(--nimi-text-muted)]';
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => {
                  if (!isFuture) onChange(formatDateValue(day));
                }}
                className={`relative flex h-10 items-center justify-center rounded-xl text-[14px] transition-all duration-150 hover:-translate-y-[1px] ${dayTone} ${
                  isSelected
                    ? 'bg-[color-mix(in_srgb,var(--nimi-action-primary-bg)_16%,transparent)] shadow-[var(--nimi-elevation-base)]'
                    : isToday
                      ? 'bg-[color-mix(in_srgb,var(--nimi-action-primary-bg)_8%,transparent)]'
                      : ''
                }`}
                disabled={isFuture}
                style={{
                  fontWeight: isFuture ? 500 : isSelected ? 750 : isToday ? 650 : 520,
                  opacity: isFuture ? 0.42 : inMonth ? 1 : 0.78,
                  cursor: isFuture ? 'not-allowed' : 'pointer',
                }}
              >
                <span>{day.getDate()}</span>
                {isToday && !isSelected && (
                  <span className="absolute bottom-[5px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--nimi-action-primary-bg)]" />
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              onDisplayMonthChange(new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0, 0));
              onChange(formatDateValue(clampToMax(now, maxDate)));
            }}
            className="rounded-full px-3 py-1 text-[14px] font-medium text-[var(--nimi-action-primary-bg)] transition-colors hover:bg-[var(--nimi-action-ghost-hover)]"
          >
            今天
          </button>
          <div className="flex items-center gap-1">
            {onClear && value && (
              <button
                type="button"
                onClick={onClear}
                className="rounded-full px-3 py-1 text-[14px] font-medium text-[var(--nimi-text-muted)] transition-colors hover:bg-[var(--nimi-action-ghost-hover)]"
              >
                清空
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-3 py-1 text-[14px] font-medium transition-colors hover:bg-[var(--nimi-action-ghost-hover)] text-[var(--nimi-text-muted)]"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    );
  },
);

/* ── public component ── */
export interface BirthDatePickerProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly size?: 'normal' | 'small';
  readonly allowClear?: boolean;
  readonly maxDate?: string;
  /** Earliest year offered in the year wheel. Defaults to 1900. */
  readonly minYear?: number;
  readonly autoOpenNonce?: number;
}

export function BirthDatePicker({
  value,
  onChange,
  className = '',
  style,
  size = 'normal',
  allowClear = false,
  maxDate,
  minYear = DEFAULT_MIN_YEAR,
  autoOpenNonce,
}: BirthDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const parsedMax = maxDate ? parseDateValue(maxDate) : null;
  const [displayMonth, setDisplayMonth] = useState(() => {
    const base = value ? parseDateValue(value) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1, 12, 0, 0, 0);
  });
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value) return;
    const parsed = parseDateValue(value);
    setDisplayMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1, 12, 0, 0, 0));
  }, [value]);

  useEffect(() => {
    if (!mounted || open) return;
    const timer = setTimeout(() => setMounted(false), 220);
    return () => clearTimeout(timer);
  }, [mounted, open]);

  useEffect(() => {
    if (!mounted) return;
    const handler = (event: MouseEvent) => {
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

  useEffect(() => {
    if (autoOpenNonce === undefined) return;
    openPanel();
  }, [autoOpenNonce]);

  const toggle = () => {
    if (open) setOpen(false);
    else openPanel();
  };

  const handleTriggerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (panelRef.current?.contains(event.target as Node)) return;
    toggle();
  };

  const hasClear = allowClear && Boolean(value);
  const sizeClass =
    size === 'small'
      ? `pl-2.5 ${hasClear ? 'pr-14' : 'pr-8'} py-1.5 text-[14px]`
      : `pl-3 ${hasClear ? 'pr-16' : 'pr-9'} py-2 text-[14px]`;

  return (
    <div ref={wrapRef} className="relative">
      <div className="group/field relative flex items-center cursor-pointer" onClick={handleTriggerClick}>
        <input
          type="text"
          readOnly
          value={formatDateDisplay(value)}
          className={`w-full rounded-2xl border border-[var(--nimi-border-subtle)] bg-[var(--nimi-field-bg)] ${sizeClass} cursor-pointer outline-none transition-shadow focus:ring-2 focus:ring-[var(--nimi-ring)] ${className}`}
          style={style}
        />
        <div className={`absolute right-2 flex items-center gap-1 ${size === 'small' ? 'text-[13px]' : ''}`}>
          {allowClear && value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setOpen(false);
              }}
              className="flex h-5 w-5 items-center justify-center rounded-full text-[var(--nimi-text-muted)] transition-colors hover:bg-[var(--nimi-action-ghost-hover)]"
              aria-label="清空日期"
            >
              <svg width={size === 'small' ? 12 : 13} height={size === 'small' ? 12 : 13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
          <CalendarIcon
            size={size === 'small' ? 14 : 16}
            className={`transition-colors ${open ? 'text-[var(--nimi-text-primary)]' : 'text-gray-400 group-focus-within/field:text-[var(--nimi-text-primary)]'}`}
          />
        </div>
      </div>
      {mounted &&
        createPortal(
          <BirthDatePickerPanel
            ref={panelRef}
            anchorRef={wrapRef}
            open={open}
            value={value}
            displayMonth={displayMonth}
            maxDate={parsedMax}
            minYear={minYear}
            onDisplayMonthChange={setDisplayMonth}
            onChange={(next) => {
              const clamped = clampToMax(parseDateValue(next), parsedMax);
              onChange(formatDateValue(clamped));
              setOpen(false);
            }}
            onClear={allowClear ? () => { onChange(''); setOpen(false); } : undefined}
            onClose={() => setOpen(false)}
          />,
          document.body,
        )}
    </div>
  );
}
