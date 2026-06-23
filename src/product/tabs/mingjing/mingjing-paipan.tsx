// 命镜 · 八字排盘 — visible four-pillar natal chart + five-element balance, with
// a collapsible expert table for 藏干 / 纳音 / 十二长生 / 空亡.

import { useId, useState } from 'react';
import { useProductCopy } from '../../i18n/copy.ts';
import type { MingJingChart } from '../../../domain/mingjing.ts';
import type { FiveElement, PillarPosition } from '../../../domain/algorithm.ts';
import { FIVE_ELEMENTS } from '../../astrology/element-relations.ts';
import { BRANCH_ELEMENT, BRANCH_HANZI, STEM_ELEMENT, STEM_HANZI } from './ganzhi-hanzi.ts';
import { MingJingInfo } from './mingjing-info.tsx';
import { ChevronDownIcon } from '../rijing/rijing-icons.tsx';

const PILLAR_ORDER: readonly PillarPosition[] = ['year', 'month', 'day', 'hour'];

interface PaipanColumn {
  readonly position: PillarPosition;
  readonly stemHanzi: string;
  readonly stemElement: FiveElement;
  readonly branchHanzi: string;
  readonly branchElement: FiveElement;
  readonly hidden: readonly { readonly hanzi: string; readonly element: FiveElement; readonly weight: string }[];
  readonly tenGod: string;
  readonly nayin: string;
  readonly terrain: string;
  readonly isVoid: boolean;
  readonly isDay: boolean;
}

type MingJingPaipanCopy = ReturnType<typeof useProductCopy>['mingjing']['paipan'];

export function MingJingPaipan({ chart }: { readonly chart: MingJingChart }) {
  const copy = useProductCopy();
  const m = copy.mingjing.paipan;
  const elementLabels = copy.mingjing.fiveElements.labels;
  const geju = copy.mingjing.geju;
  const [expanded, setExpanded] = useState(false);
  const detailId = useId();

  const columns: PaipanColumn[] = [];
  for (const position of PILLAR_ORDER) {
    const pillar = chart.natal_chart[`${position}_pillar`];
    const feature = chart.interpretation.pillars.find((p) => p.position === position);
    if (!pillar || !feature) continue;
    columns.push({
      position,
      stemHanzi: STEM_HANZI[pillar.stem],
      stemElement: STEM_ELEMENT[pillar.stem],
      branchHanzi: BRANCH_HANZI[pillar.branch],
      branchElement: BRANCH_ELEMENT[pillar.branch],
      hidden: feature.hidden_stems.map((h) => ({
        hanzi: STEM_HANZI[h.stem],
        element: STEM_ELEMENT[h.stem],
        weight: h.weight_class,
      })),
      tenGod: feature.ten_god,
      nayin: feature.nayin,
      terrain: feature.terrain,
      isVoid: chart.void.void_positions.includes(position),
      isDay: position === 'day',
    });
  }

  const yongElements = chart.interpretation.yong_shen.yong;
  const jiElements = chart.interpretation.yong_shen.ji;
  const relations = chart.interpretation.natal_branch_relations;

  return (
    <section className="shijing-mingjing-paipan" aria-label={m.title}>
      <div className="shijing-paipan__head">
        <div>
          <h2 className="shijing-paipan__title">{m.sectionTitle}</h2>
          <p className="shijing-paipan__intro">{m.sectionIntro}</p>
        </div>
        <span className="shijing-paipan__structure-badge">
          {chart.pattern.name} · {chart.interpretation.strength.band}
        </span>
      </div>

      <MingJingPillarCards columns={columns} copy={m} />
      <MingJingFiveElements chart={chart} elementLabels={elementLabels} />

      <button
        type="button"
        className="shijing-paipan__toggle"
        aria-expanded={expanded}
        aria-controls={detailId}
        onClick={() => setExpanded((value) => !value)}
      >
        <span>{expanded ? m.collapse : m.expand}</span>
        <ChevronDownIcon className="shijing-paipan__toggle-icon" />
      </button>

      {expanded ? (
        <div id={detailId} className="shijing-paipan__detail">
          <p className="shijing-paipan__detail-title">{m.detailTitle}</p>
          <div className="shijing-paipan__table-wrap">
            <table className="shijing-paipan__table">
              <thead>
                <tr>
                  <th className="shijing-paipan__corner" scope="col"></th>
                  {columns.map((col) => (
                    <th key={col.position} scope="col" data-daymaster={col.isDay ? '' : undefined}>
                      {m.pillarLabels[col.position]}
                      {col.isDay ? <span>{m.dayMaster}</span> : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th className="shijing-paipan__row-label" scope="row">{m.rows.hidden}</th>
                  {columns.map((col) => (
                    <td key={col.position}>
                      <span className="shijing-paipan__hidden-run">
                        {col.hidden.map((h, index) => (
                          <em key={`${h.hanzi}-${index}`} data-element={h.element} data-weight={h.weight}>{h.hanzi}</em>
                        ))}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th className="shijing-paipan__row-label" scope="row">{m.rows.nayin}</th>
                  {columns.map((col) => <td key={col.position}>{col.nayin}</td>)}
                </tr>
                <tr>
                  <th className="shijing-paipan__row-label" scope="row">{m.rows.terrain}</th>
                  {columns.map((col) => <td key={col.position}>{col.terrain}</td>)}
                </tr>
                <tr>
                  <th className="shijing-paipan__row-label" scope="row">{m.rows.voidRow}</th>
                  {columns.map((col) => <td key={col.position}>{col.isVoid ? m.voidMark : m.voidEmpty}</td>)}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="shijing-paipan__summary" aria-label={geju.title}>
            <span className="shijing-paipan__summary-chip">
              {geju.strengthLabel}: <strong>{chart.interpretation.strength.band}</strong>
              <span>({geju.supportRatioLabel} {chart.interpretation.strength.support_ratio.toFixed(3)})</span>
            </span>
            <span className="shijing-paipan__summary-chip">
              {geju.yong}: <ElementNames elements={yongElements} elementLabels={elementLabels} />
            </span>
            <span className="shijing-paipan__summary-chip shijing-paipan__summary-chip--muted">
              {geju.ji}: <ElementNames elements={jiElements} elementLabels={elementLabels} />
            </span>
            <span className="shijing-paipan__summary-chip">
              {geju.relationsLabel}: {relations.length > 0 ? relations.map((r) => relationLabel(r.positions, m.pillarLabels, r.kind)).join(' / ') : geju.relationsEmpty}
            </span>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function MingJingPillarCards({
  columns,
  copy,
}: {
  readonly columns: readonly PaipanColumn[];
  readonly copy: MingJingPaipanCopy;
}) {
  return (
    <div className="shijing-paipan__pillar-grid" aria-label={copy.sectionTitle}>
      {columns.map((col) => (
        <article
          key={col.position}
          className="shijing-paipan__pillar-card"
          data-daymaster={col.isDay ? '' : undefined}
        >
          {col.isDay ? <span className="shijing-paipan__day-badge">{copy.dayBadge}</span> : null}
          <p className="shijing-paipan__pillar-role">
            {copy.pillarLabels[col.position]} · {copy.roles[col.position]}
          </p>
          <p
            className="shijing-paipan__glyphs"
            aria-label={`${copy.pillarLabels[col.position]} ${col.stemHanzi}${col.branchHanzi}`}
          >
            <span data-element={col.stemElement}>{col.stemHanzi}</span>
            <span data-element={col.branchElement}>{col.branchHanzi}</span>
          </p>
          <p className="shijing-paipan__ten-god">
            {col.isDay
              ? `${copy.dayMaster} · ${copy.roles.day}`
              : `${copy.rows.tenGod} · ${col.tenGod}`}
          </p>
        </article>
      ))}
    </div>
  );
}

function relationLabel(
  positions: readonly PillarPosition[],
  pillarLabels: Record<PillarPosition, string>,
  kind: string,
): string {
  return `${positions.map((position) => pillarLabels[position]).join('-')}${kind}`;
}

function ElementNames({
  elements,
  elementLabels,
}: {
  readonly elements: readonly FiveElement[];
  readonly elementLabels: Record<FiveElement, string>;
}) {
  if (elements.length === 0) return <span className="shijing-paipan__empty">—</span>;
  return (
    <>
      {elements.map((el, index) => (
        <span key={el} data-element={el}>
          {index > 0 ? '、' : ''}
          {elementLabels[el]}
        </span>
      ))}
    </>
  );
}

function MingJingFiveElements({
  chart,
  elementLabels,
}: {
  readonly chart: MingJingChart;
  readonly elementLabels: Record<FiveElement, string>;
}) {
  const copy = useProductCopy().mingjing.fiveElements;
  const dist = chart.five_elements;
  const max = Math.max(1, ...FIVE_ELEMENTS.map((el) => dist.count[el]));
  const summary = fiveElementSummary(chart, elementLabels, copy);

  return (
    <div className="shijing-mingjing-five" aria-label={copy.title}>
      <div className="shijing-mingjing-five__head shijing-mingjing-panel__title-row">
        <h3 className="shijing-mingjing-five__title">{copy.title}</h3>
        <p className="shijing-mingjing-five__summary">{summary}</p>
        <MingJingInfo label={`${copy.title}说明`}>
          <p>{copy.explanation}</p>
        </MingJingInfo>
      </div>
      <div className="shijing-mingjing-five__bars">
        {FIVE_ELEMENTS.map((el) => (
          <div
            key={el}
            className="shijing-mingjing-five__bar"
            data-element={el}
            data-dominant={el === dist.dominant ? '' : undefined}
            data-weakest={el === dist.weakest ? '' : undefined}
          >
            <span className="shijing-mingjing-five__count">{dist.count[el]}</span>
            <span className="shijing-mingjing-five__value" style={{ height: `${Math.round((dist.count[el] / max) * 100)}%` }} />
            <span className="shijing-mingjing-five__label">{elementLabels[el]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function fiveElementSummary(
  chart: MingJingChart,
  elementLabels: Record<FiveElement, string>,
  copy: ReturnType<typeof useProductCopy>['mingjing']['fiveElements'],
): string {
  const dist = chart.five_elements;
  const dominant = `${elementLabels[dist.dominant]}${copy.dominant}（${dist.count[dist.dominant]}）`;
  const weakest = `${elementLabels[dist.weakest]}${copy.weakest}（${dist.count[dist.weakest]}）`;
  const balance = dist.absent.length > 0
    ? `${copy.absentLabel}${dist.absent.map((el) => elementLabels[el]).join('')}`
    : copy.absentNone;
  const yong = chart.interpretation.yong_shen.yong;
  const band = chart.interpretation.strength.band;
  const supportNeed = band.includes('弱') && yong.length > 0
    ? `，但偏弱缺${yong.map((el) => elementLabels[el]).join('')}`
    : '';
  return `${dominant} · ${weakest} · ${balance}${supportNeed}`;
}
