// Inline SVG icons local to the RiJing tab. Kept minimal — all icons
// inherit `currentColor` so callers control tone via CSS. We deliberately
// avoid emoji to keep the visual register calm and brand-aligned.

import type { ReactElement, SVGProps } from 'react';

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

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...COMMON_PROPS} aria-hidden {...props}>
      <path d="M9 6l6 6-6 6" />
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

// ----- 关注视角 category glyphs -----
//
// One calm line-glyph per concern category. `concernIconFor` keyword-matches a
// concern tag's label / parsed topics to a category; anything unrecognised falls
// back to the neutral aperture mark so a user's free-form concern still reads as
// a deliberate lens rather than a missing icon.

export function BriefcaseIcon(props: IconProps) {
  return (
    <svg {...COMMON_PROPS} aria-hidden {...props}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <path d="M2 13h20" />
    </svg>
  );
}

export function ActivityIcon(props: IconProps) {
  return (
    <svg {...COMMON_PROPS} aria-hidden {...props}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...COMMON_PROPS} aria-hidden {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function WalletIcon(props: IconProps) {
  return (
    <svg {...COMMON_PROPS} aria-hidden {...props}>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

export function ApertureIcon(props: IconProps) {
  return (
    <svg {...COMMON_PROPS} aria-hidden {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}

type ConcernIcon = (props: IconProps) => ReactElement;

const CONCERN_ICON_RULES: ReadonlyArray<readonly [ConcernIcon, readonly string[]]> = [
  [BriefcaseIcon, ['事业', '事業', '工作', '职场', '職場', '生意', '创业', 'career', 'work', 'job', 'business']],
  [ActivityIcon, ['身体', '身體', '健康', '睡眠', '情绪', '心理', 'health', 'body', 'sleep', 'mood']],
  [UsersIcon, ['家人', '家庭', '父母', '孩子', '亲子', '亲人', 'family', 'home', 'parent', 'child']],
  [WalletIcon, ['财运', '財運', '财务', '理财', '金钱', '收入', '投资', 'wealth', 'money', 'finance', 'income']],
  [HeartIcon, ['姻缘', '感情', '爱情', '恋爱', '婚姻', '关系', '伴侣', 'love', 'relationship', 'romance', 'partner']],
];

export function concernIconFor(label: string, topics: readonly string[] = []): ConcernIcon {
  const haystack = [label, ...topics].join(' ').toLowerCase();
  for (const [icon, keywords] of CONCERN_ICON_RULES) {
    if (keywords.some((kw) => haystack.includes(kw.toLowerCase()))) return icon;
  }
  return ApertureIcon;
}
