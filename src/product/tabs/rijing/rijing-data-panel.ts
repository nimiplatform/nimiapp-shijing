import type { FiveElement, ShijingStageLabel, StrengthBand } from '../../../domain/algorithm.ts';
import { STRENGTH_BANDS } from '../../../domain/algorithm.ts';
import type { Reading } from '../../../domain/reading.ts';
import { getProductCopy, type ProductCopy } from '../../i18n/copy.ts';
import { deriveMethodEvidenceChips, type MethodEvidenceChip } from '../shared/method-evidence-chips.ts';
import { BRANCH_HANZI, ELEMENT_HANZI, STEM_HANZI } from '../mingjing/ganzhi-hanzi.ts';

const DEFAULT_COPY = getProductCopy('zh');

export type RijingEvidenceChip = MethodEvidenceChip;

export interface RiJingDataElement {
  readonly element: FiveElement;
  readonly char: string;
}

export interface RiJingDataPillar {
  readonly position: 'year' | 'month' | 'day' | 'hour';
  readonly stem: string;
  readonly branch: string;
  readonly emphasis: boolean;
}

export interface RiJingBaziPanel {
  readonly strength?: {
    readonly band: StrengthBand;
    readonly index: number;
    readonly total: number;
  };
  readonly yong: readonly RiJingDataElement[];
  readonly pillars: readonly RiJingDataPillar[];
  readonly completeness: { readonly filled: number; readonly total: number };
  readonly stage?: ShijingStageLabel;
}

export interface RiJingDataPanel {
  readonly chips: readonly RijingEvidenceChip[];
  readonly bazi?: RiJingBaziPanel;
}

const DATA_PILLAR_ORDER: readonly ('year' | 'month' | 'day' | 'hour')[] = [
  'day',
  'year',
  'month',
  'hour',
];

export function deriveEvidenceChips(
  reading: Reading | undefined,
  copy: ProductCopy = DEFAULT_COPY,
): readonly RijingEvidenceChip[] {
  if (!reading) {
    return [{ group: copy.rijing.evidence.emptyChipGroup, value: copy.rijing.evidence.emptyChipValue }];
  }
  return deriveMethodEvidenceChips(reading);
}

export function deriveRiJingDataPanel(
  reading: Reading | undefined,
  copy: ProductCopy = DEFAULT_COPY,
): RiJingDataPanel {
  const chips = deriveEvidenceChips(reading, copy);
  if (!reading) return { chips };
  const fs = reading.inputs_summary.feature_snapshot;
  const me = fs.method_evidence;
  if (me.method_id !== 'bazi_ziping_v1') return { chips };

  const chart = me.bazi.self_subject.natal_chart;
  const interpretation = me.bazi.self_subject.interpretation;
  const pillarByPosition = {
    year: chart.year_pillar,
    month: chart.month_pillar,
    day: chart.day_pillar,
    hour: chart.hour_pillar,
  } as const;
  const pillars: RiJingDataPillar[] = [];
  for (const position of DATA_PILLAR_ORDER) {
    const pillar = pillarByPosition[position];
    if (!pillar) continue;
    pillars.push({
      position,
      stem: STEM_HANZI[pillar.stem],
      branch: BRANCH_HANZI[pillar.branch],
      emphasis: position === 'day',
    });
  }
  const stage = fs.common.stage_drivers[0]?.stage_label;
  const bazi: RiJingBaziPanel = {
    ...(interpretation
      ? {
          strength: {
            band: interpretation.strength.band,
            index: STRENGTH_BANDS.indexOf(interpretation.strength.band),
            total: STRENGTH_BANDS.length,
          },
        }
      : {}),
    yong: interpretation
      ? interpretation.yong_shen.yong.map((element) => ({ element, char: ELEMENT_HANZI[element] }))
      : [],
    pillars,
    completeness: { filled: 4 - chart.missing_pillars.length, total: 4 },
    ...(stage ? { stage } : {}),
  };
  return { chips, bazi };
}
