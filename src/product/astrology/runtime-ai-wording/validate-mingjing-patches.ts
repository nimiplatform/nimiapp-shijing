import type {
  MingJingRelationshipActionPatch,
  MingJingRelationshipOverviewPatch,
  MingJingRelationshipRecentStatusPatch,
  MingJingRelationshipWordingPatch,
  MingJingWordingCorePatch,
  MingJingWordingPatch,
  MingJingQizhengNatalWordingPatch,
  MingJingQizhengProfilePatch,
  MingJingZiweiNatalWordingPatch,
  MingJingZiweiProfilePatch,
} from './types.ts';
import { RUNTIME_AI_WORDING_PATCH_KIND, RuntimeAiWordingPatchValidationError } from './types.ts';
import { assertOnlyAllowedKeys, isRecord, nonEmptyString, optionalRecordArray, optionalText, requireText } from './validation-helpers.ts';

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
  'overview',
  'patterns',
  'recent_status',
  'action',
] as const;

const MINGJING_RELATIONSHIP_OVERVIEW_PATCH_KEYS = [
  'title',
  'summary',
  'keywords',
] as const;

const MINGJING_RELATIONSHIP_PATTERN_PATCH_KEYS = [
  'pattern_id',
  'name',
  'self_tendency',
  'related_tendency',
  'scenario',
  'aligned_expression',
  'friction_expression',
  'signals',
] as const;

const MINGJING_RELATIONSHIP_RECENT_STATUS_PATCH_KEYS = ['window'] as const;

const MINGJING_RELATIONSHIP_RECENT_WINDOW_PATCH_KEYS = ['summary'] as const;

const MINGJING_RELATIONSHIP_ACTION_PATCH_KEYS = [
  'situation',
  'step',
  'example_phrase',
  'rationale',
  'observation',
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

const MINGJING_QIZHENG_TOP_LEVEL_PATCH_KEYS = [
  'patch_kind',
  'mirror_kind',
  'output_kind',
  'summary',
  'profile',
  'star_guidance',
] as const;

const MINGJING_QIZHENG_PROFILE_PATCH_KEYS = [
  'life_pattern',
  'strengths',
  'long_term_theme',
  'relationship_pattern',
  'career_inclination',
] as const;

const MINGJING_QIZHENG_STAR_GUIDANCE_PATCH_KEYS = [
  'body_key',
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

function requireKeywords(value: unknown): readonly string[] {
  if (value === undefined) {
    throw new RuntimeAiWordingPatchValidationError('keywords_required');
  }
  if (
    !Array.isArray(value) ||
    value.length > 3 ||
    value.some((item) => !nonEmptyString(item))
  ) {
    throw new RuntimeAiWordingPatchValidationError('keywords_invalid');
  }
  return value;
}

function requireSignals(value: unknown): readonly string[] {
  if (value === undefined) {
    throw new RuntimeAiWordingPatchValidationError('signals_required');
  }
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > 3 ||
    value.some((item) => !nonEmptyString(item))
  ) {
    throw new RuntimeAiWordingPatchValidationError('signals_invalid');
  }
  return value;
}

function validateMingjingRelationshipOverviewPatch(
  value: unknown,
): MingJingRelationshipOverviewPatch {
  if (value === undefined) {
    throw new RuntimeAiWordingPatchValidationError('mingjing_relationship_overview_required');
  }
  if (!isRecord(value)) {
    throw new RuntimeAiWordingPatchValidationError('overview_invalid');
  }
  assertOnlyAllowedKeys(
    value,
    MINGJING_RELATIONSHIP_OVERVIEW_PATCH_KEYS,
    'mingjing_relationship_overview_forbidden_key',
  );
  return {
    title: requireText(value, 'title'),
    summary: requireText(value, 'summary'),
    keywords: requireKeywords(value.keywords),
  };
}

function validateMingjingRelationshipRecentStatusPatch(
  value: unknown,
): MingJingRelationshipRecentStatusPatch | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    throw new RuntimeAiWordingPatchValidationError('recent_status_invalid');
  }
  assertOnlyAllowedKeys(
    value,
    MINGJING_RELATIONSHIP_RECENT_STATUS_PATCH_KEYS,
    'mingjing_relationship_recent_status_forbidden_key',
  );
  const window = value.window;
  if (window === undefined) {
    throw new RuntimeAiWordingPatchValidationError('mingjing_relationship_recent_window_required');
  }
  if (!isRecord(window)) {
    throw new RuntimeAiWordingPatchValidationError('recent_window_invalid');
  }
  assertOnlyAllowedKeys(
    window,
    MINGJING_RELATIONSHIP_RECENT_WINDOW_PATCH_KEYS,
    'mingjing_relationship_recent_window_forbidden_key',
  );
  return { window: { summary: requireText(window, 'summary') } };
}

function validateMingjingRelationshipActionPatch(
  value: unknown,
): MingJingRelationshipActionPatch {
  if (value === undefined) {
    throw new RuntimeAiWordingPatchValidationError('mingjing_relationship_action_required');
  }
  if (!isRecord(value)) {
    throw new RuntimeAiWordingPatchValidationError('action_invalid');
  }
  assertOnlyAllowedKeys(
    value,
    MINGJING_RELATIONSHIP_ACTION_PATCH_KEYS,
    'mingjing_relationship_action_forbidden_key',
  );
  const action: Record<string, string> = {};
  for (const key of MINGJING_RELATIONSHIP_ACTION_PATCH_KEYS) {
    action[key] = requireText(value, key);
  }
  return action as MingJingRelationshipActionPatch;
}

function validateMingjingRelationshipPatch(
  record: Record<string, unknown>,
): MingJingRelationshipWordingPatch {
  assertOnlyAllowedKeys(
    record,
    MINGJING_RELATIONSHIP_TOP_LEVEL_PATCH_KEYS,
    'mingjing_relationship_patch_forbidden_key',
  );
  const overview = validateMingjingRelationshipOverviewPatch(record.overview);
  const rawPatterns = optionalRecordArray(record, 'patterns');
  if (!rawPatterns || rawPatterns.length === 0) {
    throw new RuntimeAiWordingPatchValidationError('mingjing_relationship_patterns_required');
  }
  const patterns = rawPatterns.map((item) => {
    assertOnlyAllowedKeys(
      item,
      MINGJING_RELATIONSHIP_PATTERN_PATCH_KEYS,
      'mingjing_relationship_pattern_forbidden_key',
    );
    return {
      pattern_id: requireText(item, 'pattern_id'),
      name: requireText(item, 'name'),
      self_tendency: requireText(item, 'self_tendency'),
      related_tendency: requireText(item, 'related_tendency'),
      scenario: requireText(item, 'scenario'),
      aligned_expression: requireText(item, 'aligned_expression'),
      friction_expression: requireText(item, 'friction_expression'),
      signals: requireSignals(item.signals),
    };
  });
  const recentStatus = validateMingjingRelationshipRecentStatusPatch(record.recent_status);
  const action = validateMingjingRelationshipActionPatch(record.action);
  return {
    patch_kind: RUNTIME_AI_WORDING_PATCH_KIND,
    mirror_kind: 'mingjing',
    output_kind: 'relationship_hepan',
    overview,
    patterns,
    ...(recentStatus ? { recent_status: recentStatus } : {}),
    action,
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

function validateMingjingQizhengProfilePatch(value: unknown): MingJingQizhengProfilePatch {
  if (value === undefined) {
    throw new RuntimeAiWordingPatchValidationError('mingjing_qizheng_profile_required');
  }
  if (!isRecord(value)) {
    throw new RuntimeAiWordingPatchValidationError('profile_invalid');
  }
  assertOnlyAllowedKeys(
    value,
    MINGJING_QIZHENG_PROFILE_PATCH_KEYS,
    'mingjing_qizheng_profile_forbidden_key',
  );
  const profile: Record<string, string> = {};
  for (const key of MINGJING_QIZHENG_PROFILE_PATCH_KEYS) {
    profile[key] = requireText(value, key);
  }
  return profile as MingJingQizhengProfilePatch;
}

function validateMingjingQizhengNatalPatch(
  record: Record<string, unknown>,
): MingJingQizhengNatalWordingPatch {
  assertOnlyAllowedKeys(
    record,
    MINGJING_QIZHENG_TOP_LEVEL_PATCH_KEYS,
    'mingjing_qizheng_patch_forbidden_key',
  );
  const rawGuidance = optionalRecordArray(record, 'star_guidance');
  if (!rawGuidance || rawGuidance.length === 0) {
    throw new RuntimeAiWordingPatchValidationError('mingjing_qizheng_star_guidance_required');
  }
  const starGuidance = rawGuidance.map((item) => {
    assertOnlyAllowedKeys(
      item,
      MINGJING_QIZHENG_STAR_GUIDANCE_PATCH_KEYS,
      'mingjing_qizheng_star_guidance_forbidden_key',
    );
    return {
      body_key: requireText(item, 'body_key'),
      theme: requireText(item, 'theme'),
      strategy: requireText(item, 'strategy'),
    };
  });
  return {
    patch_kind: RUNTIME_AI_WORDING_PATCH_KIND,
    mirror_kind: 'mingjing',
    output_kind: 'qizheng_siyu_natal_brief',
    summary: requireText(record, 'summary'),
    profile: validateMingjingQizhengProfilePatch(record.profile),
    star_guidance: starGuidance,
  };
}

export function validateMingjingPatch(
  record: Record<string, unknown>,
): MingJingWordingPatch | MingJingRelationshipWordingPatch | MingJingZiweiNatalWordingPatch | MingJingQizhengNatalWordingPatch {
  if (record.output_kind === 'relationship_hepan') {
    return validateMingjingRelationshipPatch(record);
  }
  if (record.output_kind === 'ziwei_natal_brief') {
    return validateMingjingZiweiNatalPatch(record);
  }
  if (record.output_kind === 'qizheng_siyu_natal_brief') {
    return validateMingjingQizhengNatalPatch(record);
  }
  return validateMingjingNatalPatch(record);
}
