import type {
  InputsSummaryStaleness,
  InputsSummaryStalenessReason,
} from '../../astrology/inputs-summary-expiry.ts';

export type NianJingFreshnessView =
  | {
      readonly kind: 'fresh';
      readonly render_output: true;
      readonly can_import_to_consultation: true;
    }
  | {
      readonly kind: 'stale';
      readonly reason: InputsSummaryStalenessReason;
      readonly message: string;
      readonly render_output: false;
      readonly can_import_to_consultation: false;
    };

const STALE_MESSAGES: Readonly<Record<InputsSummaryStalenessReason, string>> = {
  age: '当前长程相位已超过 30 天,请重新生成。',
  mirror_scope_changed: '年镜时间窗已变化,旧长程相位已失效,请重新生成。',
  concern_tag_missing: '年镜关注已变化,旧长程相位已失效,请重新生成。',
  event_memory_refs_changed: '年镜引用资料已变化,旧长程相位已失效,请重新生成。',
  feature_snapshot_failed: '当前资料无法重新验证旧长程相位,请修正资料后重新生成。',
  input_hash_changed: '年镜输入已变化,旧长程相位已失效,请重新生成。',
  feature_snapshot_hash_changed: '年镜算法或输入已更新,旧长程相位已失效,请重新生成。',
};

export function nianjingFreshnessView(
  staleness: InputsSummaryStaleness,
): NianJingFreshnessView {
  if (!staleness.stale) {
    return {
      kind: 'fresh',
      render_output: true,
      can_import_to_consultation: true,
    };
  }

  return {
    kind: 'stale',
    reason: staleness.reason,
    message: STALE_MESSAGES[staleness.reason],
    render_output: false,
    can_import_to_consultation: false,
  };
}
