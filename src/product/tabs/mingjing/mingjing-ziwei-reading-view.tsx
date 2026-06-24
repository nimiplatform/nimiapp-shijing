import { useProductCopy } from '../../i18n/copy.ts';
import type { MingJingZiweiNatalMirrorOutput } from '../../../domain/mirror-output.ts';
import type { ReadingGenerationFailure } from '../../../domain/reading.ts';
import { FailureBanner } from '../shared/failure-banner.tsx';

const PROFILE_ORDER = [
  'life_pattern',
  'strengths',
  'long_term_theme',
  'relationship_pattern',
  'career_inclination',
] as const;

export function MingJingZiweiReadingView({
  output,
  stale,
  loading,
  failure,
  onGenerate,
}: {
  readonly output: MingJingZiweiNatalMirrorOutput | null;
  readonly stale: boolean;
  readonly loading: boolean;
  readonly failure: ReadingGenerationFailure | null;
  readonly onGenerate: () => void;
}) {
  const copy = useProductCopy();
  const r = copy.mingjing.reading;
  const z = copy.mingjing.ziweiReading;

  return (
    <section className="shijing-mingjing-panel shijing-mingjing-reading" aria-label={z.aria}>
      <header className="shijing-mingjing-panel__head shijing-mj-reading__head">
        <div>
          <p className="shijing-mingjing__eyebrow">{z.eyebrow}</p>
          <h2 className="shijing-mingjing-panel__title">{z.title}</h2>
        </div>
        <button
          type="button"
          className="shijing-mj-reading__generate"
          onClick={onGenerate}
          disabled={loading}
        >
          {loading ? r.generating : output ? r.regenerate : r.generate}
        </button>
      </header>

      {failure ? <FailureBanner failure={failure} /> : null}

      {!output && !loading && !failure ? (
        <p className="shijing-mj-reading__empty">{r.empty}</p>
      ) : null}

      {output ? (
        <>
          {stale ? (
            <p className="shijing-mj-reading__stale" role="status">{r.stale}</p>
          ) : null}
          <p className="shijing-mj-reading__summary">{output.summary}</p>

          <dl className="shijing-mj-reading__core">
            {PROFILE_ORDER.map((key) => (
              <div key={key} className="shijing-mj-reading__core-item">
                <dt>{z.profileLabels[key]}</dt>
                <dd>{output.profile[key]}</dd>
              </div>
            ))}
          </dl>

          <h3 className="shijing-mj-reading__subtitle">{z.decadeGuidanceTitle}</h3>
          <ol className="shijing-mj-reading__strategies">
            {output.decade_guidance.map((item) => (
              <li key={`${item.age_range}:${item.palace_name}`} className="shijing-mj-reading__strategy">
                <div className="shijing-mj-reading__phase">
                  <span className="shijing-mj-reading__pillar">{item.palace_name}</span>
                  <span className="shijing-mj-reading__age">{item.age_range}</span>
                  <span className="shijing-mj-reading__theme">{item.theme}</span>
                </div>
                <p className="shijing-mj-reading__strategy-text">{item.strategy}</p>
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </section>
  );
}
