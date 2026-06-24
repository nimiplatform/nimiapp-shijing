import type { ZiweiSubjectChart } from '../../../domain/algorithm.ts';
import type { MingJingZiweiNatalMirrorOutput } from '../../../domain/mirror-output.ts';
import type { ReadingGenerationFailure } from '../../../domain/reading.ts';
import { useProductCopy } from '../../i18n/copy.ts';
import { ZiweiAstrolabe } from '../shared/ziwei-astrolabe.tsx';
import { MingJingZiweiReadingView } from './mingjing-ziwei-reading-view.tsx';

export interface ZiweiMingJingRouteProps {
  readonly chart: ZiweiSubjectChart;
  readonly natalReading: {
    readonly output: MingJingZiweiNatalMirrorOutput | null;
    readonly stale: boolean;
    readonly loading: boolean;
    readonly failure: ReadingGenerationFailure | null;
    readonly onGenerate: () => void;
  };
}

function palaceName(chart: ZiweiSubjectChart, predicate: (index: number) => boolean): string {
  return chart.palaces.find((palace) => predicate(palace.index))?.name ?? 'unknown';
}

function soulPalaceName(chart: ZiweiSubjectChart): string {
  return chart.palaces.find((palace) => palace.is_soul)?.name ?? 'unknown';
}

function bodyPalaceName(chart: ZiweiSubjectChart): string {
  return chart.palaces.find((palace) => palace.is_body)?.name ?? 'unknown';
}

export function ZiweiMingJingRoute({
  chart,
  natalReading,
}: ZiweiMingJingRouteProps) {
  const copy = useProductCopy();
  const z = copy.mingjing.ziweiRoute;
  const basis = natalReading.output?.chart_basis;

  return (
    <div className="shijing-mingjing__panels" data-mingjing-route="ziwei_sanhe_v1">
      <section className="shijing-mingjing-panel" aria-label={z.chartAria}>
        <header className="shijing-mingjing-panel__head">
          <div>
            <p className="shijing-mingjing__eyebrow">{z.eyebrow}</p>
            <h2 className="shijing-mingjing-panel__title">{z.chartTitle}</h2>
          </div>
        </header>
        <dl className="shijing-mj-reading__core">
          <div className="shijing-mj-reading__core-item">
            <dt>{z.soulPalace}</dt>
            <dd>{basis?.soul_palace_name ?? soulPalaceName(chart)} / {chart.soul_palace_branch}</dd>
          </div>
          <div className="shijing-mj-reading__core-item">
            <dt>{z.bodyPalace}</dt>
            <dd>{basis?.body_palace_name ?? bodyPalaceName(chart)}</dd>
          </div>
          <div className="shijing-mj-reading__core-item">
            <dt>{z.fiveElementsClass}</dt>
            <dd>{basis?.five_elements_class ?? chart.five_elements_class}</dd>
          </div>
          <div className="shijing-mj-reading__core-item">
            <dt>{z.soulBodyStar}</dt>
            <dd>{basis ? `${basis.soul_star} / ${basis.body_star}` : `${chart.soul_star} / ${chart.body_star}`}</dd>
          </div>
          <div className="shijing-mj-reading__core-item">
            <dt>{z.palaces}</dt>
            <dd>{basis?.palace_count ?? chart.palaces.length}</dd>
          </div>
          <div className="shijing-mj-reading__core-item">
            <dt>{z.anchorPalace}</dt>
            <dd>{palaceName(chart, (index) => index === 0)}</dd>
          </div>
        </dl>
      </section>

      <section className="shijing-mingjing-panel" aria-label={z.astrolabeAria}>
        <ZiweiAstrolabe chart={chart} />
      </section>

      <MingJingZiweiReadingView
        output={natalReading.output}
        stale={natalReading.stale}
        loading={natalReading.loading}
        failure={natalReading.failure}
        onGenerate={natalReading.onGenerate}
      />
    </div>
  );
}
