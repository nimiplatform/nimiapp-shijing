// 命镜 · 七政四余 — hero (命格概览). Deterministic archetype + chart-derived chips.

import { useProductCopy } from '../../i18n/copy.ts';
import { GlossTerm } from './qizheng-glossary.tsx';
import type { QizhengHeroView } from './qizheng-narrative.ts';

export function QizhengHero({ hero }: { readonly hero: QizhengHeroView }) {
  const x = useProductCopy().mingjing.qizhengExplore;
  const tailChips = hero.subtitleChips.slice(1);

  return (
    <section className="shijing-qz-hero" aria-label={x.heroEyebrow}>
      <div className="shijing-qz-hero__grid">
        <div className="shijing-qz-hero__main">
          <p className="shijing-qz-hero__eyebrow">{x.heroEyebrow}</p>
          <h2 className="shijing-qz-hero__title">{hero.title}</h2>
          <div className="shijing-qz-hero__subtitle">
            <span>
              <GlossTerm termKey="命主" className="shijing-qz-term--light">{x.terms.mingZhu}</GlossTerm>
              {hero.mingZhuLabel}
            </span>
            {tailChips.map((chip) => (
              <span key={chip}>
                <span className="shijing-qz-hero__sep">·</span>
                {chip}
              </span>
            ))}
          </div>
          <p className="shijing-qz-hero__lead">{hero.oneLiner}</p>
          <p className="shijing-qz-hero__body">{hero.paragraph}</p>
        </div>

        <div className="shijing-qz-hero__side">
          <div className="shijing-qz-hero__group">
            <p className="shijing-qz-hero__group-title">{x.favorableTitle}</p>
            <div className="shijing-qz-hero__chips">
              {hero.favorable.map((label, index) => (
                <span key={label} className="shijing-qz-hero__chip" data-primary={index === 0 ? '' : undefined}>
                  {label}
                </span>
              ))}
            </div>
          </div>
          {hero.watch.length > 0 ? (
            <div className="shijing-qz-hero__group">
              <p className="shijing-qz-hero__group-title">{x.watchTitle}</p>
              <div className="shijing-qz-hero__chips">
                {hero.watch.map((label) => (
                  <span key={label} className="shijing-qz-hero__chip shijing-qz-hero__chip--watch">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <div className="shijing-qz-hero__basis">
            <p className="shijing-qz-hero__group-title">{x.basisTitle}</p>
            <p className="shijing-qz-hero__basis-value">{hero.basisLabel}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
