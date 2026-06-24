import type { TendencyClass } from '../../../domain/mirror-output.ts';

export function monthIconProps() {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
}

// ① 本期主线 — a glyph per dominant tendency in the headline card.
export function MonthTendencyGlyph({ tendency }: { readonly tendency: TendencyClass }) {
  return (
    <svg {...monthIconProps()} aria-hidden>
      {tendency === 'supportive' ? (
        <>
          <path d="M3 17l6-6 4 4 8-8" />
          <path d="M17 7h4v4" />
        </>
      ) : null}
      {tendency === 'steady' ? (
        <>
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6" />
        </>
      ) : null}
      {tendency === 'watch' ? (
        <>
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : null}
      {tendency === 'turning' ? (
        <>
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          <path d="M3 21v-5h5" />
        </>
      ) : null}
      {tendency === 'blocked' ? (
        <>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          <path d="M9 12h6" />
        </>
      ) : null}
    </svg>
  );
}

// ② 关键日期窗口 — paper-plane / pause / cycle by window index.
export function MonthWindowGlyph({ index }: { readonly index: number }) {
  return (
    <svg {...monthIconProps()} aria-hidden>
      {index === 0 ? (
        <>
          <path d="M22 2 11 13" />
          <path d="M22 2 15 22l-4-9-9-4Z" />
        </>
      ) : index === 1 ? (
        <>
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </>
      ) : (
        <>
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          <path d="M3 21v-5h5" />
        </>
      )}
    </svg>
  );
}

// ③ 30 日节奏 — calendar / message / check / flag by phase index.
export function MonthPhaseGlyph({ index }: { readonly index: number }) {
  return (
    <svg {...monthIconProps()} aria-hidden>
      {index === 0 ? (
        <>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </>
      ) : index === 1 ? (
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      ) : index === 2 ? (
        <>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <path d="m9 11 3 3L22 4" />
        </>
      ) : (
        <>
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <path d="M4 22v-7" />
        </>
      )}
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg {...monthIconProps()} aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function WarningIcon() {
  return (
    <svg {...monthIconProps()} aria-hidden>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

export function ReviewIcon() {
  return (
    <svg {...monthIconProps()} aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}
