import { useEffect } from 'react';
import type { NianJingInflectionPoint, NianJingPhaseBand } from '../../../domain/mirror-output.ts';
import type { ConcernTag } from '../../../domain/concern-tag.ts';
import { TENDENCY_CLASS_LABELS } from '../../i18n/copy.ts';
import { trimmedConcernLabel } from '../../concern-tags/concern-presets.ts';
import { NianJingEventRecorder } from './nianjing-event-recorder.tsx';
import {
  INFLECTION_KIND_DESCRIPTIONS,
  INFLECTION_KIND_LABELS,
  NATURE_GUIDANCE,
  bandDurationLabel,
  bandYearRangeLabel,
  formatDateDots,
  substituteConcernPlaceholder,
  type SelectedDetail,
} from './nianjing-view-model.ts';
import { NIANJING_COPY } from './nianjing-copy.ts';

export function DetailDrawer(props: {
  readonly detail: SelectedDetail;
  readonly onClose: () => void;
  readonly onOpenArchive: () => void;
}) {
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
            )
          : renderInflectionContent(
              props.detail.inflection,
              props.detail.tag,
              props.onClose,
              props.onOpenArchive,
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
) {
  const natureLabel = TENDENCY_CLASS_LABELS[band.nature];
  const concernLabel = trimmedConcernLabel(tag);
  const guidance = NATURE_GUIDANCE[band.nature];
  const subst = (s: string): string => substituteConcernPlaceholder(s, concernLabel);
  const durationLabel = bandDurationLabel(band);

  return (
    <>
      <header className="shijing-nianjing__band-detail-head">
        <strong className="shijing-nianjing__band-detail-title">
          {bandYearRangeLabel(band)}
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
          {subst(guidance.oneLine)}
        </p>
      </header>

      <section className="shijing-nianjing__band-detail-story">
        <span className="shijing-nianjing__band-detail-kicker">{NIANJING_COPY.detailDrawer.mainline}</span>
        <p>{subst(guidance.meaning)}</p>
      </section>

      <section className="shijing-nianjing__band-detail-signals" aria-label={NIANJING_COPY.detailDrawer.signalsAriaLabel}>
        <span className="shijing-nianjing__band-detail-signal-lead">
          {NIANJING_COPY.detailDrawer.worthRemembering(durationLabel)}
        </span>
        <ul className="shijing-nianjing__band-detail-keyword-pills">
          {guidance.keywords.map((kw) => (
            <li key={kw}>{kw}</li>
          ))}
        </ul>
      </section>

      <section className="shijing-nianjing__band-detail-guidance">
        <h3>{NIANJING_COPY.detailDrawer.guidanceTitle}</h3>
        <ol className="shijing-nianjing__band-detail-guidance-list">
          {guidance.suggestions.map((item, i) => (
            <li key={item.title}>
              <span
                className="shijing-nianjing__band-detail-guidance-index"
                aria-hidden
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <strong>{subst(item.title)}</strong>
                <p>{subst(item.description)}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="shijing-nianjing__band-detail-guardrails">
          <span className="shijing-nianjing__band-detail-guardrails-label">
            {NIANJING_COPY.detailDrawer.guardrailsTitle}
          </span>
          {guidance.cautions.map((item) => (
            <p key={item.title}>
              <strong>{subst(item.title)}</strong>
              <span>{subst(item.description)}</span>
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
) {
  const kindLabel = INFLECTION_KIND_LABELS[inflection.kind];
  const description = INFLECTION_KIND_DESCRIPTIONS[inflection.kind];
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
