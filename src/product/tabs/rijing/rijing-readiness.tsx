// RiJing — "资料完整度" info card.
//
// Sits between the Hero card and the event-input slot. When self
// natal readiness reports a non-OK reason, we render a calm
// completeness signal (not a warning): info icon, a short title that
// names what is incomplete, one body line that describes what
// 补全 will unlock, and a "完善资料 →" text link that opens Settings
// at the Self surface (the W05 secondary surface).
//
// The card never claims the existing reading is wrong — it points at
// what to补充 next so future readings can be more precise. Aligned
// with the SJG-IA-05 readiness blocker codes.

import { InfoIcon } from './rijing-icons.tsx';
import type { NatalReadiness } from '../../subjects/natal-readiness.ts';
import { useProductCopy } from '../../i18n/copy.ts';

export interface RiJingReadinessNoticeProps {
  readonly readiness: NatalReadiness;
  readonly onRequestOpenSettings: () => void;
}

export function RiJingReadinessNotice(props: RiJingReadinessNoticeProps) {
  const productCopy = useProductCopy();
  if (props.readiness.ok) return null;
  const copy = productCopy.rijing.readiness.reasons[props.readiness.reason] ?? productCopy.rijing.readiness.fallback;
  return (
    <aside
      className="shijing-rijing__readiness"
      role="status"
      aria-label={productCopy.rijing.readiness.ariaLabel}
    >
      <span className="shijing-rijing__readiness-icon" aria-hidden>
        <InfoIcon />
      </span>
      <div className="shijing-rijing__readiness-copy">
        <p className="shijing-rijing__readiness-title">{copy.title}</p>
        <p className="shijing-rijing__readiness-body">{copy.body}</p>
      </div>
      <button
        type="button"
        className="shijing-rijing__readiness-link"
        onClick={props.onRequestOpenSettings}
      >
        {productCopy.rijing.readiness.button}
        <span className="shijing-rijing__readiness-link-arrow" aria-hidden>→</span>
      </button>
    </aside>
  );
}
