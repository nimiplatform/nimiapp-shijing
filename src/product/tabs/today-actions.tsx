// Today tab — "今天怎么做" three small action cards: do / say / avoid.

import { ChatIcon, PlayIcon, WarnIcon } from './today-icons.tsx';
import type { TodayActionItem } from './today-derive.ts';

export interface TodayActionsProps {
  readonly items: readonly TodayActionItem[];
}

function IconForSlot({ slot }: { slot: TodayActionItem['slot'] }) {
  switch (slot) {
    case 'do':
      return <PlayIcon />;
    case 'say':
      return <ChatIcon />;
    case 'avoid':
      return <WarnIcon />;
  }
}

export function TodayActions(props: TodayActionsProps) {
  return (
    <section className="shijing-today-section" aria-label="今天怎么做">
      <h3 className="shijing-today-section__title">今天怎么做</h3>
      <div className="shijing-today-actions">
        {props.items.map((item) => (
          <article
            key={item.slot}
            className={`shijing-today-action shijing-today-action--${item.slot}`}
          >
            <div className="shijing-today-action__head">
              <span className="shijing-today-action__badge" aria-hidden>
                <IconForSlot slot={item.slot} />
              </span>
              <span className="shijing-today-action__eyebrow">{item.eyebrow}</span>
            </div>
            <h4 className="shijing-today-action__title">{item.title}</h4>
            <p className="shijing-today-action__body">{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
