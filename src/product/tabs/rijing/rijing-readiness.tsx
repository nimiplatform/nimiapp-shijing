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
import type { NatalReadiness, NatalReadinessReason } from '../../subjects/natal-readiness.ts';

interface ReadinessCopy {
  readonly title: string;
  readonly body: string;
}

function readinessCopy(reason: NatalReadinessReason): ReadinessCopy {
  switch (reason) {
    case 'subject_missing':
    case 'natal_inputs_invalid':
    case 'scaffold_default_natal_inputs':
      return {
        title: '资料完整度：本人生辰待建立',
        body: '补充后即可生成今日日镜。',
      };
    case 'birth_precision_unknown':
      return {
        title: '资料完整度：出生时间精度待补充',
        body: '补充后可细化时柱、大运与分镜建议。',
      };
    case 'birth_location_unresolved':
      return {
        title: '资料完整度：出生地点待补充',
        body: '补充后真太阳时与时区会更准确。',
      };
    case 'birth_precision_rough_year_for_mirror':
      return {
        title: '资料完整度：出生时间需补到月或日',
        body: '当前仅约到年，非本命解读会受限。',
      };
    case 'birth_precision_rough_month_for_dayun':
      return {
        title: '资料完整度：出生时间建议补到日',
        body: '当前仅约到月，需要大运的判断会偏移。',
      };
    case 'calculation_sex_unspecified_for_dayun':
      return {
        title: '资料完整度：性别待补充',
        body: '补充后可推算大运起运方向。',
      };
    default: {
      const exhaustive: never = reason;
      void exhaustive;
      return { title: '资料完整度：待补充', body: '补充后判断会更精细。' };
    }
  }
}

export interface RiJingReadinessNoticeProps {
  readonly readiness: NatalReadiness;
  readonly onRequestOpenSettings: () => void;
}

export function RiJingReadinessNotice(props: RiJingReadinessNoticeProps) {
  if (props.readiness.ok) return null;
  const copy = readinessCopy(props.readiness.reason);
  return (
    <aside
      className="shijing-rijing__readiness"
      role="status"
      aria-label="资料完整度提示"
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
        完善资料
        <span className="shijing-rijing__readiness-link-arrow" aria-hidden>→</span>
      </button>
    </aside>
  );
}
