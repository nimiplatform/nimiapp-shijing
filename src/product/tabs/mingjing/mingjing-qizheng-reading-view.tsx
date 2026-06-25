import { useProductCopy } from '../../i18n/copy.ts';
import type { MingJingQizhengNatalMirrorOutput } from '../../../domain/mirror-output.ts';
import type { ReadingGenerationFailure } from '../../../domain/reading.ts';
import { FailureBanner } from '../shared/failure-banner.tsx';
import { GeneratingButton } from '../shared/generating-button.tsx';
import { SparkleIcon } from './qizheng-icons.tsx';

const PROFILE_ORDER = [
  'life_pattern',
  'strengths',
  'long_term_theme',
  'relationship_pattern',
  'career_inclination',
] as const;

export function MingJingQizhengReadingView({
  output,
  stale,
  loading,
  failure,
  onGenerate,
  heroTitle,
}: {
  readonly output: MingJingQizhengNatalMirrorOutput | null;
  readonly stale: boolean;
  readonly loading: boolean;
  readonly failure: ReadingGenerationFailure | null;
  readonly onGenerate: () => void;
  readonly heroTitle: string;
}) {
  const copy = useProductCopy();
  const r = copy.mingjing.reading;
  const q = copy.mingjing.qizhengReading;
  const x = copy.mingjing.qizhengExplore;

  return (
    <div className="shijing-qz-reading" aria-label={q.aria}>
      <section className="shijing-qz-cta">
        <div className="shijing-qz-cta__copy">
          <p className="shijing-qz-cta__eyebrow">{x.ctaEyebrow}</p>
          <h3 className="shijing-qz-cta__title">{x.ctaTitle}</h3>
          <p className="shijing-qz-cta__body">{x.ctaBody}</p>
        </div>
        <GeneratingButton
          className="shijing-qz-cta__button"
          onClick={onGenerate}
          disabled={loading}
          busy={loading}
          busyLabel={r.generating}
        >
          {output ? r.regenerate : x.ctaButton}
        </GeneratingButton>
      </section>

      {failure ? <FailureBanner failure={failure} /> : null}

      {output ? (
        <section className="shijing-mingjing-panel shijing-qz-result">
          <div className="shijing-qz-result__head">
            <SparkleIcon className="shijing-qz-result__icon" />
            <h3 className="shijing-qz-result__title">
              {heroTitle} · {x.readingTitleSuffix}
            </h3>
          </div>
          {stale ? <p className="shijing-qz-result__stale" role="status">{r.stale}</p> : null}
          {output.summary ? <p className="shijing-qz-result__summary">{output.summary}</p> : null}

          <dl className="shijing-qz-result__profile">
            {PROFILE_ORDER.map((key) =>
              output.profile[key] ? (
                <div key={key} className="shijing-qz-result__profile-item">
                  <dt>{q.profileLabels[key]}</dt>
                  <dd>{output.profile[key]}</dd>
                </div>
              ) : null,
            )}
          </dl>

          {output.star_guidance.some((item) => item.theme || item.strategy) ? (
            <>
              <h4 className="shijing-qz-result__subtitle">{q.starGuidanceTitle}</h4>
              <ol className="shijing-qz-result__guidance">
                {output.star_guidance.map((item) => (
                  <li key={item.body_key} className="shijing-qz-result__guide">
                    <div className="shijing-qz-result__guide-head">
                      <span className="shijing-qz-result__guide-star">{item.body_label}</span>
                      <span className="shijing-qz-result__guide-where">
                        {item.house_name} · {item.mansion}
                      </span>
                      {item.theme ? <span className="shijing-qz-result__guide-theme">{item.theme}</span> : null}
                    </div>
                    {item.strategy ? <p className="shijing-qz-result__guide-text">{item.strategy}</p> : null}
                  </li>
                ))}
              </ol>
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
