// SJG-IA-04 — settings module row.
//
// The 设置 sub-page renders every module as one row inside a single stacked
// card (no left module rail): icon + title on the left, the module's
// controls on the right, hairline dividers between rows. Sibling sub-pages
// (档案 / 关注 / 发生过的事) keep the `.sjp-card` flow.

import type { ReactNode } from 'react';

export interface SettingsRowProps {
  readonly id: string;
  readonly icon: ReactNode;
  readonly title: string;
  // 'center' vertically centers a short control column against the meta block
  // (e.g. the language segmented control); default top-aligns form controls.
  readonly align?: 'start' | 'center';
  readonly children: ReactNode;
}

export function SettingsRow({
  id,
  icon,
  title,
  align = 'start',
  children,
}: SettingsRowProps) {
  return (
    <section
      id={id}
      className={`sjp-row${align === 'center' ? ' sjp-row--center' : ''}`}
      tabIndex={-1}
      aria-label={title}
    >
      <div className="sjp-row__meta">
        <span className="sjp-card-icon">{icon}</span>
        <div className="sjp-row__headtext">
          <h2 className="sjp-row__title">{title}</h2>
        </div>
      </div>
      <div className="sjp-row__control">{children}</div>
    </section>
  );
}
