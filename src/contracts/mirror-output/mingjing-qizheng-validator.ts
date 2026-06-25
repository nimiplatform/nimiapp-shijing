import type { MingJingQizhengNatalMirrorOutput } from '../../domain/mirror-output.ts';
import type { MirrorOutputValidationResult } from '../mirror-output-validator.ts';
import { findUnexpectedKey, isNonEmptyString, isRecord, isStringArray } from './common.ts';
import {
  MINGJING_QIZHENG_CHART_BASIS_KEYS,
  MINGJING_QIZHENG_PROFILE_FIELDS,
  MINGJING_QIZHENG_PROFILE_KEYS,
  MINGJING_QIZHENG_ROOT_KEYS,
  MINGJING_QIZHENG_STAR_GUIDANCE_KEYS,
} from './mingjing-shape-keys.ts';

export function validateMingjingQizhengNatal(
  output: MingJingQizhengNatalMirrorOutput,
): MirrorOutputValidationResult {
  const rootExtra = findUnexpectedKey(
    output as unknown as Record<string, unknown>,
    MINGJING_QIZHENG_ROOT_KEYS,
  );
  if (rootExtra) {
    return { ok: false, error: { code: 'mirror_output_forbidden_field_present', field: rootExtra } };
  }

  const basis = output.chart_basis as unknown;
  if (!isRecord(basis)) {
    return {
      ok: false,
      error: { code: 'mirror_output_mingjing_qizheng_chart_basis_invalid', field: 'chart_basis' },
    };
  }
  const basisExtra = findUnexpectedKey(basis, MINGJING_QIZHENG_CHART_BASIS_KEYS);
  if (basisExtra) {
    return {
      ok: false,
      error: { code: 'mirror_output_mingjing_qizheng_chart_basis_invalid', field: basisExtra },
    };
  }
  if (
    typeof basis.ascendant_longitude !== 'number' ||
    !Number.isFinite(basis.ascendant_longitude) ||
    basis.ascendant_longitude < 0 ||
    basis.ascendant_longitude >= 360
  ) {
    return {
      ok: false,
      error: { code: 'mirror_output_mingjing_qizheng_chart_basis_invalid', field: 'ascendant_longitude' },
    };
  }
  for (const field of ['zodiac_model', 'house_model', 'mansion_model', 'siyu_model', 'ephemeris_version'] as const) {
    if (!isNonEmptyString(basis[field])) {
      return {
        ok: false,
        error: { code: 'mirror_output_mingjing_qizheng_chart_basis_invalid', field },
      };
    }
  }
  if (basis.day_night !== 'day' && basis.day_night !== 'night') {
    return {
      ok: false,
      error: { code: 'mirror_output_mingjing_qizheng_chart_basis_invalid', field: 'day_night' },
    };
  }
  if (!isStringArray(basis.key_body_refs) || basis.key_body_refs.length === 0) {
    return {
      ok: false,
      error: { code: 'mirror_output_mingjing_qizheng_chart_basis_invalid', field: 'key_body_refs' },
    };
  }

  const profile = output.profile as unknown;
  if (!isRecord(profile)) {
    return {
      ok: false,
      error: { code: 'mirror_output_mingjing_qizheng_profile_invalid', field: 'profile' },
    };
  }
  const profileExtra = findUnexpectedKey(profile, MINGJING_QIZHENG_PROFILE_KEYS);
  if (profileExtra) {
    return {
      ok: false,
      error: { code: 'mirror_output_mingjing_qizheng_profile_invalid', field: profileExtra },
    };
  }
  for (const field of MINGJING_QIZHENG_PROFILE_FIELDS) {
    if (!isNonEmptyString(profile[field])) {
      return {
        ok: false,
        error: { code: 'mirror_output_mingjing_qizheng_profile_invalid', field },
      };
    }
  }

  if (!Array.isArray(output.star_guidance) || output.star_guidance.length === 0) {
    return { ok: false, error: { code: 'mirror_output_mingjing_qizheng_star_guidance_invalid' } };
  }
  for (let i = 0; i < output.star_guidance.length; i += 1) {
    const item = output.star_guidance[i] as unknown;
    if (!isRecord(item)) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_mingjing_qizheng_star_guidance_item_invalid',
          index: i,
          reason: 'not_object',
        },
      };
    }
    const itemExtra = findUnexpectedKey(item, MINGJING_QIZHENG_STAR_GUIDANCE_KEYS);
    if (itemExtra) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_mingjing_qizheng_star_guidance_item_invalid',
          index: i,
          reason: `unexpected_field:${itemExtra}`,
        },
      };
    }
    for (const field of ['body_key', 'body_label', 'house_name', 'mansion', 'position_class', 'theme', 'strategy'] as const) {
      if (!isNonEmptyString(item[field])) {
        return {
          ok: false,
          error: {
            code: 'mirror_output_mingjing_qizheng_star_guidance_item_invalid',
            index: i,
            reason: `${field}_empty`,
          },
        };
      }
    }
  }
  return { ok: true };
}
