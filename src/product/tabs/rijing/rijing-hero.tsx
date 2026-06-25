// RiJing — 今日总览 overview card.
//
// The calm, centred conclusion surface. It shows the eyebrow, the
// stage-derived headline, a one-glance subtitle with tendency pills, an energy
// meter, a confidence line, referenced-event interpretation, and a closing
// note. The primary generate / refresh control lives in MirrorPageHeader.

import { useState } from 'react';
import { Tooltip } from '@nimiplatform/kit/ui';

import { AlmanacIcon, HeartIcon } from './rijing-icons.tsx';
import type { RiJingHeroContent } from './rijing-derive.ts';
import type { RiJingDailyAlmanac } from './rijing-daily-almanac.ts';
import { useProductCopy } from '../../i18n/copy.ts';

export interface RiJingHeroProps {
  readonly content: RiJingHeroContent;
  readonly dailyAlmanac: RiJingDailyAlmanac | null;
  readonly emptyAction?: {
    readonly label: string;
    readonly onClick: () => void;
  };
}

export function RiJingHero(props: RiJingHeroProps) {
  const copy = useProductCopy();
  const overview = copy.rijing.overview;
  const { content } = props;
  const [riteOpen, setRiteOpen] = useState(false);
  const meter = content.energyMeter;
  const almanac = props.dailyAlmanac;
  const riteFlipText = riteOpen
    ? copy.rijing.dayRite.flipToOverviewLabel
    : copy.rijing.dayRite.flipToRiteLabel;
  const riteFlipLabel = riteOpen
    ? copy.rijing.dayRite.flipToOverviewAria
    : copy.rijing.dayRite.flipToRiteAria;
  const hasFullInterpretation = content.hasReading && Boolean(content.reference_event);

  return (
    <article
      className={`shijing-rijing__hero${content.hasReading ? '' : ' shijing-rijing__hero--empty'}`}
      aria-labelledby="shijing-rijing__hero-headline"
      data-rite-open={riteOpen}
    >
      <Tooltip content={riteFlipLabel} placement="top">
        <button
          type="button"
          className="shijing-rijing__hero-flip"
          aria-label={riteFlipLabel}
          aria-pressed={riteOpen}
          onClick={() => setRiteOpen((v) => !v)}
        >
          <span className="shijing-rijing__hero-flip-text">{riteFlipText}</span>
          <span className="shijing-rijing__hero-flip-icon" aria-hidden>
            <AlmanacIcon />
          </span>
        </button>
      </Tooltip>

      <div className="shijing-rijing__hero-stage">
        <div
          className="shijing-rijing__hero-face shijing-rijing__hero-face--front"
          aria-hidden={riteOpen}
        >
      <div className="shijing-rijing__hero-eyebrow" aria-hidden>
        <span className="shijing-rijing__hero-eyebrow-dash" />
        <span>{content.eyebrow}</span>
        <span className="shijing-rijing__hero-eyebrow-dash" />
      </div>

      <h3 id="shijing-rijing__hero-headline" className="shijing-rijing__hero-headline">
        {content.headline}
      </h3>

      <div className="shijing-rijing__hero-subtitle-row">
        <p className="shijing-rijing__hero-subtitle">{content.subtitle}</p>
        {content.hasReading && content.leanings.length > 0 ? (
          <div className="shijing-rijing__hero-leanings" aria-label={copy.rijing.hero.leaningsAria}>
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
          </div>
        ) : null}
      </div>

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
        <p className="shijing-rijing__hero-confidence">
          {overview.confidencePrefix}{' '}
          <b className="shijing-rijing__hero-confidence-value">{content.confidence_label}</b>{' '}
            · {content.confidence_note}
        </p>
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

      {hasFullInterpretation ? (
        <div className="shijing-rijing__hero-full">
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
        </div>

        <section
          className="shijing-rijing__hero-face shijing-rijing__hero-face--back"
          aria-label={copy.rijing.dayRite.title}
          aria-hidden={!riteOpen}
        >
          <div className="shijing-rijing__hero-eyebrow" aria-hidden>
            <span className="shijing-rijing__hero-eyebrow-dash" />
            <span>{copy.rijing.dayRite.eyebrow}</span>
            <span className="shijing-rijing__hero-eyebrow-dash" />
          </div>
          {almanac ? (
            <>
              <h3 className="shijing-rijing__rite-title">{almanac.lunar_title}</h3>
              <p className="shijing-rijing__rite-summary">{almanac.ganzhi_line}</p>

              <div className="shijing-rijing__almanac-recommends">
                <div className="shijing-rijing__almanac-line" data-kind="recommend">
                  <span>{copy.rijing.dayRite.suitableTitle}</span>
                  <p>{almanac.recommends.join(' ')}</p>
                </div>
                <div className="shijing-rijing__almanac-line" data-kind="avoid">
                  <span>{copy.rijing.dayRite.unsuitableTitle}</span>
                  <p>{almanac.avoids.join(' ')}</p>
                </div>
              </div>

              <div className="shijing-rijing__almanac-grid">
                {[...almanac.direction_rows, ...almanac.foundation_rows].map((row) => (
                  <div key={`${row.label}-${row.value}`} className="shijing-rijing__almanac-cell">
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                  </div>
                ))}
              </div>

              <div className="shijing-rijing__almanac-detail">
                <div>
                  <span>{copy.rijing.dayRite.pengzuTitle}</span>
                  <p>{almanac.pengzu}</p>
                </div>
                <div>
                  <span>{copy.rijing.dayRite.fetusTitle}</span>
                  <p>{almanac.fetus}</p>
                </div>
                <div>
                  <span>{copy.rijing.dayRite.goodGodsTitle}</span>
                  <p>{almanac.good_gods}</p>
                </div>
                <div>
                  <span>{copy.rijing.dayRite.badGodsTitle}</span>
                  <p>{almanac.bad_gods}</p>
                </div>
              </div>

              <div className="shijing-rijing__almanac-hours-panel">
                <span className="shijing-rijing__almanac-hours-heading">
                  {copy.rijing.dayRite.hoursTitle}
                </span>
                <div className="shijing-rijing__almanac-hours" aria-label={copy.rijing.dayRite.hoursTitle}>
                  {almanac.hours.map((hour) => (
                    <span key={hour.branch} data-luck={hour.luck}>
                      <b>{hour.branch}</b>
                      {hour.luck}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <h3 className="shijing-rijing__rite-title">{copy.rijing.dayRite.unavailableTitle}</h3>
              <p className="shijing-rijing__rite-summary">{copy.rijing.dayRite.unavailableBody}</p>
            </>
          )}
        </section>
      </div>
    </article>
  );
}
