// Inline SVG icon set for the redesigned "我" tab. All icons share the
// same 24×24 viewBox, `stroke="currentColor"` semantics and 1.6px
// stroke so they sit consistently next to 15px headings. We avoid
// emoji because their rendering varies across platforms (Windows emoji
// font, browser fallback, etc.) and would break the green-line-art
// look that the mockup is going for.

export type MeIconName =
  | 'user'
  | 'users'
  | 'message-circle'
  | 'clock'
  | 'check'
  | 'check-decorated'
  | 'chevron-right'
  | 'location'
  | 'sliders'
  | 'alert';

export interface MeIconProps {
  readonly name: MeIconName;
  readonly size?: number;
  readonly className?: string;
}

export function MeIcon({ name, size = 20, className }: MeIconProps) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...(className ? { className } : {}),
  };
  switch (name) {
    case 'user':
      return (
        <svg {...props}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
        </svg>
      );
    case 'users':
      return (
        <svg {...props}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" />
          <circle cx="17" cy="9" r="2.8" />
          <path d="M15.5 14.5c2.2.4 4.1 1.9 5 4" />
        </svg>
      );
    case 'message-circle':
      return (
        <svg {...props}>
          <path d="M21 11.5a8.4 8.4 0 0 1-1.2 4.3 8.5 8.5 0 0 1-7.3 4.2 8.4 8.4 0 0 1-4.3-1.2L3 20l1.2-5.2A8.4 8.4 0 0 1 3 10.5a8.5 8.5 0 0 1 4.2-7.3A8.4 8.4 0 0 1 11.5 2h.5a8.5 8.5 0 0 1 8 8v1.5z" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.2 2" />
        </svg>
      );
    case 'check':
      return (
        <svg {...props}>
          <path d="M5 12.5 10 17.5 19 7" />
        </svg>
      );
    case 'check-decorated':
      // Filled green disc with white check, used by the readiness hero.
      // The disc is filled rather than stroked, so we override fill.
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          aria-hidden="true"
          {...(className ? { className } : {})}
        >
          <circle cx="12" cy="12" r="10" fill="currentColor" />
          <path
            d="M7.5 12.2 10.6 15.3 16.5 9.4"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'chevron-right':
      return (
        <svg {...props}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      );
    case 'location':
      return (
        <svg {...props}>
          <path d="M12 22s-7-7.5-7-13a7 7 0 1 1 14 0c0 5.5-7 13-7 13z" />
          <circle cx="12" cy="9.5" r="2.5" />
        </svg>
      );
    case 'sliders':
      // "Mixing board" silhouette for the 设置与记录 card; reads as
      // settings/preferences without recycling the gear cliché.
      return (
        <svg {...props}>
          <path d="M4 6h10" />
          <path d="M18 6h2" />
          <circle cx="16" cy="6" r="2" />
          <path d="M4 12h2" />
          <path d="M10 12h10" />
          <circle cx="8" cy="12" r="2" />
          <path d="M4 18h12" />
          <path d="M20 18h0" />
          <circle cx="18" cy="18" r="2" />
        </svg>
      );
    case 'alert':
      // Soft triangle alert used in the precision-callout banner.
      return (
        <svg {...props}>
          <path d="M12 4 3 20h18L12 4z" />
          <path d="M12 11v4" />
          <path d="M12 17.5v.5" />
        </svg>
      );
    default: {
      const exhaustive: never = name;
      void exhaustive;
      return null;
    }
  }
}
