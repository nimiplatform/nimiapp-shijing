// 命镜 · 七政四余 / 果老星宗 route.
//
// Plain view: deterministic 命格概览 + 命盘星图 + 逐颗星曜 + 重点格局, composed by
// qizheng-narrative.ts from the real chart. Data view: the raw 星盘依据 / 落宫 /
// 十二宫 tables. The history-grounded AI 解读 stays the on-demand bottom layer.

import { useMemo, useRef, useState } from 'react';
import type { QizhengSiyuSubjectChart } from '../../../domain/algorithm.ts';
import type { MingJingQizhengNatalMirrorOutput } from '../../../domain/mirror-output.ts';
import type { ReadingGenerationFailure } from '../../../domain/reading.ts';
import { useProductCopy } from '../../i18n/copy.ts';
import { MingJingQizhengReadingView } from './mingjing-qizheng-reading-view.tsx';
import { QizhengGlossaryProvider, GlossTerm } from './qizheng-glossary.tsx';
import { useQizhengNarrative, type QizhengStarView } from './qizheng-narrative.ts';
import { QizhengHero } from './qizheng-hero.tsx';
import { QizhengExplainer } from './qizheng-explainer.tsx';
import { QizhengChart } from './qizheng-chart.tsx';
import { QizhengStars, type QizhengStarAi } from './qizheng-stars.tsx';
import { QizhengPatterns } from './qizheng-patterns.tsx';

export interface QizhengMingJingRouteProps {
  readonly chart: QizhengSiyuSubjectChart;
  readonly natalReading: {
    readonly output: MingJingQizhengNatalMirrorOutput | null;
    readonly stale: boolean;
    readonly loading: boolean;
    readonly failure: ReadingGenerationFailure | null;
    readonly onGenerate: () => void;
  };
}

function formatLongitude(value: number): string {
  return `${value.toFixed(2)}°`;
}

function dayNightLabel(value: 'day' | 'night', labels: { readonly day: string; readonly night: string }): string {
  return value === 'day' ? labels.day : labels.night;
}

function formatHouseModelLabel(
  value: string,
  labels: { readonly equalHouseFromAscendantV1: string },
): string {
  return value === 'equal-house-from-ascendant-v1' ? labels.equalHouseFromAscendantV1 : value;
}

function formatMansionModelLabel(
  value: string,
  labels: { readonly equalMansionV1: string },
): string {
  return value === '28-equal-mansion-v1' ? labels.equalMansionV1 : value;
}

function formatSiyuModelLabel(
  value: string,
  labels: { readonly nodeAxisVirtualPointAndApogee: string },
): string {
  return value === 'luohou-ascending-node;jidu-descending-node;ziqi-28-year-j2000;yuebei-mean-lunar-apogee'
    ? labels.nodeAxisVirtualPointAndApogee
    : value;
}

export function QizhengMingJingRoute({ chart, natalReading }: QizhengMingJingRouteProps) {
  const narrative = useQizhengNarrative();
  const hero = useMemo(() => narrative.hero(chart), [narrative, chart]);
  const palaces = useMemo(() => narrative.palaces(chart), [narrative, chart]);
  const stars = useMemo(() => narrative.stars(chart), [narrative, chart]);
  const patterns = useMemo(() => narrative.patterns(chart), [narrative, chart]);

  const defaultIndex = useMemo(() => {
    let best = palaces[0];
    for (const palace of palaces) {
      if (palace.occupants.length > (best?.occupants.length ?? -1)) best = palace;
    }
    return best?.index ?? 0;
  }, [palaces]);

  const [view, setView] = useState<'plain' | 'data'>('plain');
  const [selectedIndex, setSelectedIndex] = useState(defaultIndex);
  const chartRef = useRef<HTMLDivElement>(null);

  const aiByKey = useMemo<Record<string, QizhengStarAi>>(() => {
    const map: Record<string, QizhengStarAi> = {};
    for (const item of natalReading.output?.star_guidance ?? []) {
      map[item.body_key] = { theme: item.theme, strategy: item.strategy };
    }
    return map;
  }, [natalReading.output]);

  const goPalace = (houseName: string) => {
    const target = palaces.find((p) => p.name === houseName);
    if (target) setSelectedIndex(target.index);
    chartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <QizhengGlossaryProvider gloss={narrative.gloss}>
      <div className="shijing-mingjing__panels shijing-qz" data-mingjing-route="qizheng_siyu_guolao_v1">
        <QizhengHero hero={hero} />

        <QizhengViewToggle view={view} onChange={setView} />

        {view === 'plain' ? (
          <div className="shijing-qz-plain">
            <QizhengExplainer />
            <div ref={chartRef} className="shijing-mingjing__anchor">
              <QizhengChart
                palaces={palaces}
                selectedIndex={selectedIndex}
                onSelect={setSelectedIndex}
                mingZhuLabel={hero.mingZhuLabel}
                basisLabel={hero.basisLabel}
              />
            </div>
            <QizhengStars stars={stars} aiByKey={aiByKey} onGoPalace={goPalace} />
            <QizhengPatterns patterns={patterns} />
          </div>
        ) : (
          <QizhengDataView chart={chart} stars={stars} />
        )}

        <MingJingQizhengReadingView
          output={natalReading.output}
          stale={natalReading.stale}
          loading={natalReading.loading}
          failure={natalReading.failure}
          onGenerate={natalReading.onGenerate}
          heroTitle={hero.title}
        />
      </div>
    </QizhengGlossaryProvider>
  );
}

function QizhengViewToggle({
  view,
  onChange,
}: {
  readonly view: 'plain' | 'data';
  readonly onChange: (view: 'plain' | 'data') => void;
}) {
  const x = useProductCopy().mingjing.qizhengExplore;
  return (
    <div className="shijing-qz-view-toggle">
      <p className="shijing-qz-view-toggle__intro">{x.viewIntro}</p>
      <div className="shijing-qz-toggle" role="tablist" aria-label={x.viewToggleAria}>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'plain'}
          className="shijing-qz-toggle__btn"
          data-active={view === 'plain' ? '' : undefined}
          onClick={() => onChange('plain')}
        >
          {x.viewPlain}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'data'}
          className="shijing-qz-toggle__btn"
          data-active={view === 'data' ? '' : undefined}
          onClick={() => onChange('data')}
        >
          {x.viewData}
        </button>
      </div>
    </div>
  );
}

function QizhengDataView({
  chart,
  stars,
}: {
  readonly chart: QizhengSiyuSubjectChart;
  readonly stars: readonly QizhengStarView[];
}) {
  const copy = useProductCopy();
  const q = copy.mingjing.qizhengRoute;
  const x = copy.mingjing.qizhengExplore;
  const basis = chart.chart_basis;

  const basisRows = [
    { term: '上升度', k: q.ascendant, v: formatLongitude(basis.ascendant_longitude) },
    { term: '昼夜盘', k: q.dayNight, v: dayNightLabel(basis.day_night, q.dayNightLabels) },
    { term: '宫制', k: q.houseModel, v: formatHouseModelLabel(basis.house_model, q.houseModelValues) },
    { term: '宿', k: q.mansionModel, v: formatMansionModelLabel(basis.mansion_model, q.mansionModelValues) },
    { term: '四余', k: q.siyuModel, v: formatSiyuModelLabel(basis.siyu_model, q.siyuModelValues) },
  ];

  return (
    <div className="shijing-qz-data">
      <section className="shijing-mingjing-panel" aria-label={q.chartAria}>
        <div className="shijing-qz-section-head">
          <h3 className="shijing-qz-section-title">{x.basisSectionTitle}</h3>
          <span className="shijing-qz-section-hint">{x.basisSectionHint}</span>
        </div>
        <div className="shijing-qz-basis">
          {basisRows.map((row) => (
            <div key={row.term} className="shijing-qz-basis__item">
              <div className="shijing-qz-basis__k">
                <GlossTerm termKey={row.term}>{row.k}</GlossTerm>
              </div>
              <div className="shijing-qz-basis__v">{row.v}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="shijing-mingjing-panel" aria-label={q.bodiesTitle}>
        <h3 className="shijing-qz-section-title shijing-qz-section-title--solo">{q.bodiesTitle}</h3>
        <div className="shijing-qz-luogong">
          <div className="shijing-qz-luogong__head">
            <span>{q.bodyColumns.body}</span>
            <span>{q.bodyColumns.house}</span>
            <span><GlossTerm termKey="宿">{q.bodyColumns.mansion}</GlossTerm></span>
            <span><GlossTerm termKey="宫势">{q.bodyColumns.position}</GlossTerm></span>
            <span><GlossTerm termKey="黄道度">{q.bodyColumns.longitude}</GlossTerm></span>
          </div>
          {stars.map((star) => (
            <div key={star.key} className="shijing-qz-luogong__row">
              <span className="shijing-qz-luogong__name">
                <span className="shijing-qz-luogong__dot" style={{ background: star.color }} />
                <b>{star.label}</b>
              </span>
              <span>{star.houseName}</span>
              <span className="shijing-qz-luogong__mono">{star.mansion}</span>
              <span>
                <span className="shijing-qz-chip" data-strength={star.strength}>{star.strengthLabel}</span>
              </span>
              <span className="shijing-qz-luogong__mono">{star.degree}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="shijing-mingjing-panel" aria-label={q.housesTitle}>
        <h3 className="shijing-qz-section-title shijing-qz-section-title--solo">{q.housesTitle}</h3>
        <div className="shijing-qz-palace-list">
          {chart.houses.map((house) => {
            const occ = house.body_keys
              .map((key) => chart.bodies.find((body) => body.key === key)?.label ?? key)
              .join(' · ');
            return (
              <div key={house.name} className="shijing-qz-palace-row">
                <b className="shijing-qz-palace-row__name">{house.name}</b>
                <span className="shijing-qz-palace-row__range">
                  {formatLongitude(house.start_longitude)} – {formatLongitude(house.end_longitude)}
                </span>
                <span className="shijing-qz-palace-row__occ" data-empty={occ ? undefined : ''}>
                  {occ || q.emptyHouse}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
