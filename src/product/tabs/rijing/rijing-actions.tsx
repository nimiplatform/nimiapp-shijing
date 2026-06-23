// RiJing — 今日行动.
//
// Two calm cards: 今天做一件事 (one concrete move) and 今天说一句话 (one thing
// worth saying), each pulled verbatim from a projection recommendation and
// footnoted with the concern it came from. A right-aligned 「导入到时镜咨询」
// action lets the user carry the day into a 时镜 consultation. Content comes
// from `deriveRiJingActions`; no items → the section is not rendered.

import { ChatIcon, PencilIcon } from './rijing-icons.tsx';
import { ImportToShiJingButton } from '../shared/import-to-shijing-button.tsx';
import type { RiJingActionItem, RiJingActionSlot } from './rijing-derive.ts';
import { useProductCopy } from '../../i18n/copy.ts';

export interface RiJingActionsProps {
  readonly items: readonly RiJingActionItem[];
  readonly importReadingId?: string;
}

function IconForSlot({ slot }: { slot: RiJingActionSlot }) {
  return slot === 'do' ? <PencilIcon /> : <ChatIcon />;
}

export function RiJingActions(props: RiJingActionsProps) {
  const copy = useProductCopy();
  if (props.items.length === 0) return null;

  return (
    <section className="shijing-rijing__actions" aria-label={copy.rijing.actions.ariaLabel}>
      <header className="shijing-rijing__actions-head">
        <h2 className="shijing-rijing__actions-title">{copy.rijing.actions.title}</h2>
      </header>
      <ul className="shijing-rijing__actions-grid">
        {props.items.map((item) => (
          <li key={item.slot} className="shijing-rijing__action">
            <div className="shijing-rijing__action-head">
              <span className="shijing-rijing__action-badge" aria-hidden>
                <IconForSlot slot={item.slot} />
              </span>
              <span className="shijing-rijing__action-eyebrow">{item.eyebrow}</span>
            </div>
            <p className="shijing-rijing__action-body">{item.body}</p>
            {item.source_tag ? (
              <span className="shijing-rijing__action-source">
                {copy.rijing.actions.sourceLead} #{item.source_tag}
                {item.source_theme ? <> · {item.source_theme}</> : null}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      {props.importReadingId ? (
        <div className="shijing-rijing__actions-footer">
          <ImportToShiJingButton readingId={props.importReadingId} />
        </div>
      ) : null}
    </section>
  );
}
