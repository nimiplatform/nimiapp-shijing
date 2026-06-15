// Birth-time picker — a popover time panel built in the nimi-kit DatePicker's
// visual language (the kit ships no time picker). Reuses the shared DrumColumn
// wheel for hour/minute selection. Value/onChange use the same `HH:MM` string
// the rest of the natal pipeline expects for `local_time_text`.

import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { DRUM_ITEM_H, DrumColumn } from './drum-column.tsx';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function parseHm(value: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

function ClockIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

/* ── Panel ── */
interface BirthTimePickerPanelProps {
  readonly anchorRef: RefObject<HTMLDivElement | null>;
  readonly open: boolean;
  readonly hour: number;
  readonly minute: number;
  readonly hasValue: boolean;
  readonly onHourChange: (h: number) => void;
  readonly onMinuteChange: (m: number) => void;
  readonly onNow: () => void;
  readonly onClear?: () => void;
  readonly onClose: () => void;
}

const BirthTimePickerPanel = forwardRef<HTMLDivElement, BirthTimePickerPanelProps>(
  function BirthTimePickerPanel(
    { anchorRef, open, hour, minute, hasValue, onHourChange, onMinuteChange, onNow, onClear, onClose },
    ref,
  ) {
    const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);

    useEffect(() => {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPos({ left: rect.left, top: rect.bottom + 4, width: Math.max(rect.width, 240) });
    }, [anchorRef, open]);

    if (!pos) return null;
    const left = Math.min(pos.left, window.innerWidth - pos.width - 8);
    const top = Math.min(pos.top, window.innerHeight - 260);

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
        <div className="relative overflow-hidden rounded-2xl border border-[var(--nimi-border-subtle)]">
          {/* center selection band */}
          <div
            className="absolute inset-x-0 pointer-events-none z-[5] bg-[color-mix(in_srgb,var(--nimi-action-primary-bg)_10%,transparent)]"
            style={{ top: DRUM_ITEM_H, height: DRUM_ITEM_H }}
          />
          <div className="flex relative items-stretch" style={{ height: DRUM_ITEM_H * 3 }}>
            <DrumColumn
              items={HOURS}
              selected={hour}
              onSelect={onHourChange}
              label="小时"
              renderValue={pad2}
            />
            <div className="flex items-center justify-center px-1 text-[var(--nimi-action-primary-bg)] font-semibold z-[6]">
              :
            </div>
            <DrumColumn
              items={MINUTES}
              selected={minute}
              onSelect={onMinuteChange}
              label="分钟"
              renderValue={pad2}
            />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between px-1">
          <button
            type="button"
            onClick={onNow}
            className="rounded-full px-3 py-1 text-[14px] font-medium text-[var(--nimi-action-primary-bg)] transition-colors hover:bg-[var(--nimi-action-ghost-hover)]"
          >
            现在
          </button>
          <div className="flex items-center gap-1">
            {onClear && hasValue && (
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
              className="rounded-full px-3 py-1 text-[14px] font-medium text-[var(--nimi-text-muted)] transition-colors hover:bg-[var(--nimi-action-ghost-hover)]"
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
export interface BirthTimePickerProps {
  readonly id?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly placeholder?: string;
}

export function BirthTimePicker({ id, value, onChange, className = '', style, placeholder = '选择时间' }: BirthTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const parsed = parseHm(value);
  const [dispH, setDispH] = useState(parsed?.h ?? 12);
  const [dispM, setDispM] = useState(parsed?.m ?? 0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = parseHm(value);
    if (p) {
      setDispH(p.h);
      setDispM(p.m);
    }
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
  const toggle = () => {
    if (open) setOpen(false);
    else openPanel();
  };
  const handleTriggerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (panelRef.current?.contains(event.target as Node)) return;
    toggle();
  };

  const commit = (h: number, m: number) => onChange(`${pad2(h)}:${pad2(m)}`);

  return (
    <div ref={wrapRef} className="relative">
      <div className="group/field relative flex items-center cursor-pointer" onClick={handleTriggerClick}>
        <input
          id={id}
          type="text"
          readOnly
          value={parsed ? `${pad2(parsed.h)}:${pad2(parsed.m)}` : ''}
          placeholder={placeholder}
          className={`w-full rounded-2xl border border-[var(--nimi-border-subtle)] bg-[var(--nimi-field-bg)] pl-3 pr-9 py-2 text-[14px] cursor-pointer outline-none transition-shadow focus:ring-2 focus:ring-[var(--nimi-ring)] ${className}`}
          style={style}
        />
        <div className="absolute right-2 flex items-center">
          <ClockIcon
            size={16}
            className={`transition-colors ${open ? 'text-[var(--nimi-text-primary)]' : 'text-gray-400 group-focus-within/field:text-[var(--nimi-text-primary)]'}`}
          />
        </div>
      </div>
      {mounted &&
        createPortal(
          <BirthTimePickerPanel
            ref={panelRef}
            anchorRef={wrapRef}
            open={open}
            hour={dispH}
            minute={dispM}
            hasValue={Boolean(parsed)}
            onHourChange={(h) => {
              setDispH(h);
              commit(h, dispM);
            }}
            onMinuteChange={(m) => {
              setDispM(m);
              commit(dispH, m);
            }}
            onNow={() => {
              const now = new Date();
              const h = now.getHours();
              const m = now.getMinutes();
              setDispH(h);
              setDispM(m);
              commit(h, m);
            }}
            onClear={() => {
              onChange('');
              setOpen(false);
            }}
            onClose={() => setOpen(false)}
          />,
          document.body,
        )}
    </div>
  );
}
