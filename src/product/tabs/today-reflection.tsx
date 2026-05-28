// Today tab — reflection card. The mint-tinted callout that surfaces a
// single best self-question and a CTA into the consultation tab.

import { ChatIcon, ReflectionIcon } from './today-icons.tsx';
import type { TodayReflection } from './today-derive.ts';

export interface TodayReflectionCardProps {
  readonly content: TodayReflection;
  readonly ctaLabel: string;
  readonly onAsk: () => void;
}

export function TodayReflectionCard(props: TodayReflectionCardProps) {
  return (
    <article className="shijing-today-reflection">
      <header className="shijing-today-reflection__head">
        <span className="shijing-today-reflection__badge" aria-hidden>
          <ReflectionIcon />
        </span>
        <span className="shijing-today-reflection__eyebrow">{props.content.eyebrow}</span>
      </header>
      <p className="shijing-today-reflection__question">{props.content.question}</p>
      <div className="shijing-today-reflection__cta">
        <button
          type="button"
          className="shijing-today-reflection__button"
          onClick={props.onAsk}
        >
          <ChatIcon />
          <span>{props.ctaLabel}</span>
        </button>
        <p className="shijing-today-reflection__hint">{props.content.hint}</p>
      </div>
    </article>
  );
}
