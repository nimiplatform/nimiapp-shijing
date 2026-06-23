import type { ReactNode, SVGProps } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@nimiplatform/kit/ui';

type IconProps = SVGProps<SVGSVGElement>;

function MingJingInfoIcon(props: IconProps) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <circle cx="12" cy="8" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function MingJingInfo({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="shijing-mingjing-info__button" aria-label={label}>
          <MingJingInfoIcon />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={8}
        className="shijing-mingjing-info__bubble"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
