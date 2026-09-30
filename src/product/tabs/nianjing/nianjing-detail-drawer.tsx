import { useProductCopy, type ProductCopy } from '../../i18n/copy.ts';
import { useEffect } from 'react';
import type { NianJingInflectionPoint, NianJingPhaseBand } from '../../../domain/mirror-output.ts';
import type { ConcernTag } from '../../../domain/concern-tag.ts';

import { trimmedConcernLabel } from '../../concern-tags/concern-presets.ts';
import { buildNianJingPhaseDetailCopy } from '../../astrology/nianjing-driver-copy.ts';
import { NianJingEventRecorder } from './nianjing-event-recorder.tsx';
import { bandDurationLabel, bandYearRangeLabel, formatDateDots, type SelectedDetail } from './nianjing-view-model.ts';

export function DetailDrawer(props: {
  readonly detail: SelectedDetail;
  readonly onClose: () => void;
  readonly onOpenArchive: () => void;
}) {
  const copy = useProductCopy();
  const TENDENCY_CLASS_LABELS = copy.tendencyClassLabels;
  const INFLECTION_KIND_LABELS = useProductCopy().nianjingInflectionKindLabels;
  const NIANJING_COPY = useProductCopy().nianjingSurface;
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') props.onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [props]);

  const isBand = props.detail.kind === 'band';
  const ariaLabel = isBand
    ? `${TENDENCY_CLASS_LABELS[props.detail.band.nature]}${NIANJING_COPY.detailDrawer.phaseSuffix} ${NIANJING_COPY.detailDrawer.detailSuffix}`
    : `${INFLECTION_KIND_LABELS[props.detail.inflection.kind]} ${NIANJING_COPY.detailDrawer.detailSuffix}`;

  return (
    <>
      <div
        className="shijing-nianjing__inflection-backdrop"
        onClick={props.onClose}
        role="presentation"
        aria-hidden
      />
      <aside
        className="shijing-nianjing__inflection-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        data-kind={props.detail.kind}
        data-nature={
          props.detail.kind === 'band' ? props.detail.band.nature : undefined
        }
      >
        <button
          type="button"
          className="shijing-nianjing__inflection-close"
          onClick={props.onClose}
          aria-label={NIANJING_COPY.detailDrawer.close}
        >
          ✕
        </button>

        {isBand
          ? renderBandContent(
              props.detail.band,
              props.detail.tag,
              props.onClose,
              props.onOpenArchive,
              copy,
            )
          : renderInflectionContent(
              props.detail.inflection,
              props.detail.tag,
              props.onClose,
              props.onOpenArchive,
              copy,
            )}
      </aside>
    </>
  );
}

function renderBandContent(
  band: NianJingPhaseBand,
  tag: ConcernTag,
  onClose: () => void,
  onOpenArchive: () => void,
  copy: ProductCopy,
) {
  const NIANJING_COPY = copy.nianjingSurface;
  const natureLabel = copy.tendencyClassLabels[band.nature];
  const concernLabel = trimmedConcernLabel(tag);
  const durationLabel = bandDurationLabel(band, NIANJING_COPY);
  const detailCopy = buildNianJingPhaseDetailCopy({
    concern_label: concernLabel,
    nature: band.nature,
    summary: band.summary,
    driver_refs: band.driver_refs,
    start_date: band.start_date,
    end_date: band.end_date,
  });

  return (
    <>
      <header className="shijing-nianjing__band-detail-head">
        <strong className="shijing-nianjing__band-detail-title">
          {bandYearRangeLabel(band, NIANJING_COPY)}
        </strong>
        <div className="shijing-nianjing__band-detail-pills">
          <span className="shijing-nianjing__band-detail-pill">{concernLabel}</span>
          <span
            className="shijing-nianjing__band-detail-pill"
            data-nature={band.nature}
          >
            {natureLabel}{NIANJING_COPY.detailDrawer.phaseSuffix}
          </span>
        </div>
        <p className="shijing-nianjing__band-detail-oneline">
          <span
            className="shijing-nianjing__band-detail-oneline-icon"
            aria-hidden
          >
            ✦
          </span>
          {detailCopy.one_line}
        </p>
      </header>

      <section className="shijing-nianjing__band-detail-story">
        <span className="shijing-nianjing__band-detail-kicker">{NIANJING_COPY.detailDrawer.mainline}</span>
        <p>{detailCopy.mainline}</p>
      </section>

      <section className="shijing-nianjing__band-detail-signals" aria-label={NIANJING_COPY.detailDrawer.signalsAriaLabel}>
        <span className="shijing-nianjing__band-detail-signal-lead">
          {NIANJING_COPY.detailDrawer.worthRemembering(durationLabel)}
        </span>
        <ul className="shijing-nianjing__band-detail-keyword-pills">
          {detailCopy.keywords.map((kw) => (
            <li key={kw}>{kw}</li>
          ))}
        </ul>
      </section>

      <section className="shijing-nianjing__band-detail-guidance">
        <h3>{NIANJING_COPY.detailDrawer.guidanceTitle}</h3>
        <ol className="shijing-nianjing__band-detail-guidance-list">
          {detailCopy.suggestions.map((item, i) => (
            <li key={item.title}>
              <span
                className="shijing-nianjing__band-detail-guidance-index"
                aria-hidden
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="shijing-nianjing__band-detail-guardrails">
          <span className="shijing-nianjing__band-detail-guardrails-label">
            {NIANJING_COPY.detailDrawer.guardrailsTitle}
          </span>
          {detailCopy.cautions.map((item) => (
            <p key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </p>
          ))}
        </div>
      </section>

      <footer className="shijing-nianjing__band-detail-footnotes">
        <span>
          {NIANJING_COPY.detailDrawer.timePrefix} {formatDateDots(band.start_date)} → {formatDateDots(band.end_date)}
        </span>
        <span>
          {NIANJING_COPY.detailDrawer.basis(concernLabel)}
        </span>
      </footer>

      <NianJingEventRecorder
        concernTag={tag}
        rangeStart={band.start_date}
        rangeEnd={band.end_date}
        onNavigatedAway={onClose}
        onOpenArchive={onOpenArchive}
      />
    </>
  );
}

function renderInflectionContent(
  inflection: NianJingInflectionPoint,
  tag: ConcernTag,
  onClose: () => void,
  onOpenArchive: () => void,
  copy: ProductCopy,
) {
  const NIANJING_COPY = copy.nianjingSurface;
  const kindLabel = copy.nianjingInflectionKindLabels[inflection.kind];
  const description = copy.nianjingSurface.inflectionDescriptions[inflection.kind];
  return (
    <>
      <header className="shijing-nianjing__inflection-head">
        <strong>{inflection.date}</strong>
        <small>
          <span
            className="shijing-nianjing__legend-marker"
            data-kind={inflection.kind}
            aria-hidden
          />
          {kindLabel} · {trimmedConcernLabel(tag)}
        </small>
      </header>

      <section className="shijing-nianjing__inflection-section">
        <h3>{NIANJING_COPY.detailDrawer.inflectionQuestion(kindLabel)}</h3>
        <p>{description}</p>
      </section>

      {inflection.summary ? (
        <section className="shijing-nianjing__inflection-section">
          <h3>{NIANJING_COPY.detailDrawer.promptTitle}</h3>
          <p>{inflection.summary}</p>
        </section>
      ) : null}

      {inflection.date_window ? (
        <section className="shijing-nianjing__inflection-section">
          <h3>{NIANJING_COPY.detailDrawer.impactWindow}</h3>
          <p>
            {inflection.date_window.start_date}
            {' → '}
            {inflection.date_window.end_date}
          </p>
        </section>
      ) : null}

      <NianJingEventRecorder
        concernTag={tag}
        rangeStart={inflection.date}
        rangeEnd={inflection.date}
        fixedDate={inflection.date}
        heading={NIANJING_COPY.detailDrawer.eventRecorderHeading}
        onNavigatedAway={onClose}
        onOpenArchive={onOpenArchive}
      />
    </>
  );
}
