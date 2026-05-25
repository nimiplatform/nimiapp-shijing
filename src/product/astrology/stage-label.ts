// SJG-ALGO-09 — stage label assignment priority:
// 转时 > 收时 > 进时 > 养时 > 守时.

import type { CycleMarker, ShijingStageLabel } from '../../domain/algorithm.ts';

const TRANSITION_KINDS = new Set(['dayun_boundary', 'annual_transition', 'monthly_transition', 'clash']);
const CLOSURE_KINDS = new Set(['storage', 'constraint']);
const ADVANCE_KINDS = new Set(['output', 'wealth']);
const SUSTAIN_KINDS = new Set(['resource', 'combination']);

export function pickStageLabel(markers: readonly CycleMarker[]): ShijingStageLabel {
  if (markers.some((m) => TRANSITION_KINDS.has(m.kind))) return '转时';
  if (markers.some((m) => CLOSURE_KINDS.has(m.kind))) return '收时';
  if (markers.some((m) => ADVANCE_KINDS.has(m.kind))) return '进时';
  if (markers.some((m) => SUSTAIN_KINDS.has(m.kind))) return '养时';
  return '守时';
}
