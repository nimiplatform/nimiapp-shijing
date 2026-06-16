// RiJing — Hero conclusion card.
//
// The mirror equivalent of the old "今日 Hero". Renders the eyebrow,
// the stage-derived headline, keyword chips, the narrative
// paragraph, the tendency leaning chips, the confidence line, the
// reminder callout, and an embedded "今日参考的事件" footer.
//
// An icon-only refresh button is pinned to the top-right corner so the
// user can re-run the day from inside the conclusion card without
// scrolling.

import { HeartIcon, RefreshIcon } from './rijing-icons.tsx';
import { RiJingHeroMemories } from './rijing-hero-memories.tsx';
import type { RiJingHeroContent } from './rijing-derive.ts';
import { useProductCopy } from '../../i18n/copy.ts';

export interface RiJingHeroFocusTag {
  readonly id: string;
  readonly label: string;
}

export interface RiJingHeroProps {
  readonly content: RiJingHeroContent;
  readonly refreshDisabled: boolean;
  readonly refreshAriaLabel: string;
  readonly onRefresh: () => void;
  // Active concern tags shown as the day's "解读视角" perspective, merged
  // into this overview card (previously a standalone bottom module).
  readonly focusTags: readonly RiJingHeroFocusTag[];
  readonly onManageFocus: () => void;
  readonly emptyAction?: {
    readonly label: string;
    readonly onClick: () => void;
  };
}

export function RiJingHero(props: RiJingHeroProps) {
  const copy = useProductCopy();
  const { content } = props;
  return (
    <article
      className={`shijing-rijing__hero${content.hasReading ? '' : ' shijing-rijing__hero--empty'}`}
      aria-labelledby="shijing-rijing__hero-headline"
    >
      <button
        type="button"
        className="shijing-rijing__hero-refresh"
        onClick={props.onRefresh}
        disabled={props.refreshDisabled}
        aria-label={props.refreshAriaLabel}
        title={props.refreshAriaLabel}
      >
        <RefreshIcon />
      </button>
      <div className="shijing-rijing__hero-eyebrow" aria-hidden>
        <span className="shijing-rijing__hero-eyebrow-dash" />
        <span>{content.eyebrow}</span>
        <span className="shijing-rijing__hero-eyebrow-dash" />
      </div>
      <h3 id="shijing-rijing__hero-headline" className="shijing-rijing__hero-headline">
        {content.headline}
      </h3>
      <div className="shijing-rijing__hero-focus" aria-label={copy.rijing.hero.focusAria}>
        <span className="shijing-rijing__hero-focus-label">{copy.rijing.hero.focusLabel}</span>
        <span className="shijing-rijing__hero-focus-tags">
          {props.focusTags.length === 0 ? (
            <span className="shijing-rijing__hero-focus-empty">{copy.rijing.hero.focusEmpty}</span>
          ) : (
            props.focusTags.map((tag) => (
              <span key={tag.id} className="shijing-rijing__hero-focus-tag">
                {tag.label}
              </span>
            ))
          )}
        </span>
        <button
          type="button"
          className="shijing-rijing__hero-focus-manage"
          onClick={props.onManageFocus}
        >
          {copy.rijing.hero.manageFocus}
        </button>
      </div>
      <p className="shijing-rijing__hero-body">{content.description}</p>
      {!content.hasReading && props.emptyAction ? (
        <button
          type="button"
          className="shijing-rijing__hero-empty-action"
          onClick={props.emptyAction.onClick}
        >
          {props.emptyAction.label}
          <span aria-hidden>→</span>
        </button>
      ) : null}
      <div className="shijing-rijing__hero-leanings" aria-label={copy.rijing.hero.leaningsAria}>
        {content.leanings.map((leaning, idx) => (
          <span key={`${idx}-${leaning}`} className="shijing-rijing__hero-leaning">
            {leaning}
          </span>
        ))}
      </div>
      <div className="shijing-rijing__hero-confidence">
        <span className="shijing-rijing__hero-confidence-label">{copy.rijing.hero.confidenceLabel}</span>
        <span className="shijing-rijing__hero-confidence-value">{content.confidence_label}</span>
        <span className="shijing-rijing__hero-confidence-note">{content.confidence_note}</span>
      </div>
      <div className="shijing-rijing__hero-reminder">
        <HeartIcon />
        <p>{content.reminder}</p>
      </div>
      <RiJingHeroMemories />
    </article>
  );
}
