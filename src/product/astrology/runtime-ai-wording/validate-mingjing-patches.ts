import type {
  MingJingRelationshipPracticePatch,
  MingJingRelationshipStructurePatch,
  MingJingRelationshipWordingPatch,
  MingJingWordingCorePatch,
  MingJingWordingPatch,
  MingJingZiweiNatalWordingPatch,
  MingJingZiweiProfilePatch,
} from './types.ts';
import { RUNTIME_AI_WORDING_PATCH_KIND, RuntimeAiWordingPatchValidationError } from './types.ts';
import { assertOnlyAllowedKeys, isRecord, optionalRecordArray, optionalText, requireText } from './validation-helpers.ts';

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

const MINGJING_ZIWEI_TOP_LEVEL_PATCH_KEYS = [
  'patch_kind',
  'mirror_kind',
  'output_kind',
  'summary',
  'profile',
  'decade_guidance',
] as const;

const MINGJING_ZIWEI_PROFILE_PATCH_KEYS = [
  'life_pattern',
  'strengths',
  'long_term_theme',
  'relationship_pattern',
  'career_inclination',
] as const;

const MINGJING_ZIWEI_DECADE_GUIDANCE_PATCH_KEYS = [
  'age_range',
  'palace_name',
  'theme',
  'strategy',
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

function validateMingjingZiweiProfilePatch(value: unknown): MingJingZiweiProfilePatch {
  if (value === undefined) {
    throw new RuntimeAiWordingPatchValidationError('mingjing_ziwei_profile_required');
  }
  if (!isRecord(value)) {
    throw new RuntimeAiWordingPatchValidationError('profile_invalid');
  }
  assertOnlyAllowedKeys(
    value,
    MINGJING_ZIWEI_PROFILE_PATCH_KEYS,
    'mingjing_ziwei_profile_forbidden_key',
  );
  const profile: Record<string, string> = {};
  for (const key of MINGJING_ZIWEI_PROFILE_PATCH_KEYS) {
    profile[key] = requireText(value, key);
  }
  return profile as MingJingZiweiProfilePatch;
}

function validateMingjingZiweiNatalPatch(
  record: Record<string, unknown>,
): MingJingZiweiNatalWordingPatch {
  assertOnlyAllowedKeys(
    record,
    MINGJING_ZIWEI_TOP_LEVEL_PATCH_KEYS,
    'mingjing_ziwei_patch_forbidden_key',
  );
  const rawGuidance = optionalRecordArray(record, 'decade_guidance');
  if (!rawGuidance || rawGuidance.length === 0) {
    throw new RuntimeAiWordingPatchValidationError('mingjing_ziwei_decade_guidance_required');
  }
  const decadeGuidance = rawGuidance.map((item) => {
    assertOnlyAllowedKeys(
      item,
      MINGJING_ZIWEI_DECADE_GUIDANCE_PATCH_KEYS,
      'mingjing_ziwei_decade_guidance_forbidden_key',
    );
    return {
      age_range: requireText(item, 'age_range'),
      palace_name: requireText(item, 'palace_name'),
      theme: requireText(item, 'theme'),
      strategy: requireText(item, 'strategy'),
    };
  });
  return {
    patch_kind: RUNTIME_AI_WORDING_PATCH_KIND,
    mirror_kind: 'mingjing',
    output_kind: 'ziwei_natal_brief',
    summary: requireText(record, 'summary'),
    profile: validateMingjingZiweiProfilePatch(record.profile),
    decade_guidance: decadeGuidance,
  };
}

export function validateMingjingPatch(
  record: Record<string, unknown>,
): MingJingWordingPatch | MingJingRelationshipWordingPatch | MingJingZiweiNatalWordingPatch {
  if (record.output_kind === 'relationship_hepan') {
    return validateMingjingRelationshipPatch(record);
  }
  if (record.output_kind === 'ziwei_natal_brief') {
    return validateMingjingZiweiNatalPatch(record);
  }
  return validateMingjingNatalPatch(record);
}
