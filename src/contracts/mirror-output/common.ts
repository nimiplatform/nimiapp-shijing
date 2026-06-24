import {
  MIRROR_OUTPUT_ALLOWED_CITATION_METHODS,
  NIANJING_INFLECTION_KINDS,
  TENDENCY_CLASSES,
  type MirrorCitation,
} from '../../domain/mirror-output.ts';
import type { MirrorOutputValidationResult } from '../mirror-output-validator.ts';

const COMMON_FORBIDDEN_OUTPUT_FIELDS: readonly string[] = [
  'score',
  'luck_score',
  'luck_curve',
  'luck_rank',
  'percentile',
  'trend_chart',
  'trend_curve',
  'trend_curves',
  'k_line',
  'k_line_bar',
  'kline',
  'curve',
  'numeric_series',
  'report',
  'reports',
  'monthly_report',
  'yearly_report',
  'task_status',
  'progress',
  'gantt',
  'milestone',
  'deadline',
  'priority',
  'match_score',
  'match_percentage',
  'compatibility',
  'compatibility_score',
  'compatibility_percentage',
  'compatibility_graph',
  'relation_graph',
  'relationship_graph',
  'contact_payload',
  'timing',
];

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function ensureNoForbiddenFields(
  record: Record<string, unknown>,
): MirrorOutputValidationResult | null {
  for (const field of COMMON_FORBIDDEN_OUTPUT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(record, field)) {
      return {
        ok: false,
        error: { code: 'mirror_output_forbidden_field_present', field },
      };
    }
  }
  return null;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function findUnexpectedKey(record: Record<string, unknown>, allowed: ReadonlySet<string>): string | null {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) return key;
  }
  return null;
}

export function isAllowedCitationMethod(
  value: unknown,
): value is MirrorCitation['method'] {
  return (
    typeof value === 'string' &&
    (MIRROR_OUTPUT_ALLOWED_CITATION_METHODS as readonly string[]).includes(value)
  );
}

const MIRROR_CITATION_KEYS = new Set<string>(['method', 'reference']);

export function isAllowedTendencyClass(value: unknown): boolean {
  return typeof value === 'string' && (TENDENCY_CLASSES as readonly string[]).includes(value);
}

export function isAllowedInflectionKind(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    (NIANJING_INFLECTION_KINDS as readonly string[]).includes(value)
  );
}

export function isLocalDate(value: unknown): value is string {
  if (typeof value !== 'string' || !LOCAL_DATE_PATTERN.test(value)) return false;
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const utcMs = Date.UTC(year, month - 1, day);
  const d = new Date(utcMs);
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() + 1 === month &&
    d.getUTCDate() === day
  );
}

export function validateCitations(
  citations: unknown,
): MirrorOutputValidationResult | null {
  if (!Array.isArray(citations)) {
    return { ok: false, error: { code: 'mirror_output_citations_invalid' } };
  }
  for (let i = 0; i < citations.length; i += 1) {
    const citation = citations[i] as Partial<MirrorCitation>;
    if (!isRecord(citation)) {
      return {
        ok: false,
        error: { code: 'mirror_output_citation_method_invalid', index: i, received: citation },
      };
    }
    const citationExtra = findUnexpectedKey(citation, MIRROR_CITATION_KEYS);
    if (citationExtra) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_citation_method_invalid',
          index: i,
          received: citationExtra,
        },
      };
    }
    if (!isAllowedCitationMethod(citation.method)) {
      return {
        ok: false,
        error: {
          code: 'mirror_output_citation_method_invalid',
          index: i,
          received: citation.method,
        },
      };
    }
    if (typeof citation.reference !== 'string' || citation.reference.length === 0) {
      return { ok: false, error: { code: 'mirror_output_citation_reference_empty', index: i } };
    }
  }
  return null;
}

export function isGanzhiPillar(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.stem === 'string' &&
    value.stem.length > 0 &&
    typeof value.branch === 'string' &&
    value.branch.length > 0
  );
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}
