// 命镜 · 流年关键窗口 — the salient future-year windows (not a ledger). Pure
// display over MingJingChart.liunian.

import { useProductCopy } from '../../i18n/copy.ts';
import type { LiuNianProjection, LiuNianWindow } from '../../../domain/mingjing.ts';
import type { PillarPosition } from '../../../domain/algorithm.ts';
import { pillarHanzi } from './ganzhi-hanzi.ts';
import { MingJingInfo } from './mingjing-info.tsx';
import { useMingJingNarrative } from './mingjing-narrative.ts';

const SHORT_POS: Readonly<Record<PillarPosition, string>> = { year: '年', month: '月', day: '日', hour: '时' };

export function MingJingLiunian({ liunian }: { readonly liunian: LiuNianProjection }) {
  const copy = useProductCopy();
  const l = copy.mingjing.liunian;
  const tendencyLabels = copy.tendencyClassLabels;
  const narrative = useMingJingNarrative();

  return (
    <section className="shijing-mingjing-panel shijing-mingjing-liunian" aria-label={l.title}>
      <header className="shijing-mingjing-panel__head">
        <div className="shijing-mingjing-panel__title-row">
          <h2 className="shijing-mingjing-panel__title">{l.title}</h2>
          <MingJingInfo label={`${l.title}说明`}>
            <p>{l.intro}</p>
            <p>{l.explanation}</p>
          </MingJingInfo>
        </div>
        <p className="shijing-mingjing-panel__intro">{l.horizon(liunian.horizon.start_year, liunian.horizon.end_year)}</p>
      </header>

      {liunian.windows.length > 0 ? (
        <ol className="shijing-liunian__list">
          {liunian.windows.map((window, i) => (
            <LiunianCard
              key={`${window.start_year}-${i}`}
              window={window}
              l={l}
              natureLabel={tendencyLabels[window.nature]}
              badge={narrative.windowBadge(window)}
              plainText={narrative.windowNarrative(window)}
            />
          ))}
        </ol>
      ) : (
        <p className="shijing-liunian__empty" role="status">{l.empty}</p>
      )}
    </section>
  );
}

function LiunianCard({
  window,
  l,
  natureLabel,
  badge,
  plainText,
}: {
  readonly window: LiuNianWindow;
  readonly l: ReturnType<typeof useProductCopy>['mingjing']['liunian'];
  readonly natureLabel: string;
  readonly badge: string;
  readonly plainText: string;
}) {
  const range =
    window.start_year === window.end_year
      ? l.singleYear(window.start_year)
      : l.windowRange(window.start_year, window.end_year);
  const visibleBasis = window.basis.slice(0, 2);
  const hiddenBasisCount = Math.max(0, window.basis.length - visibleBasis.length);
  const visibleRelations = window.natal_branch_relations.slice(0, 2);
  const hiddenRelationsCount = Math.max(0, window.natal_branch_relations.length - visibleRelations.length);

  return (
    <li
      className="shijing-liunian__card"
      data-nature={window.nature}
      data-favor={window.favor}
      data-salience={window.salience}
    >
      <header className="shijing-liunian__card-head">
        <span className="shijing-liunian__range">{range}</span>
        <span className="shijing-liunian__badge" data-nature={window.nature}>
          {badge}
        </span>
        <span className="shijing-liunian__salience" data-salience={window.salience}>
          {l.salienceLabels[window.salience]}
        </span>
      </header>

      <p className="shijing-liunian__plain">{plainText}</p>

      <div className="shijing-liunian__years-wrap">
        <span className="shijing-liunian__label">{l.yearsLabel}</span>
        <ul className="shijing-liunian__years">
          {window.pillars.map((yp) => (
            <li key={yp.year}>
              <span className="shijing-liunian__year">{yp.year}</span>
              <span className="shijing-liunian__ganzhi">{pillarHanzi(yp.pillar)}</span>
            </li>
          ))}
        </ul>
      </div>

      <details className="shijing-liunian__details">
        <summary>{l.detailToggle}</summary>
        <div className="shijing-liunian__evidence">
          <div className="shijing-liunian__evidence-head">
            <span>{l.evidenceLabel}</span>
            <strong data-favor={window.favor}>{natureLabel} · {l.favorLabels[window.favor]}</strong>
          </div>
          {window.dayun_pillar ? (
            <span className="shijing-liunian__dayun">
              {l.dayunLabel}: {pillarHanzi(window.dayun_pillar)}
            </span>
          ) : null}
          {visibleRelations.length > 0 ? (
            <ul className="shijing-liunian__relations">
              {visibleRelations.map((rel, i) => (
                <li key={i} data-kind={rel.kind}>
                  {rel.kind}
                  {rel.positions.map((p) => SHORT_POS[p]).join('')}
                </li>
              ))}
              {hiddenRelationsCount > 0 ? (
                <li className="shijing-liunian__relations-more">{l.relationMore(hiddenRelationsCount)}</li>
              ) : null}
            </ul>
          ) : null}
          {visibleBasis.length > 0 ? (
            <ul className="shijing-liunian__basis">
              {visibleBasis.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
              {hiddenBasisCount > 0 ? (
                <li className="shijing-liunian__basis-more">{l.basisMore(hiddenBasisCount)}</li>
              ) : null}
            </ul>
          ) : null}
        </div>
      </details>
    </li>
  );
}
