import type {
  MingJingRelationshipMirrorOutput,
  MingJingMirrorOutput,
  MingJingZiweiNatalMirrorOutput,
  MirrorOutput,
  NianJingMirrorOutput,
  RiJingMirrorOutput,
  ShiJingMirrorOutput,
  YueJingMirrorOutput,
} from '../../../domain/mirror-output.ts';
import { validateMirrorOutput } from '../../../contracts/mirror-output-validator.ts';
import { RuntimeAiOutputValidationError } from '../runtime-ai-parse.ts';
import type {
  MingJingRelationshipWordingPatch,
  MingJingWordingPatch,
  MingJingZiweiNatalWordingPatch,
  NianJingWordingPatch,
  RiJingWordingPatch,
  RuntimeAiWordingPatch,
  ShiJingWordingPatch,
  YueJingWordingPatch,
} from './types.ts';
import { RuntimeAiWordingPatchValidationError } from './types.ts';

function withSummary<TOutput extends MirrorOutput>(
  output: TOutput,
  patch: RuntimeAiWordingPatch,
): TOutput {
  if (!patch.summary) return output;
  return { ...output, summary: patch.summary } as TOutput;
}

function applyRijingPatch(
  base: RiJingMirrorOutput,
  patch: RiJingWordingPatch,
): RiJingMirrorOutput {
  const projectionPatches = patch.concern_projections ?? [];
  return {
    ...withSummary(base, patch),
    ...(patch.daily_overview ? { daily_overview: patch.daily_overview } : {}),
    concern_projections: base.concern_projections.map((projection) => {
      const item = projectionPatches.find((candidate) =>
        candidate.concern_tag_ref === projection.concern_tag_ref
      );
      if (!item) return projection;
      return {
        ...projection,
        ...(item.summary ? { summary: item.summary } : {}),
        ...(item.recommendations ? { recommendations: item.recommendations } : {}),
      };
    }),
  };
}

function assertAllRijingPatchTargetsResolve(
  base: RiJingMirrorOutput,
  patch: RiJingWordingPatch,
): void {
  for (const item of patch.concern_projections ?? []) {
    if (!base.concern_projections.some((projection) =>
      projection.concern_tag_ref === item.concern_tag_ref
    )) {
      throw new RuntimeAiWordingPatchValidationError('rijing_projection_target_unknown');
    }
  }
}

function applyYuejingPatch(
  base: YueJingMirrorOutput,
  patch: YueJingWordingPatch,
): YueJingMirrorOutput {
  const cellPatches = patch.cells ?? [];
  return {
    ...withSummary(base, patch),
    cells: base.cells.map((cell) => {
      const item = cellPatches.find((candidate) =>
        candidate.date === cell.date && candidate.concern_tag_ref === cell.concern_tag_ref
      );
      return item?.summary ? { ...cell, summary: item.summary } : cell;
    }),
  };
}

function assertAllYuejingPatchTargetsResolve(
  base: YueJingMirrorOutput,
  patch: YueJingWordingPatch,
): void {
  const summariesByDate = new Map<string, Map<string, string>>();
  for (const item of patch.cells ?? []) {
    if (!base.cells.some((cell) =>
      cell.date === item.date && cell.concern_tag_ref === item.concern_tag_ref
    )) {
      throw new RuntimeAiWordingPatchValidationError('yuejing_cell_target_unknown');
    }
    if (!item.summary) continue;
    const normalizedSummary = item.summary.trim().replace(/\s+/g, ' ');
    const summaries = summariesByDate.get(item.date) ?? new Map<string, string>();
    const existingRef = summaries.get(normalizedSummary);
    if (existingRef && existingRef !== item.concern_tag_ref) {
      throw new RuntimeAiWordingPatchValidationError('yuejing_cell_summary_duplicate_for_date');
    }
    summaries.set(normalizedSummary, item.concern_tag_ref);
    summariesByDate.set(item.date, summaries);
  }
}

function applyNianjingPatch(
  base: NianJingMirrorOutput,
  patch: NianJingWordingPatch,
): NianJingMirrorOutput {
  const phasePatches = patch.phase_bands ?? [];
  const inflectionPatches = patch.inflection_points ?? [];
  return {
    ...withSummary(base, patch),
    phase_bands: base.phase_bands.map((band) => {
      const item = phasePatches.find((candidate) =>
        candidate.concern_tag_ref === band.concern_tag_ref &&
        candidate.start_date === band.start_date &&
        candidate.end_date === band.end_date
      );
      return item?.summary ? { ...band, summary: item.summary } : band;
    }),
    inflection_points: base.inflection_points.map((inflection) => {
      const item = inflectionPatches.find((candidate) =>
        candidate.concern_tag_ref === inflection.concern_tag_ref &&
        candidate.date === inflection.date
      );
      return item?.summary ? { ...inflection, summary: item.summary } : inflection;
    }),
  };
}

function assertAllNianjingPatchTargetsResolve(
  base: NianJingMirrorOutput,
  patch: NianJingWordingPatch,
): void {
  for (const item of patch.phase_bands ?? []) {
    if (!base.phase_bands.some((band) =>
      band.concern_tag_ref === item.concern_tag_ref &&
      band.start_date === item.start_date &&
      band.end_date === item.end_date
    )) {
      throw new RuntimeAiWordingPatchValidationError('nianjing_phase_band_target_unknown');
    }
  }
  for (const item of patch.inflection_points ?? []) {
    if (!base.inflection_points.some((inflection) =>
      inflection.concern_tag_ref === item.concern_tag_ref &&
      inflection.date === item.date
    )) {
      throw new RuntimeAiWordingPatchValidationError('nianjing_inflection_point_target_unknown');
    }
  }
}

function applyShijingPatch(
  base: ShiJingMirrorOutput,
  patch: ShiJingWordingPatch,
): ShiJingMirrorOutput {
  return {
    ...withSummary(base, patch),
    ...(patch.answer ? { answer: patch.answer } : {}),
  };
}

function applyMingjingPatch(
  base: MingJingMirrorOutput,
  patch: MingJingWordingPatch,
): MingJingMirrorOutput {
  const strategyPatches = patch.life_stage_strategies ?? [];
  return {
    ...withSummary(base, patch),
    // event_validations + each strategy's deterministic fields are never patched.
    ...(patch.core ? { core: { ...base.core, ...patch.core } } : {}),
    life_stage_strategies: base.life_stage_strategies.map((strategy) => {
      const item = strategyPatches.find((candidate) => candidate.phase_label === strategy.phase_label);
      if (!item) return strategy;
      return {
        ...strategy,
        ...(item.theme ? { theme: item.theme } : {}),
        ...(item.strategy ? { strategy: item.strategy } : {}),
      };
    }),
  };
}

function assertAllMingjingPatchTargetsResolve(
  base: MingJingMirrorOutput,
  patch: MingJingWordingPatch,
): void {
  for (const item of patch.life_stage_strategies ?? []) {
    if (!base.life_stage_strategies.some((strategy) => strategy.phase_label === item.phase_label)) {
      throw new RuntimeAiWordingPatchValidationError('mingjing_life_stage_strategy_target_unknown');
    }
  }
}

function isMingjingRelationshipPatch(
  patch: RuntimeAiWordingPatch,
): patch is MingJingRelationshipWordingPatch {
  return patch.mirror_kind === 'mingjing' &&
    (patch as { output_kind?: unknown }).output_kind === 'relationship_hepan';
}

function isMingjingRelationshipOutput(
  output: MirrorOutput,
): output is MingJingRelationshipMirrorOutput {
  return output.mirror_kind === 'mingjing' &&
    (output as { output_kind?: unknown }).output_kind === 'relationship_hepan';
}

function isMingjingZiweiNatalPatch(
  patch: RuntimeAiWordingPatch,
): patch is MingJingZiweiNatalWordingPatch {
  return patch.mirror_kind === 'mingjing' &&
    (patch as { output_kind?: unknown }).output_kind === 'ziwei_natal_brief';
}

function isMingjingZiweiNatalOutput(
  output: MirrorOutput,
): output is MingJingZiweiNatalMirrorOutput {
  return output.mirror_kind === 'mingjing' &&
    (output as { output_kind?: unknown }).output_kind === 'ziwei_natal_brief';
}

function applyMingjingRelationshipPatch(
  base: MingJingRelationshipMirrorOutput,
  patch: MingJingRelationshipWordingPatch,
): MingJingRelationshipMirrorOutput {
  const timingPatches = patch.timing_windows ?? [];
  return {
    ...withSummary(base, patch),
    ...(patch.structure ? { structure: { ...base.structure, ...patch.structure } } : {}),
    timing_windows: base.timing_windows.map((window) => {
      const item = timingPatches.find((candidate) =>
        candidate.start_date === window.start_date && candidate.end_date === window.end_date
      );
      return item?.summary ? { ...window, summary: item.summary } : window;
    }),
    ...(patch.practice ? { practice: { ...base.practice, ...patch.practice } } : {}),
  };
}

function assertAllMingjingRelationshipPatchTargetsResolve(
  base: MingJingRelationshipMirrorOutput,
  patch: MingJingRelationshipWordingPatch,
): void {
  const seenTargets = new Set<string>();
  for (const item of patch.timing_windows) {
    const key = `${item.start_date}\u0000${item.end_date}`;
    if (seenTargets.has(key)) {
      throw new RuntimeAiWordingPatchValidationError(
        'mingjing_relationship_timing_window_target_duplicate',
      );
    }
    seenTargets.add(key);
    if (!base.timing_windows.some((window) =>
      window.start_date === item.start_date && window.end_date === item.end_date
    )) {
      throw new RuntimeAiWordingPatchValidationError(
        'mingjing_relationship_timing_window_target_unknown',
      );
    }
  }
  for (const window of base.timing_windows) {
    if (!seenTargets.has(`${window.start_date}\u0000${window.end_date}`)) {
      throw new RuntimeAiWordingPatchValidationError(
        'mingjing_relationship_timing_window_target_missing',
      );
    }
  }
}

function applyMingjingZiweiNatalPatch(
  base: MingJingZiweiNatalMirrorOutput,
  patch: MingJingZiweiNatalWordingPatch,
): MingJingZiweiNatalMirrorOutput {
  return {
    ...withSummary(base, patch),
    profile: patch.profile,
    decade_guidance: base.decade_guidance.map((item) => {
      const wording = patch.decade_guidance.find((candidate) =>
        candidate.age_range === item.age_range && candidate.palace_name === item.palace_name
      );
      return wording ? { ...item, theme: wording.theme, strategy: wording.strategy } : item;
    }),
  };
}

function assertAllMingjingZiweiNatalPatchTargetsResolve(
  base: MingJingZiweiNatalMirrorOutput,
  patch: MingJingZiweiNatalWordingPatch,
): void {
  const seenTargets = new Set<string>();
  for (const item of patch.decade_guidance) {
    const key = `${item.age_range}\u0000${item.palace_name}`;
    if (seenTargets.has(key)) {
      throw new RuntimeAiWordingPatchValidationError(
        'mingjing_ziwei_decade_guidance_target_duplicate',
      );
    }
    seenTargets.add(key);
    if (!base.decade_guidance.some((candidate) =>
      candidate.age_range === item.age_range && candidate.palace_name === item.palace_name
    )) {
      throw new RuntimeAiWordingPatchValidationError(
        'mingjing_ziwei_decade_guidance_target_unknown',
      );
    }
  }
  for (const item of base.decade_guidance) {
    if (!seenTargets.has(`${item.age_range}\u0000${item.palace_name}`)) {
      throw new RuntimeAiWordingPatchValidationError(
        'mingjing_ziwei_decade_guidance_target_missing',
      );
    }
  }
}

export function applyRuntimeAiWordingPatch(
  base: MirrorOutput,
  patch: RuntimeAiWordingPatch,
): MirrorOutput {
  if (patch.mirror_kind !== base.mirror_kind) {
    throw new RuntimeAiOutputValidationError({
      kind: 'mirror_kind_mismatch',
      expected: base.mirror_kind,
      received: patch.mirror_kind,
    });
  }
  let output: MirrorOutput;
  switch (base.mirror_kind) {
    case 'rijing':
      assertAllRijingPatchTargetsResolve(base, patch as RiJingWordingPatch);
      output = applyRijingPatch(base, patch as RiJingWordingPatch);
      break;
    case 'yuejing':
      assertAllYuejingPatchTargetsResolve(base, patch as YueJingWordingPatch);
      output = applyYuejingPatch(base, patch as YueJingWordingPatch);
      break;
    case 'nianjing':
      assertAllNianjingPatchTargetsResolve(base, patch as NianJingWordingPatch);
      output = applyNianjingPatch(base, patch as NianJingWordingPatch);
      break;
    case 'mingjing': {
      if (isMingjingRelationshipOutput(base)) {
        if (!isMingjingRelationshipPatch(patch)) {
          throw new RuntimeAiWordingPatchValidationError(
            'mingjing_relationship_patch_kind_required',
          );
        }
        assertAllMingjingRelationshipPatchTargetsResolve(base, patch);
        output = applyMingjingRelationshipPatch(base, patch);
        break;
      }
      if (isMingjingZiweiNatalOutput(base)) {
        if (!isMingjingZiweiNatalPatch(patch)) {
          throw new RuntimeAiWordingPatchValidationError(
            'mingjing_ziwei_patch_kind_required',
          );
        }
        assertAllMingjingZiweiNatalPatchTargetsResolve(base, patch);
        output = applyMingjingZiweiNatalPatch(base, patch);
        break;
      }
      if (isMingjingRelationshipPatch(patch)) {
        throw new RuntimeAiWordingPatchValidationError(
          'mingjing_natal_rejects_relationship_patch',
        );
      }
      if (isMingjingZiweiNatalPatch(patch)) {
        throw new RuntimeAiWordingPatchValidationError(
          'mingjing_bazi_natal_rejects_ziwei_patch',
        );
      }
      const natalBase = base as MingJingMirrorOutput;
      assertAllMingjingPatchTargetsResolve(natalBase, patch as MingJingWordingPatch);
      output = applyMingjingPatch(natalBase, patch as MingJingWordingPatch);
      break;
    }
    case 'shijing':
      output = applyShijingPatch(base, patch as ShiJingWordingPatch);
      break;
  }
  const validation = validateMirrorOutput(output);
  if (!validation.ok) {
    throw new RuntimeAiWordingPatchValidationError(validation.error.code);
  }
  return output;
}
