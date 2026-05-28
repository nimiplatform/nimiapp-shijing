// Inline SVG icons for the Today tab. All icons use currentColor so the
// surrounding token controls tone, and none are emoji — per design-system
// §3.5 the today tab must rely on bone-and-line iconography, not emoji
// glyphs, even when implementing the mock at scale.

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

export function PlayIcon(props: IconProps) {
  return (
    <svg {...COMMON_PROPS} aria-hidden {...props}>
      <path d="M8 5l11 7-11 7z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <svg {...COMMON_PROPS} aria-hidden {...props}>
      <path d="M4 5h16v11H8l-4 4z" />
    </svg>
  );
}

export function WarnIcon(props: IconProps) {
  return (
    <svg {...COMMON_PROPS} aria-hidden {...props}>
      <path d="M12 4l9 16H3z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SunriseIcon(props: IconProps) {
  return (
    <svg {...COMMON_PROPS} aria-hidden {...props}>
      <circle cx="12" cy="13" r="3.5" />
      <path d="M12 4v3" />
      <path d="M4.5 13H7" />
      <path d="M17 13h2.5" />
      <path d="M6.5 7.5l1.8 1.8" />
      <path d="M15.7 9.3l1.8-1.8" />
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <svg {...COMMON_PROPS} aria-hidden {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3" />
      <path d="M12 19v3" />
      <path d="M2 12h3" />
      <path d="M19 12h3" />
      <path d="M4.9 4.9l2.1 2.1" />
      <path d="M17 17l2.1 2.1" />
      <path d="M4.9 19.1l2.1-2.1" />
      <path d="M17 7l2.1-2.1" />
    </svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <svg {...COMMON_PROPS} aria-hidden {...props}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
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

export function ShieldIcon(props: IconProps) {
  return (
    <svg {...COMMON_PROPS} aria-hidden {...props}>
      <path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
    </svg>
  );
}

export function ReflectionIcon(props: IconProps) {
  return (
    <svg {...COMMON_PROPS} aria-hidden {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 10a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.4V14.5" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

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

export function NoteIcon(props: IconProps) {
  return (
    <svg {...COMMON_PROPS} aria-hidden {...props}>
      <path d="M5 4h11l3 3v13H5z" />
      <path d="M8 9h8" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
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

export function InfoIcon(props: IconProps) {
  return (
    <svg {...COMMON_PROPS} aria-hidden {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <circle cx="12" cy="8" r="0.6" fill="currentColor" stroke="none" />
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
