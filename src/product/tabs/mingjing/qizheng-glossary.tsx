// 命镜 · 七政四余 — glossary term + popover.
//
// Dashed terms (七政 / 四余 / 宫势 / 宿 …) reveal a plain-language definition on
// hover and pin it on click, matching the offline reference. The active term and
// its anchor live in a small context so a single popover renders at the root.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface ActiveTerm {
  readonly key: string;
  readonly x: number;
  readonly y: number;
}

interface GlossaryContextValue {
  readonly has: (key: string) => boolean;
  readonly show: (key: string, anchor: DOMRect) => void;
  readonly hide: () => void;
  readonly pin: (key: string, anchor: DOMRect) => void;
}

const GlossaryContext = createContext<GlossaryContextValue | null>(null);

export function QizhengGlossaryProvider({
  gloss,
  children,
}: {
  readonly gloss: Record<string, string>;
  readonly children: ReactNode;
}) {
  const [active, setActive] = useState<ActiveTerm | null>(null);
  const [pinned, setPinned] = useState(false);
  const pinnedRef = useRef(false);
  pinnedRef.current = pinned;

  const has = useCallback((key: string) => Object.prototype.hasOwnProperty.call(gloss, key), [gloss]);

  const show = useCallback(
    (key: string, anchor: DOMRect) => {
      if (pinnedRef.current || !has(key)) return;
      setActive({ key, x: anchor.left + anchor.width / 2, y: anchor.top });
    },
    [has],
  );

  const hide = useCallback(() => {
    if (!pinnedRef.current) setActive(null);
  }, []);

  const pin = useCallback(
    (key: string, anchor: DOMRect) => {
      if (!has(key)) return;
      setActive((prev) => {
        if (pinnedRef.current && prev?.key === key) {
          setPinned(false);
          return null;
        }
        setPinned(true);
        return { key, x: anchor.left + anchor.width / 2, y: anchor.top };
      });
    },
    [has],
  );

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!pinnedRef.current) return;
      const target = event.target as Element | null;
      if (!target?.closest('[data-gloss-term]') && !target?.closest('[data-gloss-pop]')) {
        setPinned(false);
        setActive(null);
      }
    };
    const onScroll = () => {
      if (!pinnedRef.current) setActive(null);
    };
    document.addEventListener('click', onDocClick, true);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('click', onDocClick, true);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, []);

  const value = useMemo<GlossaryContextValue>(() => ({ has, show, hide, pin }), [has, show, hide, pin]);
  const text = active ? gloss[active.key] : null;

  return (
    <GlossaryContext.Provider value={value}>
      {children}
      {active && text ? (
        <div
          data-gloss-pop
          className="shijing-qz-pop"
          style={{ left: `${active.x}px`, top: `${active.y - 10}px` }}
          role="tooltip"
        >
          <div className="shijing-qz-pop__bubble">
            <div className="shijing-qz-pop__title">{active.key}</div>
            <div className="shijing-qz-pop__text">{text}</div>
          </div>
          <div className="shijing-qz-pop__arrow" />
        </div>
      ) : null}
    </GlossaryContext.Provider>
  );
}

export function GlossTerm({
  termKey,
  children,
  className,
}: {
  readonly termKey: string;
  readonly children?: ReactNode;
  readonly className?: string;
}) {
  const ctx = useContext(GlossaryContext);
  const ref = useRef<HTMLButtonElement>(null);
  if (!ctx || !ctx.has(termKey)) {
    return <span className={className}>{children ?? termKey}</span>;
  }
  const rect = () => ref.current?.getBoundingClientRect();
  return (
    <button
      ref={ref}
      type="button"
      data-gloss-term
      className={`shijing-qz-term${className ? ` ${className}` : ''}`}
      aria-label={termKey}
      onMouseEnter={() => {
        const r = rect();
        if (r) ctx.show(termKey, r);
      }}
      onMouseLeave={() => ctx.hide()}
      onClick={(event) => {
        event.stopPropagation();
        const r = rect();
        if (r) ctx.pin(termKey, r);
      }}
    >
      {children ?? termKey}
    </button>
  );
}
