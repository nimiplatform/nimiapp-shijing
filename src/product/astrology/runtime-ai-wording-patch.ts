// SJG-ALGO-13 — Runtime AI wording patch.

import type {
  MingJingRelationshipMirrorOutput,
  MingJingMirrorOutput,
  MirrorOutput,
  NianJingMirrorOutput,
  RiJingMirrorOutput,
  ShiJingMirrorOutput,
  YueJingMirrorOutput,
} from '../../domain/mirror-output.ts';
import type { MirrorKind } from '../../domain/mirror-scope.ts';
import { validateMirrorOutput } from '../../contracts/mirror-output-validator.ts';
import {
  RuntimeAiOutputValidationError,
  type RuntimeAiParseFailure,
} from './runtime-ai-parse.ts';

export const RUNTIME_AI_WORDING_PATCH_KIND = 'shijing.runtime_ai_wording_patch.v1';

type WordingPatchBase = {
  readonly patch_kind: typeof RUNTIME_AI_WORDING_PATCH_KIND;
  readonly mirror_kind: MirrorKind;
  readonly summary?: string;
};

export type RiJingWordingProjectionPatch = {
  readonly concern_tag_ref: string;
  readonly summary?: string;
  readonly recommendations?: readonly string[];
};

export type RiJingWordingPatch = WordingPatchBase & {
  readonly mirror_kind: 'rijing';
  readonly daily_overview?: string;
  readonly concern_projections?: readonly RiJingWordingProjectionPatch[];
};

export type YueJingWordingCellPatch = {
  readonly date: string;
  readonly concern_tag_ref: string;
  readonly summary?: string;
};

export type YueJingWordingPatch = WordingPatchBase & {
  readonly mirror_kind: 'yuejing';
  readonly cells?: readonly YueJingWordingCellPatch[];
};

export type NianJingWordingPhasePatch = {
  readonly concern_tag_ref: string;
  readonly start_date: string;
  readonly end_date: string;
  readonly summary?: string;
};

export type NianJingWordingInflectionPatch = {
  readonly concern_tag_ref: string;
  readonly date: string;
  readonly summary?: string;
};

export type NianJingWordingPatch = WordingPatchBase & {
  readonly mirror_kind: 'nianjing';
  readonly phase_bands?: readonly NianJingWordingPhasePatch[];
  readonly inflection_points?: readonly NianJingWordingInflectionPatch[];
};

export type ShiJingWordingPatch = WordingPatchBase & {
  readonly mirror_kind: 'shijing';
  readonly answer?: string;
};

export type MingJingWordingCorePatch = {
  readonly personality?: string;
  readonly strengths?: string;
  readonly long_term_themes?: string;
  readonly relationship_pattern?: string;
  readonly career_inclination?: string;
};

export type MingJingWordingStrategyPatch = {
  readonly phase_label: string;
  readonly theme?: string;
  readonly strategy?: string;
};

export type MingJingWordingPatch = WordingPatchBase & {
  readonly mirror_kind: 'mingjing';
  readonly core?: MingJingWordingCorePatch;
  readonly life_stage_strategies?: readonly MingJingWordingStrategyPatch[];
};

export type MingJingRelationshipStructurePatch = {
  readonly baseline_pattern?: string;
  readonly attraction_and_support?: string;
  readonly friction_and_misread?: string;
  readonly communication_rhythm?: string;
  readonly boundary_advice?: string;
};

export type MingJingRelationshipTimingWindowPatch = {
  readonly start_date: string;
  readonly end_date: string;
  readonly summary?: string;
};

export type MingJingRelationshipPracticePatch = {
  readonly communication?: string;
  readonly boundary?: string;
  readonly repair?: string;
};

export type MingJingRelationshipWordingPatch = WordingPatchBase & {
  readonly mirror_kind: 'mingjing';
  readonly output_kind: 'relationship_hepan';
  readonly summary: string;
  readonly structure: MingJingRelationshipStructurePatch;
  readonly timing_windows: readonly MingJingRelationshipTimingWindowPatch[];
  readonly practice: MingJingRelationshipPracticePatch;
};

export type RuntimeAiWordingPatch =
  | RiJingWordingPatch
  | YueJingWordingPatch
  | NianJingWordingPatch
  | MingJingWordingPatch
  | MingJingRelationshipWordingPatch
  | ShiJingWordingPatch;

export class RuntimeAiWordingPatchValidationError extends Error {
  readonly detail: string;

  constructor(detail: string) {
    super(detail);
    this.name = 'RuntimeAiWordingPatchValidationError';
    this.detail = detail;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function optionalText(record: Record<string, unknown>, key: string): string | undefined {
  if (!Object.prototype.hasOwnProperty.call(record, key)) return undefined;
  const value = record[key];
  if (!nonEmptyString(value)) {
    throw new RuntimeAiWordingPatchValidationError(`${key}_empty`);
  }
  return value;
}

function optionalStringArray(
  record: Record<string, unknown>,
  key: string,
): readonly string[] | undefined {
  if (!Object.prototype.hasOwnProperty.call(record, key)) return undefined;
  const value = record[key];
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== 'string' || item.trim().length === 0)
  ) {
    throw new RuntimeAiWordingPatchValidationError(`${key}_invalid`);
  }
  return value;
}

function optionalRecordArray(
  record: Record<string, unknown>,
  key: string,
): readonly Record<string, unknown>[] | undefined {
  if (!Object.prototype.hasOwnProperty.call(record, key)) return undefined;
  const value = record[key];
  if (!Array.isArray(value) || value.some((item) => !isRecord(item))) {
    throw new RuntimeAiWordingPatchValidationError(`${key}_invalid`);
  }
  return value;
}

function requireText(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (!nonEmptyString(value)) {
    throw new RuntimeAiWordingPatchValidationError(`${key}_empty`);
  }
  return value;
}

function assertOnlyAllowedKeys(
  record: Record<string, unknown>,
  allowedKeys: readonly string[],
  detailPrefix: string,
): void {
  for (const key of Object.keys(record)) {
    if (!allowedKeys.includes(key)) {
      throw new RuntimeAiWordingPatchValidationError(`${detailPrefix}:${key}`);
    }
  }
}

function validateRijingPatch(record: Record<string, unknown>): RiJingWordingPatch {
  const projections = optionalRecordArray(record, 'concern_projections')?.map((item) => ({
    concern_tag_ref: requireText(item, 'concern_tag_ref'),
    ...(optionalText(item, 'summary') ? { summary: optionalText(item, 'summary')! } : {}),
    ...(optionalStringArray(item, 'recommendations')
      ? { recommendations: optionalStringArray(item, 'recommendations')! }
      : {}),
  }));
  return {
    patch_kind: RUNTIME_AI_WORDING_PATCH_KIND,
    mirror_kind: 'rijing',
    ...(optionalText(record, 'summary') ? { summary: optionalText(record, 'summary')! } : {}),
    ...(optionalText(record, 'daily_overview')
      ? { daily_overview: optionalText(record, 'daily_overview')! }
      : {}),
    ...(projections ? { concern_projections: projections } : {}),
  };
}

function validateYuejingPatch(record: Record<string, unknown>): YueJingWordingPatch {
  const cells = optionalRecordArray(record, 'cells')?.map((item) => ({
    date: requireText(item, 'date'),
    concern_tag_ref: requireText(item, 'concern_tag_ref'),
    ...(optionalText(item, 'summary') ? { summary: optionalText(item, 'summary')! } : {}),
  }));
  return {
    patch_kind: RUNTIME_AI_WORDING_PATCH_KIND,
    mirror_kind: 'yuejing',
    ...(optionalText(record, 'summary') ? { summary: optionalText(record, 'summary')! } : {}),
    ...(cells ? { cells } : {}),
  };
}

function validateNianjingPatch(record: Record<string, unknown>): NianJingWordingPatch {
  const phaseBands = optionalRecordArray(record, 'phase_bands')?.map((item) => ({
    concern_tag_ref: requireText(item, 'concern_tag_ref'),
    start_date: requireText(item, 'start_date'),
    end_date: requireText(item, 'end_date'),
    ...(optionalText(item, 'summary') ? { summary: optionalText(item, 'summary')! } : {}),
  }));
  const inflections = optionalRecordArray(record, 'inflection_points')?.map((item) => ({
    concern_tag_ref: requireText(item, 'concern_tag_ref'),
    date: requireText(item, 'date'),
    ...(optionalText(item, 'summary') ? { summary: optionalText(item, 'summary')! } : {}),
  }));
  return {
    patch_kind: RUNTIME_AI_WORDING_PATCH_KIND,
    mirror_kind: 'nianjing',
    ...(optionalText(record, 'summary') ? { summary: optionalText(record, 'summary')! } : {}),
    ...(phaseBands ? { phase_bands: phaseBands } : {}),
    ...(inflections ? { inflection_points: inflections } : {}),
  };
}

function validateShijingPatch(record: Record<string, unknown>): ShiJingWordingPatch {
  return {
    patch_kind: RUNTIME_AI_WORDING_PATCH_KIND,
    mirror_kind: 'shijing',
    ...(optionalText(record, 'summary') ? { summary: optionalText(record, 'summary')! } : {}),
    ...(optionalText(record, 'answer') ? { answer: optionalText(record, 'answer')! } : {}),
  };
}

const MINGJING_CORE_PATCH_KEYS = [
  'personality',
  'strengths',
  'long_term_themes',
  'relationship_pattern',
  'career_inclination',
] as const;

const MINGJING_RELATIONSHIP_TOP_LEVEL_PATCH_KEYS = [
  'patch_kind',
  'mirror_kind',
  'output_kind',
  'summary',
  'structure',
  'timing_windows',
  'practice',
] as const;

const MINGJING_RELATIONSHIP_STRUCTURE_PATCH_KEYS = [
  'baseline_pattern',
  'attraction_and_support',
  'friction_and_misread',
  'communication_rhythm',
  'boundary_advice',
] as const;

const MINGJING_RELATIONSHIP_TIMING_WINDOW_PATCH_KEYS = [
  'start_date',
  'end_date',
  'summary',
] as const;

const MINGJING_RELATIONSHIP_PRACTICE_PATCH_KEYS = [
  'communication',
  'boundary',
  'repair',
] as const;

function validateMingjingCorePatch(value: unknown): MingJingWordingCorePatch | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    throw new RuntimeAiWordingPatchValidationError('core_invalid');
  }
  const core: Record<string, string> = {};
  for (const key of MINGJING_CORE_PATCH_KEYS) {
    const text = optionalText(value, key);
    if (text) core[key] = text;
  }
  return core;
}

function validateMingjingNatalPatch(record: Record<string, unknown>): MingJingWordingPatch {
  const core = Object.prototype.hasOwnProperty.call(record, 'core')
    ? validateMingjingCorePatch(record.core)
    : undefined;
  const strategies = optionalRecordArray(record, 'life_stage_strategies')?.map((item) => ({
    phase_label: requireText(item, 'phase_label'),
    ...(optionalText(item, 'theme') ? { theme: optionalText(item, 'theme')! } : {}),
    ...(optionalText(item, 'strategy') ? { strategy: optionalText(item, 'strategy')! } : {}),
  }));
  return {
    patch_kind: RUNTIME_AI_WORDING_PATCH_KIND,
    mirror_kind: 'mingjing',
    ...(optionalText(record, 'summary') ? { summary: optionalText(record, 'summary')! } : {}),
    ...(core ? { core } : {}),
    ...(strategies ? { life_stage_strategies: strategies } : {}),
  };
}

function validateMingjingRelationshipStructurePatch(
  value: unknown,
): MingJingRelationshipStructurePatch {
  if (value === undefined) {
    throw new RuntimeAiWordingPatchValidationError('mingjing_relationship_structure_required');
  }
  if (!isRecord(value)) {
    throw new RuntimeAiWordingPatchValidationError('structure_invalid');
  }
  assertOnlyAllowedKeys(
    value,
    MINGJING_RELATIONSHIP_STRUCTURE_PATCH_KEYS,
    'mingjing_relationship_structure_forbidden_key',
  );
  const structure: Record<string, string> = {};
  for (const key of MINGJING_RELATIONSHIP_STRUCTURE_PATCH_KEYS) {
    structure[key] = requireText(value, key);
  }
  return structure;
}

function validateMingjingRelationshipPracticePatch(
  value: unknown,
): MingJingRelationshipPracticePatch {
  if (value === undefined) {
    throw new RuntimeAiWordingPatchValidationError('mingjing_relationship_practice_required');
  }
  if (!isRecord(value)) {
    throw new RuntimeAiWordingPatchValidationError('practice_invalid');
  }
  assertOnlyAllowedKeys(
    value,
    MINGJING_RELATIONSHIP_PRACTICE_PATCH_KEYS,
    'mingjing_relationship_practice_forbidden_key',
  );
  const practice: Record<string, string> = {};
  for (const key of MINGJING_RELATIONSHIP_PRACTICE_PATCH_KEYS) {
    practice[key] = requireText(value, key);
  }
  return practice;
}

function validateMingjingRelationshipPatch(
  record: Record<string, unknown>,
): MingJingRelationshipWordingPatch {
  assertOnlyAllowedKeys(
    record,
    MINGJING_RELATIONSHIP_TOP_LEVEL_PATCH_KEYS,
    'mingjing_relationship_patch_forbidden_key',
  );
  const structure = validateMingjingRelationshipStructurePatch(record.structure);
  const rawTimingWindows = optionalRecordArray(record, 'timing_windows');
  if (!rawTimingWindows || rawTimingWindows.length === 0) {
    throw new RuntimeAiWordingPatchValidationError('mingjing_relationship_timing_windows_required');
  }
  const timingWindows = rawTimingWindows.map((item) => {
    assertOnlyAllowedKeys(
      item,
      MINGJING_RELATIONSHIP_TIMING_WINDOW_PATCH_KEYS,
      'mingjing_relationship_timing_window_forbidden_key',
    );
    return {
      start_date: requireText(item, 'start_date'),
      end_date: requireText(item, 'end_date'),
      summary: requireText(item, 'summary'),
    };
  });
  const practice = validateMingjingRelationshipPracticePatch(record.practice);
  return {
    patch_kind: RUNTIME_AI_WORDING_PATCH_KIND,
    mirror_kind: 'mingjing',
    output_kind: 'relationship_hepan',
    summary: requireText(record, 'summary'),
    structure,
    timing_windows: timingWindows,
    practice,
  };
}

function validateMingjingPatch(
  record: Record<string, unknown>,
): MingJingWordingPatch | MingJingRelationshipWordingPatch {
  if (record.output_kind === 'relationship_hepan') {
    return validateMingjingRelationshipPatch(record);
  }
  return validateMingjingNatalPatch(record);
}

export function validateRuntimeAiWordingPatchValue(
  expectedKind: MirrorKind,
  value: unknown,
): RuntimeAiWordingPatch {
  if (!isRecord(value)) {
    throw new RuntimeAiOutputValidationError({ kind: 'invalid_json', detail: 'not an object' });
  }
  if (value.patch_kind !== RUNTIME_AI_WORDING_PATCH_KIND) {
    throw new RuntimeAiWordingPatchValidationError('patch_kind_invalid');
  }
  if (value.mirror_kind !== expectedKind) {
    throw new RuntimeAiOutputValidationError({
      kind: 'mirror_kind_mismatch',
      expected: expectedKind,
      received: value.mirror_kind,
    });
  }
  switch (expectedKind) {
    case 'rijing':
      return validateRijingPatch(value);
    case 'yuejing':
      return validateYuejingPatch(value);
    case 'nianjing':
      return validateNianjingPatch(value);
    case 'mingjing':
      return validateMingjingPatch(value);
    case 'shijing':
      return validateShijingPatch(value);
  }
}

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
      if (isMingjingRelationshipPatch(patch)) {
        throw new RuntimeAiWordingPatchValidationError(
          'mingjing_natal_rejects_relationship_patch',
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

export function wordingPatchValidationFailure(detail: string): RuntimeAiParseFailure {
  return { kind: 'validation_failed', detail };
}
