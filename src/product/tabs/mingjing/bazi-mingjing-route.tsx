import type { RefObject } from 'react';

import type { MingJingChart } from '../../../domain/mingjing.ts';
import type {
  MingJingMirrorOutput,
} from '../../../domain/mirror-output.ts';
import type { ShiJingSpace } from '../../../domain/shijing-space.ts';
import type { ReadingGenerationFailure } from '../../../domain/reading.ts';
import type { ProductCopy } from '../../i18n/copy.ts';
import { MingJingDayun } from './mingjing-dayun.tsx';
import { MingJingEvents } from './mingjing-events.tsx';
import { MingJingHero } from './mingjing-hero.tsx';
import { MingJingLiunian } from './mingjing-liunian.tsx';
import { MingJingPaipan } from './mingjing-paipan.tsx';
import { MingJingReadingView } from './mingjing-reading-view.tsx';
import { MingJingRectify } from './mingjing-rectify.tsx';

export interface BaziMingJingRouteProps {
  readonly copy: ProductCopy['mingjing'];
  readonly chart: MingJingChart;
  readonly space: ShiJingSpace;
  readonly stagesRef: RefObject<HTMLDivElement | null>;
  readonly onSeeStages: () => void;
  readonly onSpaceChange: (next: ShiJingSpace) => void;
  readonly natalReading: {
    readonly output: MingJingMirrorOutput | null;
    readonly stale: boolean;
    readonly loading: boolean;
    readonly failure: ReadingGenerationFailure | null;
    readonly onGenerate: () => void;
  };
  readonly rectification: {
    readonly open: boolean;
    readonly onOpen: () => void;
    readonly onClose: () => void;
  };
}

export function BaziMingJingRoute({
  copy,
  chart,
  space,
  stagesRef,
  onSeeStages,
  onSpaceChange,
  natalReading,
  rectification,
}: BaziMingJingRouteProps) {
  return (
    <>
      <MingJingHero chart={chart} onSeeStages={onSeeStages} />
      <div className="shijing-mingjing__panels" data-mingjing-route="bazi_ziping_v1">
        <MingJingPaipan chart={chart} />
        <div ref={stagesRef} className="shijing-mingjing__anchor">
          <MingJingDayun dayun={chart.dayun} />
        </div>
        <MingJingLiunian liunian={chart.liunian} />
        <MingJingEvents chart={chart} space={space} onSpaceChange={onSpaceChange} />
        <MingJingReadingView
          output={natalReading.output}
          stale={natalReading.stale}
          loading={natalReading.loading}
          failure={natalReading.failure}
          onGenerate={natalReading.onGenerate}
        />
      </div>
      {rectification.open ? (
        <MingJingRectify space={space} onSpaceChange={onSpaceChange} onClose={rectification.onClose} />
      ) : (
        <button
          type="button"
          className="shijing-mj-footer-cta"
          onClick={rectification.onOpen}
        >
          {copy.rectify.entryLive}
        </button>
      )}
    </>
  );
}
