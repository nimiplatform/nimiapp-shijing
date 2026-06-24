import type { MingJingZiweiNatalMirrorOutput } from '../../domain/mirror-output.ts';
import type { MirrorOutputValidationResult } from '../mirror-output-validator.ts';
import { findUnexpectedKey, isNonEmptyString, isRecord, isStringArray } from './common.ts';
import {
  MINGJING_ZIWEI_CHART_BASIS_KEYS,
  MINGJING_ZIWEI_DECADE_GUIDANCE_KEYS,
  MINGJING_ZIWEI_PROFILE_FIELDS,
  MINGJING_ZIWEI_PROFILE_KEYS,
  MINGJING_ZIWEI_ROOT_KEYS,
} from './mingjing-shape-keys.ts';

export function validateMingjingZiweiNatal(
  output: MingJingZiweiNatalMirrorOutput,
): MirrorOutputValidationResult {
  const rootExtra = findUnexpectedKey(
    output as unknown as Record<string, unknown>,
    MINGJING_ZIWEI_ROOT_KEYS,
  );
  if (rootExtra) {
    return {
      ok: false,
      error: { code: 'mirror_output_forbidden_field_present', field: rootExtra },
    };
  }

  const basis = output.chart_basis as unknown;
  if (!isRecord(basis)) {
    return {
      ok: false,
      error: { code: 'mirror_output_mingjing_ziwei_chart_basis_invalid', field: 'chart_basis' },
    };
  }
  const basisExtra = findUnexpectedKey(basis, MINGJING_ZIWEI_CHART_BASIS_KEYS);
  if (basisExtra) {
    return {
      ok: false,
      error: { code: 'mirror_output_mingjing_ziwei_chart_basis_invalid', field: basisExtra },
    };
  }
  for (const field of [
    'soul_palace_branch',
    'soul_palace_name',
    'body_palace_name',
    'five_elements_class',
    'soul_star',
    'body_star',
  ] as const) {
    if (!isNonEmptyString(basis[field])) {
      return {
        ok: false,
        error: { code: 'mirror_output_mingjing_ziwei_chart_basis_invalid', field },
      };
    }
  }
  if (
    typeof basis.palace_count !== 'number' ||
    !Number.isInteger(basis.palace_count) ||
    basis.palace_count !== 12
  ) {
    return {
      ok: false,
      error: { code: 'mirror_output_mingjing_ziwei_chart_basis_invalid', field: 'palace_count' },
    };
  }
  if (!isStringArray(basis.sihua_refs)) {
    return {
      ok: false,
      error: { code: 'mirror_output_mingjing_ziwei_chart_basis_invalid', field: 'sihua_refs' },
    };
  }

  const profile = output.profile as unknown;
  if (!isRecord(profile)) {
    return {
      ok: false,
      error: { code: 'mirror_output_mingjing_ziwei_profile_invalid', field: 'profile' },
    };
  }
  const profileExtra = findUnexpectedKey(profile, MINGJING_ZIWEI_PROFILE_KEYS);
  if (profileExtra) {
    return {
      ok: false,
      error: { code: 'mirror_output_mingjing_ziwei_profile_invalid', field: profileExtra },
    };
  }
  for (const field of MINGJING_ZIWEI_PROFILE_FIELDS) {
    if (!isNonEmptyString(profile[field])) {
      return {
        ok: false,
        error: { code: 'mirror_output_mingjing_ziwei_profile_invalid', field },
      };
    }
  }

  if (!Array.isArray(output.decade_guidance) || output.decade_guidance.length === 0) {
    return { ok: false, error: { code: 'mirror_output_mingjing_ziwei_decade_guidance_invalid' } };
  }
  for (let i = 0; i < output.decade_guidance.length; i += 1) {
    const item = output.decade_guidance[i] as unknown;
    if (!isRecord(item)) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_mingjing_ziwei_decade_guidance_item_invalid',
          index: i,
          reason: 'not_object',
        },
      };
    }
    const itemExtra = findUnexpectedKey(item, MINGJING_ZIWEI_DECADE_GUIDANCE_KEYS);
    if (itemExtra) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_mingjing_ziwei_decade_guidance_item_invalid',
          index: i,
          reason: `unexpected_field:${itemExtra}`,
        },
      };
    }
    for (const field of ['age_range', 'palace_name', 'palace_branch', 'theme', 'strategy'] as const) {
      if (!isNonEmptyString(item[field])) {
        return {
          ok: false,
          error: {
            code: 'mirror_output_mingjing_ziwei_decade_guidance_item_invalid',
            index: i,
            reason: `${field}_empty`,
          },
        };
      }
    }
    if (!isStringArray(item.major_stars)) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_mingjing_ziwei_decade_guidance_item_invalid',
          index: i,
          reason: 'major_stars_invalid',
        },
      };
    }
  }
  return { ok: true };
}
