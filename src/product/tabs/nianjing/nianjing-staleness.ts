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

export function nianjingFreshnessView(
  staleness: InputsSummaryStaleness,
  messages: Readonly<Record<InputsSummaryStalenessReason, string>>,
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
    message: messages[staleness.reason],
    render_output: false,
    can_import_to_consultation: false,
  };
}
