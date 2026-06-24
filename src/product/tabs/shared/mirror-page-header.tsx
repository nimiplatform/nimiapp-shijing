import type { ReactNode } from 'react';

export interface MirrorPageHeaderProps {
  readonly title: string;
  readonly headingId?: string;
  readonly meta?: ReactNode;
  readonly metaAriaHidden?: boolean;
  readonly actions?: ReactNode;
  readonly footer?: ReactNode;
}

export function MirrorPageHeader({
  title,
  headingId,
  meta,
  metaAriaHidden = false,
  actions,
  footer,
}: MirrorPageHeaderProps) {
  const hasActions = Boolean(actions || footer);

  return (
    <header className="shijing-mirror-header">
      <div className="shijing-mirror-header__titles">
        <h1 id={headingId}>{title}</h1>
        {meta ? (
          <div className="shijing-mirror-header__meta" aria-hidden={metaAriaHidden || undefined}>
            {meta}
          </div>
        ) : null}
      </div>
      {hasActions ? (
        <div className="shijing-mirror-header__actions">
          {actions ? <div className="shijing-mirror-header__buttons">{actions}</div> : null}
          {footer ? <div className="shijing-mirror-header__footer">{footer}</div> : null}
        </div>
      ) : null}
    </header>
  );
}
