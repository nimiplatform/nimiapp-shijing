// RiJing — 「今天怎么做」 do / say / avoid action triptych.
//
// Three small cards beneath the event-input that translate the day into
// one concrete action, one thing to say, and one thing to avoid. Each
// card carries a colored badge icon and a bottom accent line keyed to its
// slot. Content comes from `deriveRiJingActions`; the section always
// renders (with calm fallback copy) so the guidance is present even
// before a reading is generated.

import { ChatIcon, DoubleChevronIcon, ProhibitIcon } from './rijing-icons.tsx';
import type { RiJingActionItem, RiJingActionSlot } from './rijing-derive.ts';

export interface RiJingActionsProps {
  readonly items: readonly RiJingActionItem[];
}

function IconForSlot({ slot }: { slot: RiJingActionSlot }) {
  switch (slot) {
    case 'do':
      return <DoubleChevronIcon />;
    case 'say':
      return <ChatIcon />;
    case 'avoid':
      return <ProhibitIcon />;
  }
}

export function RiJingActions(props: RiJingActionsProps) {
  return (
    <section className="shijing-rijing__actions" aria-label="今日行动">
      <header className="shijing-rijing__actions-head">
        <h3 className="shijing-rijing__actions-title">今日行动</h3>
      </header>
      <ul className="shijing-rijing__actions-grid">
        {props.items.map((item) => (
          <li
            key={item.slot}
            className={`shijing-rijing__action shijing-rijing__action--${item.slot}`}
          >
            <div className="shijing-rijing__action-head">
              <span className="shijing-rijing__action-badge" aria-hidden>
                <IconForSlot slot={item.slot} />
              </span>
              <span className="shijing-rijing__action-eyebrow">{item.eyebrow}</span>
            </div>
            <h4 className="shijing-rijing__action-title">{item.title}</h4>
            <p className="shijing-rijing__action-body">{item.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
