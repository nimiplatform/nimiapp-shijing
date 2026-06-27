import { useProductCopy } from '../../i18n/copy.ts';
import type { MingJingZiweiNatalMirrorOutput } from '../../../domain/mirror-output.ts';
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

const PROFILE_NUMERAL: Record<(typeof PROFILE_ORDER)[number], string> = {
  life_pattern: '壹',
  strengths: '贰',
  long_term_theme: '叁',
  relationship_pattern: '肆',
  career_inclination: '伍',
};

const ZIWEI_READING_COPY = {
  briefEyebrow: 'NATAL BRIEF',
  briefTitle: '命格综述',
} as const;

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
    <section className="shijing-mingjing-panel shijing-mingjing-reading shijing-ziwei-brief" aria-label={z.aria}>
      <header className="shijing-mingjing-panel__head shijing-mj-reading__head">
        <div>
          <p className="shijing-mingjing__eyebrow">{ZIWEI_READING_COPY.briefEyebrow}</p>
          <h2 className="shijing-mingjing-panel__title">{ZIWEI_READING_COPY.briefTitle}</h2>
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
          <p className="shijing-mj-reading__summary shijing-ziwei-brief__summary">{output.summary}</p>

          <dl className="shijing-mj-reading__core shijing-ziwei-brief__grid">
            {PROFILE_ORDER.map((key) => (
              <div key={key} className="shijing-mj-reading__core-item shijing-ziwei-brief__card">
                <span className="shijing-ziwei-brief__numeral" aria-hidden="true">
                  {PROFILE_NUMERAL[key]}
                </span>
                <dt>{z.profileLabels[key]}</dt>
                <dd>{output.profile[key]}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}
    </section>
  );
}
