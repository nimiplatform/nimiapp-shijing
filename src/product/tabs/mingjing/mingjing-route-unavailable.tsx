import type { ProductCopy } from '../../i18n/copy.ts';

export interface MingJingRouteUnavailableProps {
  readonly copy: ProductCopy['mingjing'];
  readonly detail: string;
  readonly onSwitchRoute: () => void;
}

export function MingJingRouteUnavailable({
  copy,
  detail,
  onSwitchRoute,
}: MingJingRouteUnavailableProps) {
  return (
    <div className="shijing-mingjing__readiness" role="status" data-mingjing-route-state="unavailable">
      <h2 className="shijing-mingjing__readiness-title">{copy.readiness.title}</h2>
      <p className="shijing-mingjing__readiness-body">
        {copy.readiness.reasons.mingjing_route_unavailable ?? copy.readiness.fallback}
      </p>
      <p className="shijing-mingjing__readiness-body">{detail}</p>
      <button type="button" className="shijing-mingjing__readiness-btn" onClick={onSwitchRoute}>
        {copy.readiness.button}
      </button>
    </div>
  );
}
