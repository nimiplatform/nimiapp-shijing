import type { Reading } from '../../../domain/reading.ts';
import type { BaseProductCopy } from '../../i18n/copy-types.ts';

export interface CitationBasisRow {
  readonly label: string;
  readonly value: string;
}

type CitationDrawerCopy = BaseProductCopy['citationDrawer'];

const METHOD_LABELS: Record<string, string> = {
  bazi_ziping_v1: '八字子平法',
  ziwei_sanhe_v1: '紫微斗数（三合派）',
  qizheng_siyu_guolao_v1: '七政四余 / 果老星宗',
};

const REFERENCE_LABELS: Record<string, string> = {
  'rijing.daily_tendency_classification': '日镜每日倾向分类',
  'yuejing.daily_tendency_drivers': '月镜每日倾向依据',
  'nianjing.phase_inflection_derivation': '年镜相位与转折推导',
  'shijing.consultation_grounding': '问镜引用解读与问题上下文',
  'mingjing.natal_projection': '命镜本命盘投影',
  'mingjing.ziwei_natal_brief.v1': '命镜紫微本命解读',
  'mingjing.qizheng_siyu_natal_brief.v1': '命镜七政四余本命解读',
  'mingjing.relationship_hepan.v1': '合镜关系合盘依据',
};

export function formatCitationMethod(method: string): string {
  return METHOD_LABELS[method] ?? method.replaceAll('_', ' ');
}

export function formatCitationReference(reference: string): string {
  return REFERENCE_LABELS[reference] ?? reference.replace(/[._-]+/gu, ' ');
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
      value: formatCitationMethod(reading.inputs_summary.method_profile.id),
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
