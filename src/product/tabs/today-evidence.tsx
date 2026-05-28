// Today tab — collapsible evidence row. Shows the shield icon, the
// section title, and a short row of derived chips when collapsed; when
// open, renders the existing ReadingEvidenceCard technical details block
// as the source-of-truth evidence drawer.

import { useState, type ReactNode } from 'react';

import { ChevronDownIcon, ShieldIcon } from './today-icons.tsx';
import type { TodayEvidenceChip } from './today-derive.ts';

export interface TodayEvidenceRowProps {
  readonly chips: readonly TodayEvidenceChip[];
  readonly disabled?: boolean;
  readonly children?: ReactNode;
}

export function TodayEvidenceRow(props: TodayEvidenceRowProps) {
  const [open, setOpen] = useState(false);
  const expandable = !props.disabled && Boolean(props.children);
  return (
    <section className={`shijing-today-evidence${open ? ' shijing-today-evidence--open' : ''}`}>
      <button
        type="button"
        className="shijing-today-evidence__bar"
        onClick={() => expandable && setOpen((value) => !value)}
        aria-expanded={open}
        disabled={!expandable}
      >
        <span className="shijing-today-evidence__icon" aria-hidden>
          <ShieldIcon />
        </span>
        <span className="shijing-today-evidence__title">推演依据与数据说明</span>
        <span className="shijing-today-evidence__chips">
          {props.chips.map((chip, idx) => (
            <span key={`${idx}-${chip.group}`} className="shijing-today-evidence__chip">
              <span className="shijing-today-evidence__chip-label">{chip.group}</span>
              <span className="shijing-today-evidence__chip-value">{chip.value}</span>
            </span>
          ))}
        </span>
        <span className="shijing-today-evidence__chevron" aria-hidden>
          <ChevronDownIcon />
        </span>
      </button>
      {open && props.children ? (
        <div className="shijing-today-evidence__panel">{props.children}</div>
      ) : null}
    </section>
  );
}
