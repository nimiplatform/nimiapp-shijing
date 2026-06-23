// RiJing — 今日总览 overview card.
//
// The calm, centred conclusion surface. It shows the eyebrow, the
// stage-derived headline, a one-glance subtitle, an energy meter
// (旺衰 ←→ 阶段, BaZi only), the tendency pills + confidence line, and a
// 寄语 closing note. The full narrative (今日基调 + 今日事件解析) stays folded
// behind 展开完整解读 so the surface reads as a single takeaway, not a wall
// of text. An icon-only refresh control is pinned to the top-right corner.

import { useState } from 'react';
import { Tooltip } from '@nimiplatform/kit/ui';

import { ChevronDownIcon, HeartIcon, RefreshIcon } from './rijing-icons.tsx';
import type { RiJingHeroContent } from './rijing-derive.ts';
import { useProductCopy } from '../../i18n/copy.ts';

export interface RiJingHeroProps {
  readonly content: RiJingHeroContent;
  readonly refreshDisabled: boolean;
  readonly refreshAriaLabel: string;
  readonly onRefresh: () => void;
  readonly emptyAction?: {
    readonly label: string;
    readonly onClick: () => void;
  };
}

export function RiJingHero(props: RiJingHeroProps) {
  const copy = useProductCopy();
  const overview = copy.rijing.overview;
  const { content } = props;
  const [expanded, setExpanded] = useState(false);
  const meter = content.energyMeter;
  const canExpand =
    content.hasReading && (Boolean(content.theme) || Boolean(content.reference_event));

  return (
    <article
      className={`shijing-rijing__hero${content.hasReading ? '' : ' shijing-rijing__hero--empty'}`}
      aria-labelledby="shijing-rijing__hero-headline"
    >
      <Tooltip content={props.refreshAriaLabel} placement="left">
        <button
          type="button"
          className="shijing-rijing__hero-refresh"
          onClick={props.onRefresh}
          disabled={props.refreshDisabled}
          aria-label={props.refreshAriaLabel}
        >
          <RefreshIcon />
        </button>
      </Tooltip>

      <div className="shijing-rijing__hero-eyebrow" aria-hidden>
        <span className="shijing-rijing__hero-eyebrow-dash" />
        <span>{content.eyebrow}</span>
        <span className="shijing-rijing__hero-eyebrow-dash" />
      </div>

      <h3 id="shijing-rijing__hero-headline" className="shijing-rijing__hero-headline">
        {content.headline}
      </h3>

      <p className="shijing-rijing__hero-subtitle">{content.subtitle}</p>

      {meter ? (
        <div className="shijing-rijing__meter" aria-label={overview.meterAria}>
          <div className="shijing-rijing__meter-track">
            <span
              className="shijing-rijing__meter-dot"
              style={{ left: `${meter.percent}%` }}
              aria-hidden
            />
          </div>
          <div className="shijing-rijing__meter-axis" aria-hidden>
            <span>{overview.meterAxisStart}</span>
            <span>{overview.meterAxisEnd}</span>
          </div>
          <div className="shijing-rijing__meter-caption">
            {overview.meterStrengthLabel} <b>{meter.band}</b> {overview.meterStageConnector}{' '}
            <b>{meter.stage}</b> {overview.meterStageSuffix}
            {overview.stageGuidance[meter.stage]}
          </div>
        </div>
      ) : null}

      {content.hasReading ? (
        <div className="shijing-rijing__hero-status" aria-label={copy.rijing.hero.leaningsAria}>
          {content.leanings.map((leaning, idx) => (
            <span
              key={`${idx}-${leaning.label}`}
              className="shijing-rijing__hero-pill"
              data-tone={leaning.tone}
            >
              <span className="shijing-rijing__hero-pill-dot" aria-hidden />
              {leaning.label}
            </span>
          ))}
          {content.leanings.length > 0 ? (
            <span className="shijing-rijing__hero-status-sep" aria-hidden />
          ) : null}
          <span className="shijing-rijing__hero-confidence">
            {overview.confidencePrefix}{' '}
            <b className="shijing-rijing__hero-confidence-value">{content.confidence_label}</b>{' '}
            · {content.confidence_note}
          </span>
        </div>
      ) : (
        <>
          {props.emptyAction ? (
            <button
              type="button"
              className="shijing-rijing__hero-empty-action"
              onClick={props.emptyAction.onClick}
            >
              {props.emptyAction.label}
              <span aria-hidden>→</span>
            </button>
          ) : null}
          {content.confidence_note ? (
            <p className="shijing-rijing__hero-empty-note">{content.confidence_note}</p>
          ) : null}
        </>
      )}

      {canExpand ? (
        <div className="shijing-rijing__hero-readmore">
          <button
            type="button"
            className="shijing-rijing__hero-toggle"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? overview.collapseLabel : overview.expandLabel}
            <span
              className="shijing-rijing__hero-toggle-chevron"
              data-open={expanded}
              aria-hidden
            >
              <ChevronDownIcon />
            </span>
          </button>
          {expanded ? (
            <div className="shijing-rijing__hero-full">
              {content.theme ? (
                <section className="shijing-rijing__hero-block" aria-label={content.theme.title}>
                  <h4 className="shijing-rijing__hero-block-title">{content.theme.title}</h4>
                  <p className="shijing-rijing__hero-block-body">{content.theme.body}</p>
                </section>
              ) : null}
              {content.reference_event ? (
                <section
                  className="shijing-rijing__hero-block"
                  aria-label={content.reference_event.title}
                >
                  <h4 className="shijing-rijing__hero-block-title shijing-rijing__hero-block-title--muted">
                    {content.reference_event.title}
                  </h4>
                  <p className="shijing-rijing__hero-block-body">
                    {content.reference_event.event_body}
                  </p>
                  <p className="shijing-rijing__hero-block-body shijing-rijing__hero-block-body--soft">
                    {content.reference_event.guidance}
                  </p>
                </section>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="shijing-rijing__hero-divider" aria-hidden />

      <div className="shijing-rijing__hero-wish">
        <span className="shijing-rijing__hero-wish-icon" aria-hidden>
          <HeartIcon />
        </span>
        <div className="shijing-rijing__hero-wish-copy">
          <span className="shijing-rijing__hero-wish-label">{content.closing_label}</span>
          <p>{content.closing_wish}</p>
        </div>
      </div>
    </article>
  );
}
