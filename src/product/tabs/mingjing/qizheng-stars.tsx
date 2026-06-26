// 命镜 · 七政四余 — 十一星曜 · 逐颗读 (expandable star cards).

import { useState } from 'react';
import { useProductCopy } from '../../i18n/copy.ts';
import { ChevronIcon } from './qizheng-icons.tsx';
import type { QizhengStarView } from './qizheng-narrative.ts';

export interface QizhengStarAi {
  readonly theme: string;
  readonly strategy: string;
}

export function QizhengStars({
  stars,
  aiByKey,
  onGoPalace,
}: {
  readonly stars: readonly QizhengStarView[];
  readonly aiByKey: Record<string, QizhengStarAi>;
  readonly onGoPalace: (houseName: string) => void;
}) {
  const copy = useProductCopy();
  const x = copy.mingjing.qizhengExplore;
  const aiLabel = copy.mingjing.qizhengReading.starGuidanceTitle;
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <section className="shijing-qz-stars" aria-label={x.starsTitle}>
      <div className="shijing-qz-section-head shijing-qz-section-head--loose">
        <h3 className="shijing-qz-section-title">{x.starsTitle}</h3>
        <span className="shijing-qz-section-hint">{x.starsHint}</span>
      </div>
      <div className="shijing-qz-stars__grid">
        {stars.map((star) => {
          const expanded = !!open[star.key];
          const ai = aiByKey[star.key];
          const glyphChars = Array.from(star.label);
          const glyphHead = glyphChars[0] ?? '';
          const glyphTail = glyphChars.slice(1).join('');
          return (
            <article key={star.key} className="shijing-qz-star" data-expanded={expanded ? '' : undefined}>
              <button
                type="button"
                className="shijing-qz-star__head"
                aria-expanded={expanded}
                onClick={() => setOpen((prev) => ({ ...prev, [star.key]: !prev[star.key] }))}
              >
                <span className="shijing-qz-glyph" style={{ color: star.color }}>
                  <span className="shijing-qz-glyph__swatch" style={{ background: star.bg }}>
                    {glyphHead}
                  </span>
                  {glyphTail ? <span className="shijing-qz-glyph__tail">{glyphTail}</span> : null}
                </span>
                <span className="shijing-qz-star__body">
                  <span className="shijing-qz-star__title">
                    <b>{star.label}</b>
                    <span className="shijing-qz-star__planet">{star.planet}</span>
                  </span>
                  <span className="shijing-qz-star__meaning">{star.essence}</span>
                  <span className="shijing-qz-star__chips">
                    <span
                      className="shijing-qz-chip shijing-qz-chip--go"
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        onGoPalace(star.houseName);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.stopPropagation();
                          event.preventDefault();
                          onGoPalace(star.houseName);
                        }
                      }}
                    >
                      {x.starGoPalace} {star.houseName} ↗
                    </span>
                    <span className="shijing-qz-chip" data-strength={star.strength}>{star.strengthLabel}</span>
                    <span className="shijing-qz-chip shijing-qz-chip--mono">{star.degree}</span>
                  </span>
                </span>
                <ChevronIcon className="shijing-qz-star__chevron" />
              </button>
              {expanded ? (
                <div className="shijing-qz-star__detail">
                  <div className="shijing-qz-star__deep">
                    <p>{star.deep}</p>
                    {ai && ai.strategy ? (
                      <div className="shijing-qz-star__ai">
                        <div className="shijing-qz-deep-label">{aiLabel}</div>
                        {ai.theme ? <p className="shijing-qz-star__ai-theme">{ai.theme}</p> : null}
                        <p>{ai.strategy}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
