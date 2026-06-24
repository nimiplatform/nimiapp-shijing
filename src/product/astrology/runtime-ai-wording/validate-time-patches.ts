import type {
  NianJingWordingPatch,
  RiJingWordingPatch,
  ShiJingWordingPatch,
  YueJingWordingPatch,
} from './types.ts';
import { RUNTIME_AI_WORDING_PATCH_KIND } from './types.ts';
import { optionalRecordArray, optionalStringArray, optionalText, requireText } from './validation-helpers.ts';

export function validateRijingPatch(record: Record<string, unknown>): RiJingWordingPatch {
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

export function validateYuejingPatch(record: Record<string, unknown>): YueJingWordingPatch {
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

export function validateNianjingPatch(record: Record<string, unknown>): NianJingWordingPatch {
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

export function validateShijingPatch(record: Record<string, unknown>): ShiJingWordingPatch {
  return {
    patch_kind: RUNTIME_AI_WORDING_PATCH_KIND,
    mirror_kind: 'shijing',
    ...(optionalText(record, 'summary') ? { summary: optionalText(record, 'summary')! } : {}),
    ...(optionalText(record, 'answer') ? { answer: optionalText(record, 'answer')! } : {}),
  };
}
