import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface GeneratingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly busy?: boolean;
  readonly busyLabel?: ReactNode;
  readonly leadingIcon?: ReactNode;
  readonly labelClassName?: string;
}

export function GeneratingButton({
  busy = false,
  busyLabel,
  leadingIcon,
  labelClassName,
  className,
  disabled,
  children,
  type = 'button',
  ...buttonProps
}: GeneratingButtonProps) {
  const classes = ['shijing-generating-button', className].filter(Boolean).join(' ');
  const labelClasses = ['shijing-generating-button__label', labelClassName]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      {...buttonProps}
      type={type}
      className={classes}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      data-busy={busy ? 'true' : 'false'}
    >
      {busy ? (
        <span className="shijing-generating-button__spinner" aria-hidden="true" />
      ) : leadingIcon ? (
        <span className="shijing-generating-button__icon" aria-hidden="true">
          {leadingIcon}
        </span>
      ) : null}
      <span className={labelClasses}>{busy ? busyLabel ?? children : children}</span>
    </button>
  );
}
