// Scroll-snapping numeric "drum" wheel, lifted from the nimi-kit DatePicker so
// the birth date picker (month/year) and the birth time picker (hour/minute)
// share one identical wheel. Reliable inside the Tauri WebView (scroll-based,
// not transform-animated). Styling/behaviour are kept verbatim from the kit.

import { useCallback, useEffect, useRef, useState } from 'react';

export const DRUM_ITEM_H = 28;
const VISIBLE_ROWS = 3;
const WHEEL_STEP_THRESHOLD_PX = 72;

export interface DrumColumnProps {
  readonly items: readonly number[];
  readonly selected: number;
  readonly onSelect: (value: number) => void;
  readonly label: string;
  readonly itemHeight?: number;
  readonly visibleRows?: number;
  readonly renderValue?: (value: number) => string;
}

export function DrumColumn({
  items,
  selected,
  onSelect,
  label,
  itemHeight = DRUM_ITEM_H,
  visibleRows = VISIBLE_ROWS,
  renderValue = (v) => String(v),
}: DrumColumnProps) {
  const panelHeight = itemHeight * visibleRows;
  const padRows = Math.floor(visibleRows / 2);
  const colRef = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheelCarry = useRef(0);
  const [scrollTop, setScrollTop] = useState(0);

  const scrollToIndex = useCallback(
    (idx: number, smooth = false) => {
      const nextTop = idx * itemHeight;
      colRef.current?.scrollTo({ top: nextTop, behavior: smooth ? 'smooth' : 'auto' });
      setScrollTop(nextTop);
    },
    [itemHeight],
  );

  useEffect(() => {
    const idx = items.indexOf(selected);
    if (idx >= 0) scrollToIndex(idx, false);
  }, [items, selected, scrollToIndex]);

  useEffect(
    () => () => {
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    },
    [],
  );

  const settleSelection = useCallback(() => {
    const el = colRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / itemHeight);
    const clamped = Math.max(0, Math.min(idx, items.length - 1));
    const val = items[clamped];
    if (val !== undefined && val !== selected) onSelect(val);
    scrollToIndex(clamped, true);
  }, [itemHeight, items, onSelect, scrollToIndex, selected]);

  const handleScroll = () => {
    const el = colRef.current;
    if (el) setScrollTop(el.scrollTop);
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => settleSelection(), 80);
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const el = colRef.current;
    if (!el) return;
    event.preventDefault();
    const rawDelta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    const normalizedDelta =
      rawDelta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? itemHeight * 2 : 1);
    wheelCarry.current += normalizedDelta;
    if (Math.abs(wheelCarry.current) < WHEEL_STEP_THRESHOLD_PX) return;
    const direction = Math.sign(wheelCarry.current);
    wheelCarry.current = 0;
    const currentIdx = Math.round(el.scrollTop / itemHeight);
    const nextIdx = Math.max(0, Math.min(items.length - 1, currentIdx + direction));
    scrollToIndex(nextIdx, false);
    handleScroll();
  };

  return (
    <div className="flex-1 relative" aria-label={label}>
      <div
        className="absolute inset-x-0 top-0 z-10 pointer-events-none bg-[linear-gradient(to_bottom,var(--nimi-surface-overlay),transparent)]"
        style={{ height: itemHeight * 2 }}
      />
      <div
        className="absolute inset-x-0 bottom-0 z-10 pointer-events-none bg-[linear-gradient(to_top,var(--nimi-surface-overlay),transparent)]"
        style={{ height: itemHeight * 2 }}
      />
      <div
        ref={colRef}
        className="nimi-date-picker-scroll overflow-y-auto"
        onScroll={handleScroll}
        onWheel={handleWheel}
        style={{ height: panelHeight, scrollSnapType: 'y mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {Array.from({ length: padRows }).map((_, i) => (
          <div key={`pad-t-${i}`} style={{ height: itemHeight }} />
        ))}
        {items.map((v, idx) => {
          const centerOffset = idx * itemHeight - scrollTop;
          const distanceRows = Math.min(2.6, Math.abs(centerOffset) / itemHeight);
          const emphasis = Math.max(0, 1 - distanceRows / 2.6);
          const fontSize = Math.max(12, itemHeight * 0.36) + emphasis * Math.max(5, itemHeight * 0.22);
          const fontWeight = 430 + Math.round(emphasis * 350);
          const opacity = 0.22 + emphasis * 0.78;
          const translateY = (centerOffset > 0 ? 1 : -1) * Math.min(8, distanceRows * 3);
          const scale = 0.9 + emphasis * 0.2;
          const isCentered = Math.abs(centerOffset) < itemHeight * 0.35;
          return (
            <div
              key={v}
              onClick={() => {
                onSelect(v);
                scrollToIndex(items.indexOf(v), true);
              }}
              className={`flex items-center justify-center cursor-pointer select-none ${
                isCentered ? 'text-[var(--nimi-action-primary-bg)]' : 'text-[var(--nimi-text-muted)]'
              }`}
              aria-selected={isCentered}
              style={{
                height: itemHeight,
                scrollSnapAlign: 'center',
                fontSize,
                fontWeight,
                transform: `translateY(${translateY}px) scale(${scale})`,
                transition: 'font-size 0.12s ease, color 0.12s ease, font-weight 0.12s ease, transform 0.12s ease',
                letterSpacing: isCentered ? '0.02em' : '0.01em',
                opacity,
              }}
            >
              {renderValue(v)}
            </div>
          );
        })}
        {Array.from({ length: padRows }).map((_, i) => (
          <div key={`pad-b-${i}`} style={{ height: itemHeight }} />
        ))}
      </div>
    </div>
  );
}
