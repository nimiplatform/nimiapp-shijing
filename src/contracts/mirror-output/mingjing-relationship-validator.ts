import type { MingJingRelationshipMirrorOutput } from '../../domain/mirror-output.ts';
import {
  RELATIONSHIP_PATTERN_RULE_IDS,
  RELATIONSHIP_RECENT_UNAVAILABLE_REASONS,
} from '../../domain/mirror-output.ts';
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
  MINGJING_RELATIONSHIP_ACTION_KEYS,
  MINGJING_RELATIONSHIP_ACTION_PROSE_FIELDS,
  MINGJING_RELATIONSHIP_ACTION_TARGET_PATTERN_KEYS,
  MINGJING_RELATIONSHIP_ACTION_TARGET_RECENT_WINDOW_KEYS,
  MINGJING_RELATIONSHIP_OVERVIEW_KEYS,
  MINGJING_RELATIONSHIP_PATTERN_KEYS,
  MINGJING_RELATIONSHIP_PATTERN_PROSE_FIELDS,
  MINGJING_RELATIONSHIP_PERSON_REF_KEYS,
  MINGJING_RELATIONSHIP_RECENT_STATUS_AVAILABLE_KEYS,
  MINGJING_RELATIONSHIP_RECENT_STATUS_UNAVAILABLE_KEYS,
  MINGJING_RELATIONSHIP_RECENT_WINDOW_KEYS,
  MINGJING_RELATIONSHIP_ROOT_KEYS,
  MINGJING_RELATIONSHIP_SUBJECT_KEYS,
} from './mingjing-shape-keys.ts';

const RELATIONSHIP_PATTERN_MAX = 4;
const RELATIONSHIP_KEYWORD_MAX = 3;
const RELATIONSHIP_SIGNAL_MIN = 1;
const RELATIONSHIP_SIGNAL_MAX = 3;

function isValidRelationshipPersonRef(value: unknown): value is { kind: 'person'; id: string } {
  return (
    isRecord(value) &&
    value.kind === 'person' &&
    typeof value.id === 'string' &&
    value.id.length > 0
  );
}

function validateRelationshipSubject(
  output: MingJingRelationshipMirrorOutput,
): MirrorOutputValidationResult | null {
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
  return null;
}

function validateRelationshipOverview(
  output: MingJingRelationshipMirrorOutput,
): MirrorOutputValidationResult | null {
  const overview = output.overview as unknown;
  if (!isRecord(overview)) {
    return {
      ok: false,
      error: { code: 'mirror_output_mingjing_relationship_overview_invalid', reason: 'not_object' },
    };
  }
  const extra = findUnexpectedKey(overview, MINGJING_RELATIONSHIP_OVERVIEW_KEYS);
  if (extra) {
    return {
      ok: false,
      error: {
        code: 'mirror_output_mingjing_relationship_overview_invalid',
        reason: `unexpected_field:${extra}`,
      },
    };
  }
  if (!isNonEmptyString(overview.title)) {
    return {
      ok: false,
      error: { code: 'mirror_output_mingjing_relationship_overview_invalid', reason: 'title_empty' },
    };
  }
  if (!isNonEmptyString(overview.summary)) {
    return {
      ok: false,
      error: { code: 'mirror_output_mingjing_relationship_overview_invalid', reason: 'summary_empty' },
    };
  }
  if (!isStringArray(overview.keywords) || overview.keywords.length > RELATIONSHIP_KEYWORD_MAX) {
    return {
      ok: false,
      error: {
        code: 'mirror_output_mingjing_relationship_overview_invalid',
        reason: 'keywords_invalid',
      },
    };
  }
  if (overview.keywords.some((keyword) => keyword.length === 0)) {
    return {
      ok: false,
      error: {
        code: 'mirror_output_mingjing_relationship_overview_invalid',
        reason: 'keywords_invalid',
      },
    };
  }
  if (new Set(overview.keywords).size !== overview.keywords.length) {
    return {
      ok: false,
      error: {
        code: 'mirror_output_mingjing_relationship_overview_invalid',
        reason: 'keywords_duplicate',
      },
    };
  }
  return null;
}

function validateRelationshipPatterns(
  output: MingJingRelationshipMirrorOutput,
): MirrorOutputValidationResult | null {
  const patterns = output.patterns as unknown;
  if (
    !Array.isArray(patterns) ||
    patterns.length === 0 ||
    patterns.length > RELATIONSHIP_PATTERN_MAX
  ) {
    return {
      ok: false,
      error: {
        code: 'mirror_output_mingjing_relationship_patterns_invalid',
        reason: 'length_out_of_range',
      },
    };
  }
  const seenIds = new Set<string>();
  const ranks: number[] = [];
  for (let i = 0; i < patterns.length; i += 1) {
    const pattern = patterns[i] as unknown;
    if (!isRecord(pattern)) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_mingjing_relationship_pattern_invalid',
          index: i,
          reason: 'not_object',
        },
      };
    }
    const extra = findUnexpectedKey(pattern, MINGJING_RELATIONSHIP_PATTERN_KEYS);
    if (extra) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_mingjing_relationship_pattern_invalid',
          index: i,
          reason: `unexpected_field:${extra}`,
        },
      };
    }
    if (!isNonEmptyString(pattern.pattern_id)) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_mingjing_relationship_pattern_invalid',
          index: i,
          reason: 'pattern_id_empty',
        },
      };
    }
    if (seenIds.has(pattern.pattern_id)) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_mingjing_relationship_pattern_invalid',
          index: i,
          reason: 'pattern_id_duplicate',
        },
      };
    }
    seenIds.add(pattern.pattern_id);
    if (
      typeof pattern.rule_ref !== 'string' ||
      !(RELATIONSHIP_PATTERN_RULE_IDS as readonly string[]).includes(pattern.rule_ref)
    ) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_mingjing_relationship_pattern_rule_unadmitted',
          index: i,
          received: pattern.rule_ref,
        },
      };
    }
    if (pattern.pattern_id !== pattern.rule_ref) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_mingjing_relationship_pattern_invalid',
          index: i,
          reason: 'pattern_id_rule_mismatch',
        },
      };
    }
    if (typeof pattern.rank !== 'number' || !Number.isInteger(pattern.rank) || pattern.rank < 1) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_mingjing_relationship_pattern_invalid',
          index: i,
          reason: 'rank_invalid',
        },
      };
    }
    ranks.push(pattern.rank);
    if (
      !isStringArray(pattern.driver_refs) ||
      pattern.driver_refs.length === 0 ||
      pattern.driver_refs.some((ref) => ref.length === 0)
    ) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_mingjing_relationship_pattern_invalid',
          index: i,
          reason: 'driver_refs_invalid',
        },
      };
    }
    if (!isNonEmptyString(pattern.evidence_summary)) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_mingjing_relationship_pattern_invalid',
          index: i,
          reason: 'evidence_summary_empty',
        },
      };
    }
    for (const field of MINGJING_RELATIONSHIP_PATTERN_PROSE_FIELDS) {
      if (!isNonEmptyString(pattern[field])) {
        return {
          ok: false,
          error: {
            code: 'mirror_output_mingjing_relationship_pattern_invalid',
            index: i,
            reason: `${field}_empty`,
          },
        };
      }
    }
    if (
      !isStringArray(pattern.signals) ||
      pattern.signals.length < RELATIONSHIP_SIGNAL_MIN ||
      pattern.signals.length > RELATIONSHIP_SIGNAL_MAX ||
      pattern.signals.some((signal) => signal.length === 0)
    ) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_mingjing_relationship_pattern_invalid',
          index: i,
          reason: 'signals_invalid',
        },
      };
    }
  }
  // Rank is the deterministic 1-based order: it must match the array position
  // exactly (a strict 1..n permutation in order), so post-hoc rank tampering
  // or reordering fails closed.
  const isOrderedPermutation = ranks.every((rank, index) => rank === index + 1);
  if (!isOrderedPermutation) {
    return {
      ok: false,
      error: {
        code: 'mirror_output_mingjing_relationship_patterns_invalid',
        reason: 'rank_not_permutation',
      },
    };
  }
  return null;
}

function validateRelationshipRecentWindow(
  window: unknown,
  anchorYear: number,
): MirrorOutputValidationResult | null {
  if (!isRecord(window)) {
    return {
      ok: false,
      error: {
        code: 'mirror_output_mingjing_relationship_recent_window_invalid',
        reason: 'not_object',
      },
    };
  }
  const extra = findUnexpectedKey(window, MINGJING_RELATIONSHIP_RECENT_WINDOW_KEYS);
  if (extra) {
    return {
      ok: false,
      error: {
        code: 'mirror_output_mingjing_relationship_recent_window_invalid',
        reason: `unexpected_field:${extra}`,
      },
    };
  }
  if (!isLocalDate(window.start_date) || !isLocalDate(window.end_date)) {
    return {
      ok: false,
      error: {
        code: 'mirror_output_mingjing_relationship_recent_window_invalid',
        reason: 'date_invalid',
      },
    };
  }
  if (window.start_date > window.end_date) {
    return {
      ok: false,
      error: {
        code: 'mirror_output_mingjing_relationship_recent_window_invalid',
        reason: 'range_invalid',
      },
    };
  }
  if (!isAllowedTendencyClass(window.nature)) {
    return {
      ok: false,
      error: {
        code: 'mirror_output_mingjing_relationship_recent_window_invalid',
        reason: 'nature_invalid',
      },
    };
  }
  // @nimi-authority: rule.shijing.algorithm.r019
  if (window.start_date !== `${anchorYear}-01-01` || window.end_date !== `${anchorYear}-12-31`) {
    return {
      ok: false,
      error: {
        code: 'mirror_output_mingjing_relationship_recent_window_invalid',
        reason: 'anchor_year_precision_required',
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
        code: 'mirror_output_mingjing_relationship_recent_window_invalid',
        reason: 'driver_refs_invalid',
      },
    };
  }
  if (!isNonEmptyString(window.summary)) {
    return {
      ok: false,
      error: {
        code: 'mirror_output_mingjing_relationship_recent_window_invalid',
        reason: 'summary_empty',
      },
    };
  }
  return null;
}

function validateRelationshipRecentStatus(
  output: MingJingRelationshipMirrorOutput,
): MirrorOutputValidationResult | null {
  const status = output.recent_status as unknown;
  if (!isRecord(status)) {
    return {
      ok: false,
      error: {
        code: 'mirror_output_mingjing_relationship_recent_status_invalid',
        reason: 'not_object',
      },
    };
  }
  if (status.availability === 'available') {
    const extra = findUnexpectedKey(status, MINGJING_RELATIONSHIP_RECENT_STATUS_AVAILABLE_KEYS);
    if (extra) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_mingjing_relationship_recent_status_invalid',
          reason: `unexpected_field:${extra}`,
        },
      };
    }
    return validateRelationshipRecentWindow(status.window, output.relationship_subject.anchor_year);
  }
  if (status.availability === 'unavailable') {
    const extra = findUnexpectedKey(status, MINGJING_RELATIONSHIP_RECENT_STATUS_UNAVAILABLE_KEYS);
    if (extra) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_mingjing_relationship_recent_status_invalid',
          reason: `unexpected_field:${extra}`,
        },
      };
    }
    if (
      typeof status.reason !== 'string' ||
      !(RELATIONSHIP_RECENT_UNAVAILABLE_REASONS as readonly string[]).includes(status.reason)
    ) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_mingjing_relationship_recent_status_invalid',
          reason: 'reason_invalid',
        },
      };
    }
    return null;
  }
  return {
    ok: false,
    error: {
      code: 'mirror_output_mingjing_relationship_recent_status_invalid',
      reason: 'availability_invalid',
    },
  };
}

function validateRelationshipAction(
  output: MingJingRelationshipMirrorOutput,
): MirrorOutputValidationResult | null {
  const action = output.action as unknown;
  if (!isRecord(action)) {
    return {
      ok: false,
      error: { code: 'mirror_output_mingjing_relationship_action_invalid', reason: 'not_object' },
    };
  }
  const extra = findUnexpectedKey(action, MINGJING_RELATIONSHIP_ACTION_KEYS);
  if (extra) {
    return {
      ok: false,
      error: {
        code: 'mirror_output_mingjing_relationship_action_invalid',
        reason: `unexpected_field:${extra}`,
      },
    };
  }
  const target = action.target;
  if (!isRecord(target)) {
    return {
      ok: false,
      error: {
        code: 'mirror_output_mingjing_relationship_action_target_mismatch',
        reason: 'target_not_object',
      },
    };
  }
  if (target.kind === 'pattern') {
    const targetExtra = findUnexpectedKey(target, MINGJING_RELATIONSHIP_ACTION_TARGET_PATTERN_KEYS);
    if (targetExtra) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_mingjing_relationship_action_target_mismatch',
          reason: `unexpected_field:${targetExtra}`,
        },
      };
    }
    const patterns = Array.isArray(output.patterns) ? output.patterns : [];
    if (
      !isNonEmptyString(target.pattern_id) ||
      !patterns.some((pattern) => pattern.pattern_id === target.pattern_id)
    ) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_mingjing_relationship_action_target_mismatch',
          reason: 'pattern_id_unknown',
        },
      };
    }
  } else if (target.kind === 'recent_window') {
    const targetExtra = findUnexpectedKey(
      target,
      MINGJING_RELATIONSHIP_ACTION_TARGET_RECENT_WINDOW_KEYS,
    );
    if (targetExtra) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_mingjing_relationship_action_target_mismatch',
          reason: `unexpected_field:${targetExtra}`,
        },
      };
    }
    const status = output.recent_status;
    if (!isRecord(status) || status.availability !== 'available') {
      return {
        ok: false,
        error: {
          code: 'mirror_output_mingjing_relationship_action_target_mismatch',
          reason: 'recent_window_requires_available',
        },
      };
    }
  } else {
    return {
      ok: false,
      error: {
        code: 'mirror_output_mingjing_relationship_action_target_mismatch',
        reason: 'target_kind_invalid',
      },
    };
  }
  for (const field of MINGJING_RELATIONSHIP_ACTION_PROSE_FIELDS) {
    if (!isNonEmptyString(action[field])) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_mingjing_relationship_action_invalid',
          reason: `${field}_empty`,
        },
      };
    }
  }
  return null;
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

  const subjectCheck = validateRelationshipSubject(output);
  if (subjectCheck) return subjectCheck;
  const overviewCheck = validateRelationshipOverview(output);
  if (overviewCheck) return overviewCheck;
  const patternsCheck = validateRelationshipPatterns(output);
  if (patternsCheck) return patternsCheck;
  const recentStatusCheck = validateRelationshipRecentStatus(output);
  if (recentStatusCheck) return recentStatusCheck;
  const actionCheck = validateRelationshipAction(output);
  if (actionCheck) return actionCheck;

  return { ok: true };
}
