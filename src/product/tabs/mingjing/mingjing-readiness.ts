// SJG-IA-05 / SJG-IA-08 — readiness for the 命镜 natal projection.
//
// 命镜 renders the full whole-life chart (four pillars incl. 时柱, 大运 sequence),
// so it requires exact birth precision and a specified calculation sex (DaYun,
// SJG-ALGO-07). Reuses the shared NatalReadiness reason codes (i18n headlines +
// severities) rather than inventing parallel ones.

import type { ShiJingSpace } from '../../../domain/shijing-space.ts';
import { subjectNatalReadiness, type NatalReadiness } from '../../subjects/natal-readiness.ts';

export function mingJingReadiness(space: ShiJingSpace): NatalReadiness {
  const base = subjectNatalReadiness('self', space);
  if (!base.ok) return base;

  if (base.inputs.birth_precision !== 'exact') {
    return {
      ok: false,
      reason: 'birth_time_required_for_method',
      detail: 'mingjing_requires_exact_birth_time',
    };
  }
  if (base.inputs.calculation_sex === 'unspecified') {
    return {
      ok: false,
      reason: 'calculation_sex_unspecified_for_dayun',
      detail: 'mingjing_requires_calculation_sex',
    };
  }
  return base;
}
