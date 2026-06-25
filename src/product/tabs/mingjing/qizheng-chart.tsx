// 命镜 · 七政四余 — 命盘星图 (schematic house wheel) + selected-palace detail.

import type { CSSProperties } from 'react';
import { useProductCopy } from '../../i18n/copy.ts';
import { GlossTerm } from './qizheng-glossary.tsx';
import type { QizhengPalaceView, QizhengStarView } from './qizheng-narrative.ts';

function mingColorOf(palaces: readonly QizhengPalaceView[]): string {
  for (const palace of palaces) {
    const ming = palace.occupants.find((occ) => occ.isMing);
    if (ming) return ming.color;
  }
  return '#5a8ec0';
}

const R = 168;
const RI = 96;
const MID_R = (R + RI) / 2;

function polar(r: number, angle: number): [number, number] {
  const a = (angle * Math.PI) / 180;
  return [180 + r * Math.sin(a), 180 - r * Math.cos(a)];
}

function segmentPath(index: number): string {
  const mid = index * 30;
  const [x1, y1] = polar(R, mid - 15);
  const [x2, y2] = polar(R, mid + 15);
  const [x3, y3] = polar(RI, mid + 15);
  const [x4, y4] = polar(RI, mid - 15);
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L${x3.toFixed(1)} ${y3.toFixed(1)} A${RI} ${RI} 0 0 0 ${x4.toFixed(1)} ${y4.toFixed(1)} Z`;
}

export function QizhengChart({
  palaces,
  selectedIndex,
  onSelect,
  mingZhuLabel,
  basisLabel,
}: {
  readonly palaces: readonly QizhengPalaceView[];
  readonly selectedIndex: number;
  readonly onSelect: (index: number) => void;
  readonly mingZhuLabel: string;
  readonly basisLabel: string;
}) {
  const copy = useProductCopy();
  const x = copy.mingjing.qizhengExplore;
  const selected = palaces.find((p) => p.index === selectedIndex) ?? palaces[0];

  return (
    <section className="shijing-mingjing-panel shijing-qz-chart" aria-label={x.chartTitle}>
      <div className="shijing-qz-section-head">
        <h3 className="shijing-qz-section-title">{x.chartTitle}</h3>
        <span className="shijing-qz-section-hint">{x.chartHint}</span>
      </div>

      <div className="shijing-qz-chart__layout">
        <div className="shijing-qz-wheel">
          <svg viewBox="0 0 360 360" className="shijing-qz-wheel__svg" role="img" aria-label={x.chartTitle}>
            {palaces.map((palace) => {
              const isSel = palace.index === selectedIndex;
              const occupied = palace.occupants.length > 0;
              const fill = isSel
                ? 'rgba(78,204,163,0.18)'
                : occupied
                  ? 'rgba(255,255,255,0.5)'
                  : 'rgba(248,250,252,0.4)';
              const style: CSSProperties = {
                fill,
                stroke: isSel ? 'var(--mingjing-accent)' : 'var(--mingjing-card-border)',
                strokeWidth: isSel ? 1.6 : 1,
                cursor: 'pointer',
                transition: 'fill 160ms, stroke 160ms',
              };
              return (
                <path
                  key={palace.name}
                  d={segmentPath(palace.index)}
                  style={style}
                  onClick={() => onSelect(palace.index)}
                />
              );
            })}
            {palaces.map((palace) => {
              const isSel = palace.index === selectedIndex;
              const occupied = palace.occupants.length > 0;
              const [lx, ly] = polar(MID_R + 22, palace.index * 30);
              const labelStyle: CSSProperties = {
                fill: isSel ? '#1f8a5b' : occupied ? 'var(--mingjing-ink-strong)' : 'var(--mingjing-ink-faint)',
                fontSize: '13px',
                fontWeight: isSel || occupied ? 700 : 500,
                textAnchor: 'middle',
                dominantBaseline: 'middle',
                pointerEvents: 'none',
              };
              return (
                <g key={palace.name}>
                  <text x={lx.toFixed(1)} y={ly.toFixed(1)} style={labelStyle}>
                    {palace.name}
                  </text>
                  {palace.occupants.map((occ, k) => {
                    const n = palace.occupants.length;
                    const da = (k - (n - 1) / 2) * 13;
                    const [cx, cy] = polar(MID_R - 14, palace.index * 30 + da);
                    return <circle key={occ.key} cx={cx.toFixed(1)} cy={cy.toFixed(1)} r={3.6} style={{ fill: occ.color }} />;
                  })}
                </g>
              );
            })}
          </svg>
          <div className="shijing-qz-wheel__center" style={{ '--qz-ming-color': mingColorOf(palaces) } as CSSProperties}>
            <div className="shijing-qz-wheel__center-eyebrow">{x.wheelCenterEyebrow}</div>
            <div className="shijing-qz-wheel__center-star">{mingZhuLabel}</div>
            <div className="shijing-qz-wheel__center-basis">{basisLabel}</div>
          </div>
        </div>

        <QizhengPalaceDetail palace={selected} />
      </div>
    </section>
  );
}

function QizhengPalaceDetail({ palace }: { readonly palace: QizhengPalaceView }) {
  const x = useProductCopy().mingjing.qizhengExplore;
  return (
    <div className="shijing-qz-detail">
      <div className="shijing-qz-detail__head">
        <span className="shijing-qz-detail__name">{palace.name}</span>
        <span className="shijing-qz-detail__count">{palace.countLabel}</span>
        <span className="shijing-qz-detail__range">{palace.range}</span>
      </div>
      <p className="shijing-qz-detail__domain">{palace.domain}</p>

      {palace.occupants.map((occ) => (
        <QizhengOccupantRow key={occ.key} star={occ} />
      ))}

      {palace.isEmpty ? (
        <div className="shijing-qz-detail__empty">
          <div className="shijing-qz-detail__empty-title">
            <GlossTerm termKey="空宫">{x.terms.emptyHouse}</GlossTerm> · {x.emptyDetail}
          </div>
          {palace.ruler ? <div className="shijing-qz-detail__ruler">{palace.ruler}</div> : null}
        </div>
      ) : null}

      <div className="shijing-qz-detail__deep">
        <div className="shijing-qz-deep-label">{x.deepTitle}</div>
        <p className="shijing-qz-deep-text">{palace.deep}</p>
      </div>
    </div>
  );
}

function QizhengOccupantRow({ star }: { readonly star: QizhengStarView }) {
  const x = useProductCopy().mingjing.qizhengExplore;
  return (
    <div className="shijing-qz-occ">
      <span className="shijing-qz-glyph shijing-qz-glyph--sm" style={{ background: star.bg, color: star.color }}>
        {star.label}
      </span>
      <div className="shijing-qz-occ__body">
        <div className="shijing-qz-occ__head">
          <b>{star.label}</b>
          <span className="shijing-qz-occ__planet">{star.planet}</span>
          {star.isMing ? <span className="shijing-qz-tag shijing-qz-tag--ming">{x.terms.mingZhu}</span> : null}
          <span className="shijing-qz-tag" data-strength={star.strength}>{star.strengthLabel}</span>
        </div>
        <div className="shijing-qz-occ__meaning">{star.essence}</div>
      </div>
    </div>
  );
}
