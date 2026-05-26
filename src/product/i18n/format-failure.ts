// Failure → { headline, technical } projection. The headline is
// shown to the user in plain Chinese; the technical string is the
// raw code/detail to surface inside <TechnicalDetails> so support
// engineers can still copy the original anchor.

import type { GenerateAndStoreFailure } from '../reading/generate-and-store.ts';
import { FAILURE_HEADLINES } from './copy.ts';

export interface FormattedFailure {
  readonly headline: string;
  readonly technical: string;
}

export function formatGenerateReadingFailure(error: GenerateAndStoreFailure): FormattedFailure {
  if (error.kind === 'input_readiness_failed') {
    return {
      headline: FAILURE_HEADLINES.input_readiness_failed,
      technical: `input_readiness_failed: ${error.reason}\n${error.detail}`,
    };
  }
  if (error.kind === 'pipeline_stage_failed') {
    const f = error.stage_failure;
    const detail = f.detail ? `\n${f.detail}` : '';
    return {
      headline: FAILURE_HEADLINES.pipeline_stage_failed,
      technical: `pipeline_stage_failed: ${f.stage} / ${f.kind}${detail}`,
    };
  }
  if (error.kind === 'runtime_ai_failed') {
    const f = error.ai_failure;
    const detail = f.detail ? `\n${f.detail}` : '';
    return {
      headline: FAILURE_HEADLINES.runtime_ai_failed,
      technical: `runtime_ai_failed: ${f.kind}${detail}`,
    };
  }
  return {
    headline: FAILURE_HEADLINES.reading_validation_failed,
    technical: `reading_validation_failed: ${error.validation_error.code}`,
  };
}

export function formatChatFailure(code: string, detail: string): FormattedFailure {
  return {
    headline: FAILURE_HEADLINES.chat_generator_failed,
    technical: detail ? `${code}\n${detail}` : code,
  };
}

export function formatValidatorRefusal(code: string): FormattedFailure {
  return {
    headline: FAILURE_HEADLINES.snapshot_rejected,
    technical: code,
  };
}

export function formatCreateRefusal(code: string): FormattedFailure {
  return {
    headline: FAILURE_HEADLINES.create_refused,
    technical: code,
  };
}

export function formatDeleteValidatorRefusal(code: string): FormattedFailure {
  return {
    headline: FAILURE_HEADLINES.delete_refused_validator,
    technical: code,
  };
}

export function formatSaveRefusal(code: string): FormattedFailure {
  return {
    headline: FAILURE_HEADLINES.save_refused,
    technical: code,
  };
}

// Delete-refused-by-dangling-reference: the message includes a
// human-readable count + first-via path. We keep the raw via path
// untranslated in the technical block (it is an internal dotted path
// used for debugging), and produce a Chinese count summary as the
// headline.
export function formatDanglingRefusal(count: number, firstVia: string): FormattedFailure {
  return {
    headline: `暂时无法删除：该项被 ${count} 处引用。请先调整或删除引用方。`,
    technical: `dangling_reference (first via): ${firstVia}`,
  };
}
