// SJG-ASTRO + SJG-ALGO-16 — 命镜 AI-reading structural generator.
//
// Builds the deterministic MingJingMirrorOutput skeleton that grounds the Runtime
// AI wording pass: a chart-derived summary seed, the life-stage scaffold (one
// entry per current+upcoming 大运, with deterministic phase_label/age_range/
// pillar), and the historical-event resonance (deterministic). The narrative
// fields (core.*, each strategy's theme/strategy) start EMPTY and are filled by
// the AI patch; if the AI fails to fill them, validation fails closed — never a
// fabricated personality reading.

import type { EventMemory } from '../../domain/event-memory.ts';
import type { MethodProfileId } from '../../domain/algorithm.ts';
import type { MingJingChart } from '../../domain/mingjing.ts';
import type {
  MingJingEventValidation,
  MingJingLifeStageStrategy,
  MingJingMirrorOutput,
} from '../../domain/mirror-output.ts';
import { type StageResult } from './stage-result.ts';
import { computeEventResonance } from './engines/bazi/bazi-event-resonance.ts';
import { TENDENCY_CLASS_LABELS } from '../i18n/copy.ts';

const STRATEGY_HORIZON_PERIODS = 5; // current + next four 大运 — the actionable life arc

export interface MingJingGenerateInput {
  readonly chart: MingJingChart;
  readonly method_profile_id: MethodProfileId;
  readonly events: readonly EventMemory[];
  readonly cited_event_memory_refs: readonly string[];
  readonly cited_plan_item_refs: readonly string[];
}

function lifeStageScaffold(chart: MingJingChart): MingJingLifeStageStrategy[] {
  const periods = chart.dayun.periods;
  const currentIndex = periods.findIndex((p) => p.is_current);
  const start = currentIndex >= 0 ? currentIndex : 0;
  return periods.slice(start, start + STRATEGY_HORIZON_PERIODS).map((p) => ({
    phase_label: `${p.stem_ten_god}大运（${p.start_age}–${p.end_age}岁）`,
    age_range: `${p.start_age}–${p.end_age}`,
    dayun_pillar: p.pillar,
    theme: '', // AI
    strategy: '', // AI
  }));
}

function eventValidations(
  chart: MingJingChart,
  events: readonly EventMemory[],
): MingJingEventValidation[] {
  return computeEventResonance(chart, events).map((r) => {
    const dayunPhrase = r.dayun_ten_god ? `${r.dayun_ten_god}大运（${TENDENCY_CLASS_LABELS[r.dayun_nature]}）` : '起运前';
    const note = `${r.occurred_year}年：${dayunPhrase}｜流年${TENDENCY_CLASS_LABELS[r.liunian_nature]}`;
    return {
      event_memory_ref: r.event_memory_ref,
      occurred_year: r.occurred_year,
      ...(r.dayun_pillar ? { dayun_pillar: r.dayun_pillar } : {}),
      period_nature: r.dayun_nature,
      note,
    };
  });
}

export function generateMingJingOutput(input: MingJingGenerateInput): StageResult<MingJingMirrorOutput> {
  const { chart } = input;
  const strategies = lifeStageScaffold(chart);
  if (strategies.length === 0) {
    return {
      ok: false,
      error: {
        stage: 'mingjing_projection',
        kind: 'stage_invalid_input',
        subject_ref: 'self',
        detail: 'MingJing 大运 sequence produced no life-stage phases',
      },
    };
  }

  // Deterministic summary seed (real chart descriptor); the AI patch replaces it
  // with a warmer one-line read. Never empty so the field is always valid.
  const summarySeed = `${chart.pattern.name} · 日主${chart.interpretation.strength.band}`;

  const output: MingJingMirrorOutput = {
    mirror_kind: 'mingjing',
    summary: summarySeed,
    core: {
      personality: '',
      strengths: '',
      long_term_themes: '',
      relationship_pattern: '',
      career_inclination: '',
    },
    life_stage_strategies: strategies,
    event_validations: eventValidations(chart, input.events),
    cited_event_memory_refs: [...input.cited_event_memory_refs],
    cited_plan_item_refs: [...input.cited_plan_item_refs],
    citations: [{ method: input.method_profile_id, reference: 'mingjing.natal_projection' }],
  };
  return { ok: true, value: output };
}
