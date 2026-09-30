import type { Reading } from '../../../domain/reading.ts';
import type { BaseProductCopy } from '../../i18n/copy-types.ts';

export interface CitationBasisRow {
  readonly label: string;
  readonly value: string;
}

type CitationDrawerCopy = BaseProductCopy['citationDrawer'];

export function formatCitationMethod(method: string, copy: CitationDrawerCopy): string {
  return copy.methodLabels[method] ?? method.replaceAll('_', ' ');
}

export function formatCitationReference(reference: string, copy: CitationDrawerCopy): string {
  return copy.referenceLabels[reference] ?? reference.replace(/[._-]+/gu, ' ');
}

function formatCapturedAt(instant: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(instant);
  return match ? `${match[1]} ${match[2]} UTC` : instant;
}

function scopeBasis(reading: Reading, copy: CitationDrawerCopy): { label: string; value: string } {
  const scope = reading.mirror_scope;
  switch (scope.kind) {
    case 'daily':
      return { label: copy.referenceRange, value: copy.scopeDate(scope.date, scope.basis_time_zone) };
    case 'rolling_30_day':
    case 'long_horizon':
      return {
        label: copy.referenceRange,
        value: copy.scopeRange(scope.start_date, scope.end_date, scope.basis_time_zone),
      };
    case 'natal':
      return { label: copy.referenceRange, value: copy.natalAnchor(scope.anchor_year, scope.basis_time_zone) };
    case 'relationship_natal':
      return {
        label: copy.referenceRange,
        value: copy.relationshipAnchor(scope.anchor_year, scope.basis_time_zone),
      };
    case 'consultation': {
      const sourceCount = scope.source_reading_ids.length;
      const questionWindow = scope.question_window
        ? copy.questionWindow(scope.question_window.start_date, scope.question_window.end_date, scope.basis_time_zone)
        : '';
      return {
        label: copy.consultationBasis,
        value: questionWindow
          ? `${copy.consultationSourceCount(sourceCount)}；${questionWindow}`
          : copy.consultationSourceCount(sourceCount),
      };
    }
  }
}

export function buildCitationBasisRows(reading: Reading, copy: CitationDrawerCopy): CitationBasisRow[] {
  const basis = scopeBasis(reading, copy);
  return [
    {
      label: copy.method,
      value: formatCitationMethod(reading.inputs_summary.method_profile.id, copy),
    },
    basis,
    {
      label: copy.capturedAt,
      value: formatCapturedAt(reading.inputs_summary.captured_at),
    },
    {
      label: copy.localIntegrity,
      value: copy.localIntegrityValue,
    },
  ];
}
