import { useProductCopy } from '../../i18n/copy.ts';
import type { MingJingQizhengNatalMirrorOutput } from '../../../domain/mirror-output.ts';
import type { ReadingGenerationFailure } from '../../../domain/reading.ts';
import { FailureBanner } from '../shared/failure-banner.tsx';
import { GeneratingButton } from '../shared/generating-button.tsx';

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
}: {
  readonly output: MingJingQizhengNatalMirrorOutput | null;
  readonly stale: boolean;
  readonly loading: boolean;
  readonly failure: ReadingGenerationFailure | null;
  readonly onGenerate: () => void;
}) {
  const copy = useProductCopy();
  const r = copy.mingjing.reading;
  const q = copy.mingjing.qizhengReading;

  return (
    <section className="shijing-mingjing-panel shijing-mingjing-reading" aria-label={q.aria}>
      <header className="shijing-mingjing-panel__head shijing-mj-reading__head">
        <div>
          <p className="shijing-mingjing__eyebrow">{q.eyebrow}</p>
          <h2 className="shijing-mingjing-panel__title">{q.title}</h2>
        </div>
        <GeneratingButton
          className="shijing-mj-reading__generate"
          onClick={onGenerate}
          disabled={loading}
          busy={loading}
          busyLabel={r.generating}
        >
          {output ? r.regenerate : r.generate}
        </GeneratingButton>
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
                <dt>{q.profileLabels[key]}</dt>
                <dd>{output.profile[key]}</dd>
              </div>
            ))}
          </dl>

          <h3 className="shijing-mj-reading__subtitle">{q.starGuidanceTitle}</h3>
          <ol className="shijing-mj-reading__strategies">
            {output.star_guidance.map((item) => (
              <li key={item.body_key} className="shijing-mj-reading__strategy">
                <div className="shijing-mj-reading__phase">
                  <span className="shijing-mj-reading__pillar">{item.body_label}</span>
                  <span className="shijing-mj-reading__age">{item.house_name} · {item.mansion}</span>
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
