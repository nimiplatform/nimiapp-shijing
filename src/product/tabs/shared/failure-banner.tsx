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
  algorithm_fail_closed: '生成失败:当前资料精度不足以生成该镜面解读(SJG-ALGO-10 已按规则收口)。',
};

export interface FailureBannerProps {
  readonly failure: ReadingGenerationFailure;
  readonly action?: {
    readonly label: string;
    readonly onClick: () => void;
  };
}

export function FailureBanner(props: FailureBannerProps) {
  return (
    <div role="alert" className="shijing-failure-banner" data-failure-kind={props.failure.kind}>
      <div className="shijing-failure-banner__copy">
        {FAILURE_HEADLINES[props.failure.kind]}
        {props.failure.detail ? <code>{props.failure.detail}</code> : null}
      </div>
      {props.action ? (
        <button
          type="button"
          className="shijing-failure-banner__action"
          onClick={props.action.onClick}
        >
          {props.action.label}
        </button>
      ) : null}
    </div>
  );
}
