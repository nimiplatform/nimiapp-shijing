// 命镜 · 原局格局 — 日主旺衰, 格局 (月令取格 + 成破格), 用神/喜忌, 合冲刑害破.
// Pure display over MingJingChart.interpretation + .pattern.

import { useProductCopy } from '../../i18n/copy.ts';
import type { MingJingChart } from '../../../domain/mingjing.ts';
import type { BaziBranchRelation, FiveElement } from '../../../domain/algorithm.ts';

export function MingJingGeju({ chart }: { readonly chart: MingJingChart }) {
  const copy = useProductCopy();
  const g = copy.mingjing.geju;
  const elementLabels = copy.mingjing.fiveElements.labels;
  const pillarLabels = copy.mingjing.paipan.pillarLabels;
  const { strength, yong_shen: yong, natal_branch_relations: relations } = chart.interpretation;
  const pattern = chart.pattern;

  const elementList = (els: readonly FiveElement[]): string =>
    els.length > 0 ? els.map((el) => elementLabels[el]).join('、') : '—';

  const relationLabel = (rel: BaziBranchRelation): string =>
    `${rel.positions.map((p) => pillarLabels[p]).join('·')} ${rel.kind}`;

  return (
    <section className="shijing-mingjing-panel shijing-mingjing-geju" aria-label={g.title}>
      <header className="shijing-mingjing-panel__head">
        <h2 className="shijing-mingjing-panel__title">{g.title}</h2>
        <p className="shijing-mingjing-panel__explain">{g.explanation}</p>
      </header>

      <div className="shijing-geju__grid">
        {/* 旺衰 */}
        <article className="shijing-geju__card" data-band={strength.band}>
          <h3 className="shijing-geju__card-title">{g.strengthLabel}</h3>
          <p className="shijing-geju__band">{strength.band}</p>
          <p className="shijing-geju__ratio">
            {g.supportRatioLabel}: {strength.support_ratio.toFixed(3)}
          </p>
          <ul className="shijing-geju__basis">
            {strength.basis.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </article>

        {/* 格局 */}
        <article className="shijing-geju__card" data-disposition={pattern.disposition}>
          <h3 className="shijing-geju__card-title">{g.patternLabel}</h3>
          <p className="shijing-geju__pattern-name">
            {pattern.name}
            <span className="shijing-geju__disposition">{pattern.disposition}</span>
          </p>
          <p className="shijing-geju__pattern-meta">
            <span>
              {g.sourceLabel}: {pattern.source}
              {pattern.ten_god ? `（${pattern.ten_god}）` : ''}
            </span>
            <span>{pattern.transparent ? g.transparent : g.notTransparent}</span>
            <span>{pattern.rooted ? g.rooted : g.notRooted}</span>
          </p>
          <ul className="shijing-geju__basis">
            {pattern.basis.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </article>

        {/* 用神/喜忌 */}
        <article className="shijing-geju__card shijing-geju__card--yong">
          <h3 className="shijing-geju__card-title">{g.yong} · {g.xi} · {g.ji}</h3>
          <dl className="shijing-geju__yong">
            <div data-kind="yong">
              <dt>{g.yong}</dt>
              <dd>{elementList(yong.yong)}</dd>
            </div>
            <div data-kind="xi">
              <dt>{g.xi}</dt>
              <dd>{elementList(yong.xi)}</dd>
            </div>
            <div data-kind="ji">
              <dt>{g.ji}</dt>
              <dd>{elementList(yong.ji)}</dd>
            </div>
            {yong.tiaohou ? (
              <div data-kind="tiaohou">
                <dt>{g.tiaohou}</dt>
                <dd>{elementLabels[yong.tiaohou]}</dd>
              </div>
            ) : null}
          </dl>
          <ul className="shijing-geju__basis">
            {yong.basis.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </article>

        {/* 合冲刑害破 */}
        <article className="shijing-geju__card">
          <h3 className="shijing-geju__card-title">{g.relationsLabel}</h3>
          {relations.length > 0 ? (
            <ul className="shijing-geju__relations">
              {relations.map((rel, i) => (
                <li key={i} data-kind={rel.kind}>{relationLabel(rel)}</li>
              ))}
            </ul>
          ) : (
            <p className="shijing-geju__relations-empty">{g.relationsEmpty}</p>
          )}
        </article>
      </div>
    </section>
  );
}
