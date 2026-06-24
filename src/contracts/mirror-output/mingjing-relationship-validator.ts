import type { MingJingRelationshipMirrorOutput } from '../../domain/mirror-output.ts';
import { NATAL_ANCHOR_YEAR_MAX, NATAL_ANCHOR_YEAR_MIN } from '../../domain/mirror-scope.ts';
import { isValidIanaTimeZone } from '../time-window-validation.ts';
import type { MirrorOutputValidationResult } from '../mirror-output-validator.ts';
import {
  findUnexpectedKey,
  isAllowedTendencyClass,
  isLocalDate,
  isNonEmptyString,
  isRecord,
  isStringArray,
} from './common.ts';
import {
  MINGJING_RELATIONSHIP_PERSON_REF_KEYS,
  MINGJING_RELATIONSHIP_PRACTICE_FIELDS,
  MINGJING_RELATIONSHIP_PRACTICE_KEYS,
  MINGJING_RELATIONSHIP_ROOT_KEYS,
  MINGJING_RELATIONSHIP_STRUCTURE_FIELDS,
  MINGJING_RELATIONSHIP_STRUCTURE_KEYS,
  MINGJING_RELATIONSHIP_SUBJECT_KEYS,
  MINGJING_RELATIONSHIP_TIMING_WINDOW_KEYS,
} from './mingjing-shape-keys.ts';

function isValidRelationshipPersonRef(value: unknown): value is { kind: 'person'; id: string } {
  return (
    isRecord(value) &&
    value.kind === 'person' &&
    typeof value.id === 'string' &&
    value.id.length > 0
  );
}

export function validateMingjingRelationship(
  output: MingJingRelationshipMirrorOutput,
): MirrorOutputValidationResult {
  const rootExtra = findUnexpectedKey(
    output as unknown as Record<string, unknown>,
    MINGJING_RELATIONSHIP_ROOT_KEYS,
  );
  if (rootExtra) {
    return {
      ok: false,
      error: { code: 'mirror_output_forbidden_field_present', field: rootExtra },
    };
  }

  const subject = output.relationship_subject as unknown;
  if (!isRecord(subject)) {
    return {
      ok: false,
      error: { code: 'mirror_output_mingjing_relationship_subject_invalid', reason: 'not_object' },
    };
  }
  const subjectExtra = findUnexpectedKey(subject, MINGJING_RELATIONSHIP_SUBJECT_KEYS);
  if (subjectExtra) {
    return {
      ok: false,
      error: {
        code: 'mirror_output_mingjing_relationship_subject_invalid',
        reason: `unexpected_field:${subjectExtra}`,
      },
    };
  }
  if (subject.primary_subject_ref !== 'self') {
    return {
      ok: false,
      error: {
        code: 'mirror_output_mingjing_relationship_subject_invalid',
        reason: 'primary_subject_ref_must_be_self',
      },
    };
  }
  if (isRecord(subject.related_person_ref)) {
    const relatedExtra = findUnexpectedKey(
      subject.related_person_ref,
      MINGJING_RELATIONSHIP_PERSON_REF_KEYS,
    );
    if (relatedExtra) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_mingjing_relationship_subject_invalid',
          reason: `related_person_ref_unexpected_field:${relatedExtra}`,
        },
      };
    }
  }
  if (!isValidRelationshipPersonRef(subject.related_person_ref)) {
    return {
      ok: false,
      error: {
        code: 'mirror_output_mingjing_relationship_subject_invalid',
        reason: 'related_person_ref_invalid',
      },
    };
  }
  const anchorYear = subject.anchor_year;
  if (
    typeof anchorYear !== 'number' ||
    !Number.isInteger(anchorYear) ||
    anchorYear < NATAL_ANCHOR_YEAR_MIN ||
    anchorYear > NATAL_ANCHOR_YEAR_MAX
  ) {
    return {
      ok: false,
      error: {
        code: 'mirror_output_mingjing_relationship_subject_invalid',
        reason: 'anchor_year_invalid',
      },
    };
  }
  if (!isValidIanaTimeZone(subject.basis_time_zone)) {
    return {
      ok: false,
      error: {
        code: 'mirror_output_mingjing_relationship_subject_invalid',
        reason: 'basis_time_zone_invalid',
      },
    };
  }

  const structure = output.structure as unknown;
  if (!isRecord(structure)) {
    return {
      ok: false,
      error: { code: 'mirror_output_mingjing_relationship_structure_invalid', field: 'structure' },
    };
  }
  const structureExtra = findUnexpectedKey(structure, MINGJING_RELATIONSHIP_STRUCTURE_KEYS);
  if (structureExtra) {
    return {
      ok: false,
      error: {
        code: 'mirror_output_mingjing_relationship_structure_invalid',
        field: structureExtra,
      },
    };
  }
  for (const field of MINGJING_RELATIONSHIP_STRUCTURE_FIELDS) {
    if (!isNonEmptyString(structure[field])) {
      return {
        ok: false,
        error: { code: 'mirror_output_mingjing_relationship_structure_invalid', field },
      };
    }
  }

  if (!Array.isArray(output.timing_windows) || output.timing_windows.length === 0) {
    return { ok: false, error: { code: 'mirror_output_mingjing_relationship_timing_invalid' } };
  }
  for (let i = 0; i < output.timing_windows.length; i += 1) {
    const window = output.timing_windows[i] as unknown;
    if (!isRecord(window)) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_mingjing_relationship_timing_window_invalid',
          index: i,
          reason: 'not_object',
        },
      };
    }
    const windowExtra = findUnexpectedKey(window, MINGJING_RELATIONSHIP_TIMING_WINDOW_KEYS);
    if (windowExtra) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_mingjing_relationship_timing_window_invalid',
          index: i,
          reason: `unexpected_field:${windowExtra}`,
        },
      };
    }
    if (!isLocalDate(window.start_date) || !isLocalDate(window.end_date)) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_mingjing_relationship_timing_window_invalid',
          index: i,
          reason: 'date_invalid',
        },
      };
    }
    if (!isAllowedTendencyClass(window.nature)) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_mingjing_relationship_timing_window_invalid',
          index: i,
          reason: 'nature_invalid',
        },
      };
    }
    if (
      !isStringArray(window.driver_refs) ||
      window.driver_refs.length === 0 ||
      window.driver_refs.some((ref) => ref.length === 0)
    ) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_mingjing_relationship_timing_window_invalid',
          index: i,
          reason: 'driver_refs_invalid',
        },
      };
    }
    if (!isNonEmptyString(window.summary)) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_mingjing_relationship_timing_window_invalid',
          index: i,
          reason: 'summary_empty',
        },
      };
    }
  }

  const practice = output.practice as unknown;
  if (!isRecord(practice)) {
    return {
      ok: false,
      error: { code: 'mirror_output_mingjing_relationship_practice_invalid', field: 'practice' },
    };
  }
  const practiceExtra = findUnexpectedKey(practice, MINGJING_RELATIONSHIP_PRACTICE_KEYS);
  if (practiceExtra) {
    return {
      ok: false,
      error: { code: 'mirror_output_mingjing_relationship_practice_invalid', field: practiceExtra },
    };
  }
  for (const field of MINGJING_RELATIONSHIP_PRACTICE_FIELDS) {
    if (!isNonEmptyString(practice[field])) {
      return {
        ok: false,
        error: { code: 'mirror_output_mingjing_relationship_practice_invalid', field },
      };
    }
  }

  return { ok: true };
}
