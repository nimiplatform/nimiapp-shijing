// Today tab — split cards: 时镜解读 (left) and 关系与事务 (right).

import { NoteIcon, ReflectionIcon } from './today-icons.tsx';
import type { TodaySplitCards } from './today-derive.ts';

export interface TodaySplitProps {
  readonly content: TodaySplitCards;
}

export function TodaySplit(props: TodaySplitProps) {
  const { interpretation, relations, affairs } = props.content;
  return (
    <div className="shijing-today-split">
      <article className="shijing-today-split__card shijing-today-split__card--interpretation">
        <header className="shijing-today-split__head">
          <span className="shijing-today-split__icon" aria-hidden>
            <ReflectionIcon />
          </span>
          <h4 className="shijing-today-split__title">时镜解读</h4>
        </header>
        <div className="shijing-today-split__body">
          {interpretation.map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </div>
      </article>
      <article className="shijing-today-split__card shijing-today-split__card--relations">
        <header className="shijing-today-split__head">
          <span className="shijing-today-split__icon" aria-hidden>
            <NoteIcon />
          </span>
          <h4 className="shijing-today-split__title">关系与事务</h4>
        </header>
        <dl className="shijing-today-split__grid">
          <div>
            <dt>关系</dt>
            <dd>{relations}</dd>
          </div>
          <div>
            <dt>事务</dt>
            <dd>{affairs}</dd>
          </div>
        </dl>
      </article>
    </div>
  );
}
