// Inline SVG icons local to the RiJing tab. Kept minimal — all icons
// inherit `currentColor` so callers control tone via CSS. We deliberately
// avoid emoji to keep the visual register calm and brand-aligned.

import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const COMMON_PROPS = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function RefreshIcon(props: IconProps) {
  return (
    <svg {...COMMON_PROPS} aria-hidden {...props}>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 4v4h-4" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 20v-4h4" />
    </svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <svg {...COMMON_PROPS} aria-hidden {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <circle cx="12" cy="8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <svg {...COMMON_PROPS} aria-hidden {...props}>
      <path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z" />
    </svg>
  );
}

export function SparkleIcon(props: IconProps) {
  return (
    <svg {...COMMON_PROPS} aria-hidden {...props}>
      <path d="M12 3v4" />
      <path d="M12 17v4" />
      <path d="M3 12h4" />
      <path d="M17 12h4" />
      <path d="M5.6 5.6l2.8 2.8" />
      <path d="M15.6 15.6l2.8 2.8" />
      <path d="M5.6 18.4l2.8-2.8" />
      <path d="M15.6 8.4l2.8-2.8" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg {...COMMON_PROPS} aria-hidden {...props}>
      <path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...COMMON_PROPS} aria-hidden {...props}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <svg {...COMMON_PROPS} aria-hidden {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg {...COMMON_PROPS} aria-hidden {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}

// ----- 「今天怎么做」 action-card icons -----
//
// do  → double chevron (推进 / 往前送一步)
// say → speech bubble (沟通 / 确认彼此预期)
// avoid → prohibition (不宜 / 别打乱节奏)

export function DoubleChevronIcon(props: IconProps) {
  return (
    <svg {...COMMON_PROPS} aria-hidden {...props}>
      <path d="M6 7l5 5-5 5" />
      <path d="M12 7l5 5-5 5" />
    </svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <svg {...COMMON_PROPS} aria-hidden {...props}>
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" />
    </svg>
  );
}

export function ProhibitIcon(props: IconProps) {
  return (
    <svg {...COMMON_PROPS} aria-hidden {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
    </svg>
  );
}
