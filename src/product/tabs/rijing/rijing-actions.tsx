// RiJing — 今日行动.
//
// One calm card per concern, listing that concern's recommendations verbatim
// from the generated projections. The expanded 关注分镜 row stays narrative-only
// so the complete recommendation lists appear here once.
// Content comes from `deriveRiJingActions`; no groups → the section is not
// rendered.

import type { ConcernTag } from '../../../domain/concern-tag.ts';
import { concernIconFor } from './rijing-icons.tsx';
import type { RiJingActionGroup } from './rijing-derive.ts';
import { concernLabelForDisplay, stripConcernDisplayHash } from './rijing-projection-display.ts';
import { useProductCopy } from '../../i18n/copy.ts';

export interface RiJingActionsProps {
  readonly groups: readonly RiJingActionGroup[];
  readonly concernTags: readonly ConcernTag[];
}

export function RiJingActions(props: RiJingActionsProps) {
  const copy = useProductCopy();
  if (props.groups.length === 0) return null;

  return (
    <section className="shijing-rijing__actions" aria-label={copy.rijing.actions.ariaLabel}>
      <header className="shijing-rijing__actions-head">
        <h2 className="shijing-rijing__actions-title">{copy.rijing.actions.title}</h2>
      </header>
      <ul className="shijing-rijing__actions-grid">
        {props.groups.map((group) => {
          const tag = props.concernTags.find((t) => t.id === group.concern_tag_ref);
          const name = concernLabelForDisplay(group.tag_label);
          const Icon = concernIconFor(name, tag?.parsed_topics ?? []);
          return (
            <li key={group.concern_tag_ref} className="shijing-rijing__action">
              <div className="shijing-rijing__action-head">
                <span className="shijing-rijing__action-badge" aria-hidden>
                  <Icon />
                </span>
                <span className="shijing-rijing__action-eyebrow">{name}</span>
              </div>
              <ul className="shijing-rijing__action-list">
                {group.recommendations.map((rec, i) => (
                  <li key={i} className="shijing-rijing__action-item">
                    <span className="shijing-rijing__action-dot" aria-hidden />
                    <span>{stripConcernDisplayHash(rec)}</span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
