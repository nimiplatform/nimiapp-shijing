// SJG-ALGO-16 — 命镜 natal projection orchestrator.
//
// Builds the deterministic MingJingChart for the self subject by reusing the
// bazi_ziping_v1 engine primitives (canonicalization → natal chart →
// interpretation → DaYun sequence) and the 命镜 feature modules (空亡, 五行分布,
// 格局, 大运结构, 流年关键窗口). This is a LIVE projection over already-persisted
// natal inputs — not a Reading and not part of the hashed feature-snapshot
// envelope (SJG-ALGO-08/16). Every failure is a typed StageResult error; the
// stage never throws and never returns placeholder data.

import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import type { MingJingChart } from '../../domain/mingjing.ts';
import { type StageResult } from './stage-result.ts';
import { canonicalizeNatalInputs } from './canonicalize-natal-inputs.ts';
import { buildBaziNatalChart, wallClockFromTrueSolarIso } from './engines/bazi/bazi-natal.ts';
import { eightCharOf, computeDayunSequence } from './engines/bazi/bazi-calendar.ts';
import { buildBaziInterpretation } from './engines/bazi/bazi-features.ts';
import { computeBaziVoid } from './engines/bazi/bazi-void.ts';
import { computeFiveElementDistribution } from './engines/bazi/bazi-five-elements.ts';
import { computeBaziPattern } from './engines/bazi/bazi-pattern.ts';
import { buildDayunStructure } from './engines/bazi/bazi-dayun-features.ts';
import { buildLiuNianProjection } from './engines/bazi/bazi-liunian.ts';

const SELF_REF = 'self' as const;

export interface BuildMingJingProjectionInput {
  readonly space: ShiJingSpace;
  // Anchors 大运/流年 "current" + the 流年 horizon. Defaults to the current UTC
  // year; injectable for deterministic tests.
  readonly reference_year?: number;
  readonly liunian_horizon_years?: number;
}

export function buildMingJingProjection(
  input: BuildMingJingProjectionInput,
): StageResult<MingJingChart> {
  const natalInputs = input.space.self_subject.natal_inputs;

  const canon = canonicalizeNatalInputs(natalInputs);
  if (!canon.ok) return canon;

  const natalResult = buildBaziNatalChart(SELF_REF, canon.value);
  if (!natalResult.ok) return natalResult;
  const natal = natalResult.value;

  if (!canon.value.true_solar_time_utc) {
    return {
      ok: false,
      error: {
        stage: 'mingjing_projection',
        kind: 'stage_missing_input',
        subject_ref: SELF_REF,
        detail: 'natal canonicalization missing true_solar_time_utc',
      },
    };
  }
  const wall = wallClockFromTrueSolarIso(canon.value.true_solar_time_utc);
  if (!wall) {
    return {
      ok: false,
      error: {
        stage: 'mingjing_projection',
        kind: 'stage_invalid_input',
        subject_ref: SELF_REF,
        detail: 'true_solar_time_utc is not a valid instant',
      },
    };
  }
  const eightChar = eightCharOf(wall);

  const interpretation = buildBaziInterpretation(eightChar, natal);
  if (!interpretation) {
    // 命镜 needs at least the day master + 月令 (旺衰/用神/格局 are undefined
    // otherwise). Fail closed rather than render a partial natal chart.
    return {
      ok: false,
      error: {
        stage: 'mingjing_projection',
        kind: 'stage_missing_input',
        subject_ref: SELF_REF,
        detail: 'insufficient birth precision for 命镜 (missing 日柱/月令 interpretation)',
      },
    };
  }

  const calculationSex = natalInputs.calculation_sex;
  if (calculationSex === 'unspecified') {
    return {
      ok: false,
      error: {
        stage: 'mingjing_projection',
        kind: 'stage_dayun_calculation_sex_unspecified',
        subject_ref: SELF_REF,
        detail: 'SJG-ALGO-07: calculation_sex required for the 命镜 大运 sequence',
      },
    };
  }

  const referenceYear = input.reference_year ?? new Date().getUTCFullYear();
  const sequence = computeDayunSequence(wall, calculationSex);

  const dayun = buildDayunStructure({
    sequence,
    natal,
    yong: interpretation.yong_shen,
    reference_year: referenceYear,
  });
  const liunian = buildLiuNianProjection({
    natal,
    yong: interpretation.yong_shen,
    sequence,
    anchor_year: referenceYear,
    ...(input.liunian_horizon_years !== undefined ? { horizon_years: input.liunian_horizon_years } : {}),
  });

  const chart: MingJingChart = {
    subject_ref: SELF_REF,
    canonicalization_hash: natal.canonicalization_hash,
    natal_chart: natal,
    interpretation,
    void: computeBaziVoid(eightChar, natal),
    five_elements: computeFiveElementDistribution(eightChar, natal),
    pattern: computeBaziPattern(eightChar, natal),
    dayun,
    liunian,
    birth_precision: natalInputs.birth_precision,
  };
  return { ok: true, value: chart };
}
