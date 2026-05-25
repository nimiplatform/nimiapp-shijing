// SJG-ASTRO-01..03 — Reading kind/scope enums plus the kind/scope matrix
// mirror. The yaml under spec/kernel/tables/reading-kind-scope-matrix.yaml
// is the human source of truth; this constant is the machine consumer.
// They are kept in sync by the matrix test under
// test/reading.test.mjs (matrix-coverage assertion).

export type ReadingKind =
  | 'today'
  | 'period_outlook'
  | 'key_window'
  | 'sign'
  | 'consultation';

export const READING_KINDS: readonly ReadingKind[] = [
  'today',
  'period_outlook',
  'key_window',
  'sign',
  'consultation',
] as const;

export type ReadingScope = 'subject' | 'view' | 'ad_hoc';

export const READING_SCOPES: readonly ReadingScope[] = ['subject', 'view', 'ad_hoc'] as const;

export type MatrixCell = 'allowed' | 'forbidden' | 'self_only';

export type ReadingKindScopeMatrix = {
  readonly [K in ReadingKind]: { readonly [S in ReadingScope]: MatrixCell };
};

export const READING_KIND_SCOPE_MATRIX: ReadingKindScopeMatrix = {
  today: { subject: 'allowed', view: 'forbidden', ad_hoc: 'forbidden' },
  period_outlook: { subject: 'allowed', view: 'allowed', ad_hoc: 'allowed' },
  key_window: { subject: 'forbidden', view: 'allowed', ad_hoc: 'allowed' },
  sign: { subject: 'self_only', view: 'forbidden', ad_hoc: 'forbidden' },
  consultation: { subject: 'allowed', view: 'allowed', ad_hoc: 'allowed' },
};
