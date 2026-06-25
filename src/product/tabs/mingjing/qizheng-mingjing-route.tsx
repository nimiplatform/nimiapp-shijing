import type {
  QizhengSiyuBody,
  QizhengSiyuSubjectChart,
} from '../../../domain/algorithm.ts';
import type { MingJingQizhengNatalMirrorOutput } from '../../../domain/mirror-output.ts';
import type { ReadingGenerationFailure } from '../../../domain/reading.ts';
import { useProductCopy } from '../../i18n/copy.ts';
import { MingJingQizhengReadingView } from './mingjing-qizheng-reading-view.tsx';

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

function bodyRows(bodies: readonly QizhengSiyuBody[]): readonly QizhengSiyuBody[] {
  return [...bodies].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'qizheng' ? -1 : 1;
    return a.longitude - b.longitude;
  });
}

function formatHouseModelLabel(
  value: string,
  labels: { readonly equalHouseFromAscendantV1: string },
): string {
  return value === 'equal-house-from-ascendant-v1'
    ? labels.equalHouseFromAscendantV1
    : value;
}

function formatMansionModelLabel(
  value: string,
  labels: { readonly equalMansionV1: string },
): string {
  return value === '28-equal-mansion-v1'
    ? labels.equalMansionV1
    : value;
}

function formatSiyuModelLabel(
  value: string,
  labels: { readonly nodeAxisVirtualPointAndApogee: string },
): string {
  return value === 'luohou-ascending-node;jidu-descending-node;ziqi-28-year-j2000;yuebei-mean-lunar-apogee'
    ? labels.nodeAxisVirtualPointAndApogee
    : value;
}

export function QizhengMingJingRoute({
  chart,
  natalReading,
}: QizhengMingJingRouteProps) {
  const copy = useProductCopy();
  const q = copy.mingjing.qizhengRoute;
  const basis = natalReading.output?.chart_basis ?? chart.chart_basis;

  return (
    <div className="shijing-mingjing__panels" data-mingjing-route="qizheng_siyu_guolao_v1">
      <section className="shijing-mingjing-panel" aria-label={q.chartAria}>
        <header className="shijing-mingjing-panel__head">
          <div>
            <p className="shijing-mingjing__eyebrow">{q.eyebrow}</p>
            <h2 className="shijing-mingjing-panel__title">{q.chartTitle}</h2>
          </div>
        </header>
        <dl className="shijing-mj-reading__core">
          <div className="shijing-mj-reading__core-item">
            <dt>{q.ascendant}</dt>
            <dd>{formatLongitude(basis.ascendant_longitude)}</dd>
          </div>
          <div className="shijing-mj-reading__core-item">
            <dt>{q.dayNight}</dt>
            <dd>{dayNightLabel(basis.day_night, q.dayNightLabels)}</dd>
          </div>
          <div className="shijing-mj-reading__core-item">
            <dt>{q.houseModel}</dt>
            <dd>{formatHouseModelLabel(basis.house_model, q.houseModelValues)}</dd>
          </div>
          <div className="shijing-mj-reading__core-item">
            <dt>{q.mansionModel}</dt>
            <dd>{formatMansionModelLabel(basis.mansion_model, q.mansionModelValues)}</dd>
          </div>
          <div className="shijing-mj-reading__core-item">
            <dt>{q.siyuModel}</dt>
            <dd>{formatSiyuModelLabel(basis.siyu_model, q.siyuModelValues)}</dd>
          </div>
        </dl>
      </section>

      <section className="shijing-mingjing-panel" aria-label={q.bodiesTitle}>
        <header className="shijing-mingjing-panel__head">
          <h2 className="shijing-mingjing-panel__title">{q.bodiesTitle}</h2>
        </header>
        <div className="shijing-mingjing-table-wrap">
          <table className="shijing-mingjing-table">
            <thead>
              <tr>
                <th>{q.bodyColumns.body}</th>
                <th>{q.bodyColumns.house}</th>
                <th>{q.bodyColumns.mansion}</th>
                <th>{q.bodyColumns.position}</th>
                <th>{q.bodyColumns.longitude}</th>
              </tr>
            </thead>
            <tbody>
              {bodyRows(chart.bodies).map((body) => (
                <tr key={body.key}>
                  <td>{body.label}</td>
                  <td>{body.house_name}</td>
                  <td>{body.mansion}</td>
                  <td>{body.position_class}</td>
                  <td>{formatLongitude(body.longitude)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="shijing-mingjing-panel" aria-label={q.housesTitle}>
        <header className="shijing-mingjing-panel__head">
          <h2 className="shijing-mingjing-panel__title">{q.housesTitle}</h2>
        </header>
        <ul className="shijing-mj-reading__strategies">
          {chart.houses.map((house) => {
            const bodyLabels = house.body_keys
              .map((key) => chart.bodies.find((body) => body.key === key)?.label ?? key);
            return (
              <li
                key={house.name}
                className="shijing-mj-reading__strategy"
                data-empty={bodyLabels.length === 0 ? 'true' : 'false'}
              >
                <div className="shijing-mj-reading__phase">
                  <span className="shijing-mj-reading__pillar">{house.name}</span>
                  <span className="shijing-mj-reading__age">
                    {formatLongitude(house.start_longitude)} - {formatLongitude(house.end_longitude)}
                  </span>
                  <span className="shijing-mj-reading__theme">
                    {bodyLabels.length > 0 ? bodyLabels.join(' · ') : q.emptyHouse}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <MingJingQizhengReadingView
        output={natalReading.output}
        stale={natalReading.stale}
        loading={natalReading.loading}
        failure={natalReading.failure}
        onGenerate={natalReading.onGenerate}
      />
    </div>
  );
}
