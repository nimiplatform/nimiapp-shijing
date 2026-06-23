// 命镜 · AI 解读 — 命局核心特点 (module 3) + 长期阶段策略 (module 7), rendered
// from the persisted mingjing Reading. The chart facts are deterministic; this
// panel shows only the AI wording layer + the generate/regenerate control.

import { useProductCopy } from '../../i18n/copy.ts';
import type { MingJingMirrorOutput } from '../../../domain/mirror-output.ts';
import type { ReadingGenerationFailure } from '../../../domain/reading.ts';
import { FailureBanner } from '../shared/failure-banner.tsx';
import { pillarHanzi } from './ganzhi-hanzi.ts';
import { MingJingInfo } from './mingjing-info.tsx';

const CORE_ORDER = [
  'personality',
  'strengths',
  'long_term_themes',
  'relationship_pattern',
  'career_inclination',
] as const;

export function MingJingReadingView({
  output,
  stale,
  loading,
  failure,
  onGenerate,
}: {
  readonly output: MingJingMirrorOutput | null;
  readonly stale: boolean;
  readonly loading: boolean;
  readonly failure: ReadingGenerationFailure | null;
  readonly onGenerate: () => void;
}) {
  const copy = useProductCopy();
  const r = copy.mingjing.reading;

  return (
    <section className="shijing-mingjing-panel shijing-mingjing-reading" aria-label={r.coreTitle}>
      <header className="shijing-mingjing-panel__head shijing-mj-reading__head">
        <div>
          <p className="shijing-mingjing__eyebrow">{r.eyebrow}</p>
          <div className="shijing-mingjing-panel__title-row">
            <h2 className="shijing-mingjing-panel__title">{r.coreTitle}</h2>
            <MingJingInfo label={`${r.coreTitle}说明`}>
              <p>{r.explanation}</p>
            </MingJingInfo>
          </div>
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
            {CORE_ORDER.map((key) => (
              <div key={key} className="shijing-mj-reading__core-item">
                <dt>{r.coreLabels[key]}</dt>
                <dd>{output.core[key]}</dd>
              </div>
            ))}
          </dl>

          <h3 className="shijing-mj-reading__subtitle">{r.strategiesTitle}</h3>
          <ol className="shijing-mj-reading__strategies">
            {output.life_stage_strategies.map((s, i) => (
              <li key={i} className="shijing-mj-reading__strategy">
                <div className="shijing-mj-reading__phase">
                  <span className="shijing-mj-reading__pillar">{pillarHanzi(s.dayun_pillar)}</span>
                  <span className="shijing-mj-reading__age">{s.age_range}岁</span>
                  <span className="shijing-mj-reading__theme">{s.theme}</span>
                </div>
                <p className="shijing-mj-reading__strategy-text">{s.strategy}</p>
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </section>
  );
}
