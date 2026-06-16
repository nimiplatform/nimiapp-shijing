// RiJing — "推演依据" calm collapsible.
//
// Wraps the shared CitationDrawer in a soft glass strip with a shield
// icon and a small chip row that summarizes the snapshot (day pillar,
// month pillar, stage label, data completeness). When open, the
// inner CitationDrawer renders the canonical hashes + method profile
// + cited memory/plan refs.

import { useState, type ReactNode } from 'react';

import { ChevronDownIcon, ShieldIcon } from './rijing-icons.tsx';
import { useProductCopy } from '../../i18n/copy.ts';

export interface RijingEvidenceChip {
  readonly group: string;
  readonly value: string;
}

export interface RijingEvidenceRowProps {
  readonly chips: readonly RijingEvidenceChip[];
  readonly disabled?: boolean;
  readonly children?: ReactNode;
}

export function RiJingEvidenceRow(props: RijingEvidenceRowProps) {
  const copy = useProductCopy();
  const [open, setOpen] = useState(false);
  const expandable = !props.disabled && Boolean(props.children);
  return (
    <section className={`shijing-rijing__evidence${open ? ' shijing-rijing__evidence--open' : ''}`}>
      <button
        type="button"
        className="shijing-rijing__evidence-bar"
        onClick={() => expandable && setOpen((v) => !v)}
        aria-expanded={open}
        disabled={!expandable}
      >
        <span className="shijing-rijing__evidence-icon" aria-hidden>
          <ShieldIcon />
        </span>
        <span className="shijing-rijing__evidence-title">{copy.rijing.evidence.title}</span>
        <span className="shijing-rijing__evidence-chips">
          {props.chips.map((chip, idx) => (
            <span key={`${idx}-${chip.group}`} className="shijing-rijing__evidence-chip">
              <span className="shijing-rijing__evidence-chip-label">{chip.group}</span>
              <span className="shijing-rijing__evidence-chip-value">{chip.value}</span>
            </span>
          ))}
        </span>
        <span className="shijing-rijing__evidence-chevron" aria-hidden>
          <ChevronDownIcon />
        </span>
      </button>
      {open && props.children ? (
        <div className="shijing-rijing__evidence-panel">{props.children}</div>
      ) : null}
    </section>
  );
}
