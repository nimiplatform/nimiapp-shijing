// RiJing — concern-tag projections grid.
//
// Replaces the legacy "今天怎么做" three-card surface. The new mirror
// architecture gives us one projection per active concern tag (up to
// five), each carrying a tendency_class + summary + recommendations.
// We render them as a responsive grid: 3 across on desktop, single
// column on narrow viewports.
//
// Tag labels come from the concern-tag snapshot when the projection's
// `concern_tag_ref` resolves; otherwise we fall back to the raw ref so
// nothing is silently dropped.

import type {
  RiJingConcernProjection,
  TendencyClass,
} from '../../../domain/mirror-output.ts';
import type { ConcernTag } from '../../../domain/concern-tag.ts';
import { TENDENCY_CLASS_LABELS } from '../../i18n/copy.ts';

export interface RiJingProjectionsProps {
  readonly projections: readonly RiJingConcernProjection[];
  readonly concernTags: readonly ConcernTag[];
}

function labelForTag(ref: string, tags: readonly ConcernTag[]): string {
  return tags.find((t) => t.id === ref)?.label ?? ref;
}

const TENDENCY_TONE: Record<TendencyClass, string> = {
  supportive: 'supportive',
  steady: 'steady',
  watch: 'watch',
  blocked: 'blocked',
  turning: 'turning',
};

export function RiJingProjections(props: RiJingProjectionsProps) {
  if (props.projections.length === 0) return null;
  return (
    <section className="shijing-rijing__projections" aria-label="今日关注分镜">
      <header className="shijing-rijing__projections-head">
        <h3 className="shijing-rijing__projections-title">今日关注分镜</h3>
      </header>
      <ul className="shijing-rijing__projections-grid">
        {props.projections.map((proj) => {
          const tone = TENDENCY_TONE[proj.tendency_class];
          return (
            <li
              key={proj.concern_tag_ref}
              className={`shijing-rijing__projection shijing-rijing__projection--${tone}`}
            >
              <header className="shijing-rijing__projection-head">
                <span className="shijing-rijing__projection-tag">
                  {labelForTag(proj.concern_tag_ref, props.concernTags)}
                </span>
                <span
                  className={`shijing-rijing__projection-tendency shijing-rijing__projection-tendency--${tone}`}
                >
                  {TENDENCY_CLASS_LABELS[proj.tendency_class]}
                </span>
              </header>
              <p className="shijing-rijing__projection-summary">{proj.summary}</p>
              {proj.recommendations.length > 0 ? (
                <ul className="shijing-rijing__projection-recs">
                  {proj.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
