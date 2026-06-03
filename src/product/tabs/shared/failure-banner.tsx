// W06 — typed ReadingGenerationFailure banner (shared across tabs).
//
// SJG-PROD-11 + SJG-ALGO-10: render the failure code verbatim. Never
// substitute synthesized Reading content.

import type { ReadingGenerationFailure } from '../../../domain/reading.ts';

const FAILURE_HEADLINES: Record<ReadingGenerationFailure['kind'], string> = {
  runtime_ai_failed: '生成失败:Runtime AI 不可用或解析失败。',
  pipeline_stage_failed: '生成失败:推算阶段出错。',
  validation_failed: '生成失败:解读未通过格式校验。',
  stale_inputs: '生成失败:输入快照已过期,请重新生成。',
  hash_mismatch: '生成失败:哈希校验未通过,请重新生成。',
};

export interface FailureBannerProps {
  readonly failure: ReadingGenerationFailure;
}

export function FailureBanner(props: FailureBannerProps) {
  return (
    <p role="alert" className="shijing-failure-banner" data-failure-kind={props.failure.kind}>
      {FAILURE_HEADLINES[props.failure.kind]}
      {props.failure.detail ? <code>{props.failure.detail}</code> : null}
    </p>
  );
}
