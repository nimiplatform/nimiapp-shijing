import { useMemo } from 'react';
import { useProductCopy } from '../i18n/copy.ts';
import { formatIsoForDisplay } from '../datetime/friendly-time.ts';
import { useShijingStore } from '../state/shijing-store.tsx';

// @nimi-authority: rule.shijing.ia.r004
export function PlanArchive() {
  const { state } = useShijingStore();
  const copy = useProductCopy();
  const archive = copy.planArchive;
  const plans = useMemo(
    () => [...state.snapshot.plan_items].sort((a, b) => b.planned_for.localeCompare(a.planned_for)),
    [state.snapshot.plan_items],
  );
  return (
    <section className="sjp-card" aria-label={archive.title}>
      <div className="sjp-card-head">
        <div className="sjp-card-headtext">
          <h2 className="sjp-card-title">{archive.title}</h2>
          <p className="sjp-card-desc">{archive.description}</p>
        </div>
        <span className="sjp-note">{archive.count(plans.length)}</span>
      </div>
      {plans.length > 0 ? (
        <ul className="sjp-records">
          {plans.map((plan) => (
            <li className="sjp-record" key={plan.id}>
              <span className="sjp-record__main">
                <span className="sjp-record__time">{formatIsoForDisplay(plan.planned_for)}</span>
                <span className="sjp-record__body">{plan.body}</span>
                <span className="sjp-note">{archive.source} {copy.recordSourceLabels[plan.source]}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : <p className="sjp-empty">{archive.empty}</p>}
    </section>
  );
}
