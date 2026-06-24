import type {
  MingJingMirrorOutput,
  MingJingRelationshipMirrorOutput,
  MingJingZiweiNatalMirrorOutput,
} from '../../domain/mirror-output.ts';
import type { MirrorOutputValidationResult } from '../mirror-output-validator.ts';
import { isAllowedTendencyClass, isGanzhiPillar, isRecord } from './common.ts';
import { validateMingjingRelationship } from './mingjing-relationship-validator.ts';
import { MINGJING_CORE_FIELDS } from './mingjing-shape-keys.ts';
import { validateMingjingZiweiNatal } from './mingjing-ziwei-validator.ts';

export function validateMingjing(
  output: MingJingMirrorOutput | MingJingRelationshipMirrorOutput | MingJingZiweiNatalMirrorOutput,
): MirrorOutputValidationResult {
  if ((output as { output_kind?: unknown }).output_kind === 'relationship_hepan') {
    return validateMingjingRelationship(output as MingJingRelationshipMirrorOutput);
  }
  if ((output as { output_kind?: unknown }).output_kind === 'ziwei_natal_brief') {
    return validateMingjingZiweiNatal(output as MingJingZiweiNatalMirrorOutput);
  }

  const natalOutput = output as MingJingMirrorOutput;
  const core = natalOutput.core as unknown;
  if (!isRecord(core)) {
    return { ok: false, error: { code: 'mirror_output_mingjing_core_invalid', field: 'core' } };
  }
  for (const field of MINGJING_CORE_FIELDS) {
    if (typeof core[field] !== 'string' || (core[field] as string).length === 0) {
      return { ok: false, error: { code: 'mirror_output_mingjing_core_invalid', field } };
    }
  }

  if (!Array.isArray(natalOutput.life_stage_strategies)) {
    return { ok: false, error: { code: 'mirror_output_mingjing_life_stage_strategies_invalid' } };
  }
  for (let i = 0; i < natalOutput.life_stage_strategies.length; i += 1) {
    const s = natalOutput.life_stage_strategies[i] as unknown;
    if (!isRecord(s)) {
      return { ok: false, error: { code: 'mirror_output_mingjing_life_stage_strategy_invalid', index: i, reason: 'not_object' } };
    }
    for (const key of ['phase_label', 'age_range', 'theme', 'strategy'] as const) {
      if (typeof s[key] !== 'string' || (s[key] as string).length === 0) {
        return { ok: false, error: { code: 'mirror_output_mingjing_life_stage_strategy_invalid', index: i, reason: `${key}_empty` } };
      }
    }
    if (!isGanzhiPillar(s.dayun_pillar)) {
      return { ok: false, error: { code: 'mirror_output_mingjing_life_stage_strategy_invalid', index: i, reason: 'dayun_pillar_invalid' } };
    }
  }

  if (!Array.isArray(natalOutput.event_validations)) {
    return { ok: false, error: { code: 'mirror_output_mingjing_event_validations_invalid' } };
  }
  for (let i = 0; i < natalOutput.event_validations.length; i += 1) {
    const v = natalOutput.event_validations[i] as unknown;
    if (!isRecord(v)) {
      return { ok: false, error: { code: 'mirror_output_mingjing_event_validation_invalid', index: i, reason: 'not_object' } };
    }
    if (typeof v.event_memory_ref !== 'string' || (v.event_memory_ref as string).length === 0) {
      return { ok: false, error: { code: 'mirror_output_mingjing_event_validation_invalid', index: i, reason: 'event_memory_ref_empty' } };
    }
    if (typeof v.occurred_year !== 'number' || !Number.isInteger(v.occurred_year)) {
      return { ok: false, error: { code: 'mirror_output_mingjing_event_validation_invalid', index: i, reason: 'occurred_year_invalid' } };
    }
    if (!isAllowedTendencyClass(v.period_nature)) {
      return { ok: false, error: { code: 'mirror_output_mingjing_event_validation_invalid', index: i, reason: 'period_nature_invalid' } };
    }
    if (typeof v.note !== 'string' || (v.note as string).length === 0) {
      return { ok: false, error: { code: 'mirror_output_mingjing_event_validation_invalid', index: i, reason: 'note_empty' } };
    }
    if (v.dayun_pillar !== undefined && !isGanzhiPillar(v.dayun_pillar)) {
      return { ok: false, error: { code: 'mirror_output_mingjing_event_validation_invalid', index: i, reason: 'dayun_pillar_invalid' } };
    }
  }
  return { ok: true };
}
