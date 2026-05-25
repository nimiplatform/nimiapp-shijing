// SJG-ALGO-12 — strict AstrologyOutput JSON parser. No zod dependency
// (would require package.json change); structural check is hand-rolled
// to fail-close on any deviation.

import type { AstrologyOutput, Highlight, Recommendation, AstrologyCitation, RecommendationHorizon } from '../../domain/reading.ts';
import type { SubjectRef } from '../../domain/subject-ref.ts';
import { isSelfRef, isPersonRef } from '../../domain/subject-ref.ts';

export type ParseFailureKind =
  | 'runtime_response_schema_invalid'
  | 'runtime_response_not_json'
  | 'runtime_response_empty'
  | 'forbidden_content';

export type ParseFailure = { kind: ParseFailureKind; detail: string };

// SJG-ASTRO-05 — forbidden output vocabulary. Any AI text matching one
// of these phrases must fail-close as `forbidden_content`; the caller
// surfaces it as a typed runtime failure (no synthesized substitute).
// Comparison is case-insensitive and uses substring match because the
// AI may embed a forbidden phrase inside a longer sentence.
const FORBIDDEN_PHRASES: readonly string[] = [
  'luck score',
  '幸运指数',
  '吉凶',
  '凶日',
  '凶',
  'venture node',
  'venture',
  'monthly report',
  'yearly report',
  'trend chart',
];

export type ParseOutcome =
  | { ok: true; output: AstrologyOutput }
  | { ok: false; error: ParseFailure };

const HORIZONS: readonly RecommendationHorizon[] = ['today', 'this_week', 'this_month', 'long_term'] as const;

function parseSubjectRef(value: unknown, path: string): SubjectRef | { error: string } {
  if (typeof value === 'string') {
    if (value !== 'self') return { error: `${path} string SubjectRef must be 'self'` };
    return 'self';
  }
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (o.kind === 'person' && typeof o.id === 'string' && o.id.length > 0) {
      return { kind: 'person', id: o.id };
    }
    return { error: `${path} object SubjectRef must be { kind:'person', id:string }` };
  }
  return { error: `${path} SubjectRef must be 'self' or { kind, id }` };
}

function isSubjectRefValue(v: unknown): boolean {
  if (typeof v === 'string') return v === 'self';
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return o.kind === 'person' && typeof o.id === 'string';
  }
  return false;
}

function tryParseHighlight(value: unknown, idx: number): Highlight | string {
  if (!value || typeof value !== 'object') return `highlights[${idx}] not an object`;
  const o = value as Record<string, unknown>;
  if (typeof o.label !== 'string') return `highlights[${idx}].label not string`;
  if (typeof o.body !== 'string') return `highlights[${idx}].body not string`;
  const subjectResult = parseSubjectRef(o.subject_ref, `highlights[${idx}].subject_ref`);
  if (typeof subjectResult === 'object' && 'error' in subjectResult) return subjectResult.error;
  return { label: o.label, body: o.body, subject_ref: subjectResult as SubjectRef };
}

function tryParseRecommendation(value: unknown, idx: number): Recommendation | string {
  if (!value || typeof value !== 'object') return `recommendations[${idx}] not an object`;
  const o = value as Record<string, unknown>;
  if (typeof o.body !== 'string') return `recommendations[${idx}].body not string`;
  if (!HORIZONS.includes(o.horizon as RecommendationHorizon)) return `recommendations[${idx}].horizon not admitted`;
  const subjectResult = parseSubjectRef(o.subject_ref, `recommendations[${idx}].subject_ref`);
  if (typeof subjectResult === 'object' && 'error' in subjectResult) return subjectResult.error;
  return { body: o.body, subject_ref: subjectResult as SubjectRef, horizon: o.horizon as RecommendationHorizon };
}

function tryParseCitation(value: unknown, idx: number): AstrologyCitation | string {
  if (!value || typeof value !== 'object') return `citations[${idx}] not an object`;
  const o = value as Record<string, unknown>;
  if (typeof o.method !== 'string') return `citations[${idx}].method not string`;
  if (typeof o.reference !== 'string') return `citations[${idx}].reference not string`;
  return { method: o.method, reference: o.reference };
}

const ALLOWED_ROOT_KEYS = new Set(['summary', 'highlights', 'recommendations', 'citations']);

export function parseAstrologyOutput(text: string): ParseOutcome {
  if (!text || text.trim().length === 0) {
    return { ok: false, error: { kind: 'runtime_response_empty', detail: 'AI response is empty' } };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: { kind: 'runtime_response_not_json', detail: (e as Error).message } };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: { kind: 'runtime_response_schema_invalid', detail: 'root not an object' } };
  }
  const root = parsed as Record<string, unknown>;
  for (const key of Object.keys(root)) {
    if (!ALLOWED_ROOT_KEYS.has(key)) {
      return { ok: false, error: { kind: 'runtime_response_schema_invalid', detail: `root key '${key}' not in admitted set` } };
    }
  }
  if (typeof root.summary !== 'string' || root.summary.trim().length === 0) {
    return { ok: false, error: { kind: 'runtime_response_schema_invalid', detail: 'summary missing or empty' } };
  }
  if (!Array.isArray(root.highlights)) {
    return { ok: false, error: { kind: 'runtime_response_schema_invalid', detail: 'highlights not array' } };
  }
  if (!Array.isArray(root.recommendations)) {
    return { ok: false, error: { kind: 'runtime_response_schema_invalid', detail: 'recommendations not array' } };
  }
  if (!Array.isArray(root.citations)) {
    return { ok: false, error: { kind: 'runtime_response_schema_invalid', detail: 'citations not array' } };
  }
  const highlights: Highlight[] = [];
  for (let i = 0; i < root.highlights.length; i += 1) {
    const result = tryParseHighlight(root.highlights[i], i);
    if (typeof result === 'string') {
      return { ok: false, error: { kind: 'runtime_response_schema_invalid', detail: result } };
    }
    highlights.push(result);
  }
  const recommendations: Recommendation[] = [];
  for (let i = 0; i < root.recommendations.length; i += 1) {
    const result = tryParseRecommendation(root.recommendations[i], i);
    if (typeof result === 'string') {
      return { ok: false, error: { kind: 'runtime_response_schema_invalid', detail: result } };
    }
    recommendations.push(result);
  }
  const citations: AstrologyCitation[] = [];
  for (let i = 0; i < root.citations.length; i += 1) {
    const result = tryParseCitation(root.citations[i], i);
    if (typeof result === 'string') {
      return { ok: false, error: { kind: 'runtime_response_schema_invalid', detail: result } };
    }
    citations.push(result);
  }
  const output: AstrologyOutput = { summary: root.summary, highlights, recommendations, citations };
  // SJG-ASTRO-05 — forbidden vocabulary screen. Scan summary +
  // highlight bodies + recommendation bodies; first hit fails the
  // whole output. Must run AFTER structural parse so the failure
  // detail can cite the exact phrase that triggered.
  const screenedText = [
    output.summary,
    ...output.highlights.map((h) => `${h.label}\n${h.body}`),
    ...output.recommendations.map((r) => r.body),
  ].join('\n').toLowerCase();
  for (const phrase of FORBIDDEN_PHRASES) {
    if (screenedText.includes(phrase.toLowerCase())) {
      return {
        ok: false,
        error: { kind: 'forbidden_content', detail: `astrology output contains forbidden phrase '${phrase}' per SJG-ASTRO-05` },
      };
    }
  }
  return { ok: true, output };
}

void isSelfRef;
void isPersonRef;
void isSubjectRefValue;
