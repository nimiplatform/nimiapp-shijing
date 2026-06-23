// RiJing — 推演依据与数据说明 (data section).
//
// Collapsed, it is a single bar: a spark glyph, the section title, and the
// method evidence chips. Expanded (BaZi readings), it opens a four-card read —
// 旺衰 meter, 用神·喜用, 四柱·已知, and 数据完整度 — all derived from
// `method_evidence`. The 数据完整度 card also folds in the readiness signal:
// when the self profile is incomplete it offers a 「完善资料」 link rather than a
// separate notice card. Non-BaZi readings keep the chip bar without the grid.

import { useState } from 'react';

import { ChevronDownIcon, SparkleIcon } from './rijing-icons.tsx';
import type { RiJingDataPanel } from './rijing-derive.ts';
import type { NatalReadiness } from '../../subjects/natal-readiness.ts';
import { useProductCopy } from '../../i18n/copy.ts';

export interface RiJingDataSectionProps {
  readonly panel: RiJingDataPanel;
  readonly readiness: NatalReadiness;
  readonly onCompleteProfile: () => void;
  readonly disabled?: boolean;
}

export function RiJingDataSection(props: RiJingDataSectionProps) {
  const copy = useProductCopy();
  const ev = copy.rijing.evidence;
  const [open, setOpen] = useState(false);
  const { panel } = props;
  const bazi = panel.bazi;
  const expandable = !props.disabled && Boolean(bazi);

  const bar = (
    <>
      <span className="shijing-rijing__data-icon" aria-hidden>
        <SparkleIcon />
      </span>
      <span className="shijing-rijing__data-title">{ev.title}</span>
      <span className="shijing-rijing__data-chips">
        {panel.chips.map((chip, idx) => (
          <span key={`${idx}-${chip.group}`} className="shijing-rijing__data-chip">
            <span className="shijing-rijing__data-chip-label">{chip.group}</span>
            <span className="shijing-rijing__data-chip-value">{chip.value}</span>
          </span>
        ))}
      </span>
    </>
  );

  return (
    <section
      className={`shijing-rijing__data${open ? ' shijing-rijing__data--open' : ''}`}
      aria-label={ev.ariaLabel}
    >
      {expandable ? (
        <button
          type="button"
          className="shijing-rijing__data-bar"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={ev.toggleAria}
        >
          {bar}
          <span className="shijing-rijing__data-chevron" data-open={open} aria-hidden>
            <ChevronDownIcon />
          </span>
        </button>
      ) : (
        <div className="shijing-rijing__data-bar shijing-rijing__data-bar--static">{bar}</div>
      )}

      {open && bazi ? (
        <div className="shijing-rijing__data-panel">
          <div className="shijing-rijing__data-divider" aria-hidden />
          <div className="shijing-rijing__data-grid">
            {bazi.strength ? (
              <div className="shijing-rijing__data-card">
                <div className="shijing-rijing__data-card-label">{ev.strengthLabel}</div>
                <div className="shijing-rijing__data-strength">{bazi.strength.band}</div>
                <div className="shijing-rijing__data-segments" aria-hidden>
                  {Array.from({ length: bazi.strength.total }).map((_, i) => (
                    <span
                      key={i}
                      className="shijing-rijing__data-segment"
                      data-active={i === bazi.strength?.index}
                    />
                  ))}
                </div>
                <div className="shijing-rijing__data-axis" aria-hidden>
                  <span>{copy.rijing.overview.meterAxisStart}</span>
                  <span>{copy.rijing.overview.meterAxisEnd}</span>
                </div>
              </div>
            ) : null}

            {bazi.yong.length > 0 ? (
              <div className="shijing-rijing__data-card">
                <div className="shijing-rijing__data-card-label">{ev.yongLabel}</div>
                <div className="shijing-rijing__data-elements">
                  {bazi.yong.map((element) => (
                    <span
                      key={element.element}
                      className="shijing-rijing__data-element"
                      data-element={element.element}
                    >
                      <span className="shijing-rijing__data-element-char">{element.char}</span>
                      <span className="shijing-rijing__data-element-nature">
                        {ev.elementNatures[element.element]}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {bazi.pillars.length > 0 ? (
              <div className="shijing-rijing__data-card">
                <div className="shijing-rijing__data-card-label">{ev.pillarsLabel}</div>
                <div className="shijing-rijing__data-pillars">
                  {bazi.pillars.map((pillar) => (
                    <span
                      key={pillar.position}
                      className="shijing-rijing__data-pillar"
                      data-emphasis={pillar.emphasis}
                    >
                      <span className="shijing-rijing__data-pillar-char">{pillar.stem}</span>
                      <span className="shijing-rijing__data-pillar-char">{pillar.branch}</span>
                      <span className="shijing-rijing__data-pillar-pos">
                        {ev.pillarPositions[pillar.position]}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="shijing-rijing__data-card">
              <div className="shijing-rijing__data-card-label">{ev.completenessLabel}</div>
              <div className="shijing-rijing__data-dots" aria-hidden>
                {Array.from({ length: bazi.completeness.total }).map((_, i) => (
                  <span
                    key={i}
                    className="shijing-rijing__data-dot"
                    data-filled={i < bazi.completeness.filled}
                  />
                ))}
              </div>
              <div className="shijing-rijing__data-completeness">
                {bazi.completeness.filled === bazi.completeness.total ? (
                  <>
                    <b>{ev.completenessFull}</b> · {bazi.completeness.filled}/{bazi.completeness.total}
                  </>
                ) : (
                  <b>{ev.completenessKnown(bazi.completeness.filled, bazi.completeness.total)}</b>
                )}
              </div>
              {bazi.stage ? (
                <span className="shijing-rijing__data-stage-pill">
                  {ev.stageDriverLabel} · {bazi.stage}
                </span>
              ) : null}
              {!props.readiness.ok ? (
                <button
                  type="button"
                  className="shijing-rijing__data-complete"
                  onClick={props.onCompleteProfile}
                >
                  {ev.completeProfile}
                  <span aria-hidden>→</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
