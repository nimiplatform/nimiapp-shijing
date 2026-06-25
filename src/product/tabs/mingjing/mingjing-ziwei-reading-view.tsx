import { useMemo, useState } from 'react';
import { useProductCopy } from '../../i18n/copy.ts';
import type { ZiweiPalace } from '../../../domain/algorithm.ts';
import type { MingJingZiweiDecadeGuidance, MingJingZiweiNatalMirrorOutput } from '../../../domain/mirror-output.ts';
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

const ZIWEI_READING_COPY = {
  briefEyebrow: 'NATAL BRIEF',
  briefTitle: '命格综述',
  emptyDecade: '生成解读后，这里会显示该大限的主题与行动建议。',
  quoteTitle: '命盘一句话',
  decadeHint: '点击任意阶段，命盘将同步高亮对应宫位',
  selectedDecadeAria: '当前大限解读',
  palaceFallback: '空宫',
} as const;

function ageRange(palace: ZiweiPalace): string {
  return `${palace.decadal_start_age}-${palace.decadal_end_age}`;
}

function guidanceKey(age: string, palaceName: string): string {
  return `${age}\u0000${palaceName}`;
}

function guidanceKeyForPalace(palace: ZiweiPalace): string {
  return guidanceKey(ageRange(palace), palace.name);
}

function majorStarText(palace: ZiweiPalace): string {
  return palace.major_stars.map((star) => star.name).join(' ') || ZIWEI_READING_COPY.palaceFallback;
}

function findGuidance(
  output: MingJingZiweiNatalMirrorOutput | null,
  palace: ZiweiPalace,
): MingJingZiweiDecadeGuidance | null {
  if (!output) return null;
  return output.decade_guidance.find((item) =>
    item.age_range === ageRange(palace) && item.palace_name === palace.name
  ) ?? null;
}

export function MingJingZiweiReadingView({
  output,
  stale,
  loading,
  failure,
  onGenerate,
  decadePalaces,
}: {
  readonly output: MingJingZiweiNatalMirrorOutput | null;
  readonly stale: boolean;
  readonly loading: boolean;
  readonly failure: ReadingGenerationFailure | null;
  readonly onGenerate: () => void;
  readonly decadePalaces: readonly ZiweiPalace[];
}) {
  const copy = useProductCopy();
  const r = copy.mingjing.reading;
  const z = copy.mingjing.ziweiReading;
  const defaultPalace = decadePalaces[0] ?? null;
  const [selectedDecadeKey, setSelectedDecadeKey] = useState(() =>
    defaultPalace ? guidanceKeyForPalace(defaultPalace) : '',
  );
  const selectedPalace = useMemo(
    () => decadePalaces.find((palace) => guidanceKeyForPalace(palace) === selectedDecadeKey) ?? defaultPalace,
    [decadePalaces, defaultPalace, selectedDecadeKey],
  );
  const selectedGuidance = selectedPalace ? findGuidance(output, selectedPalace) : null;

  return (
    <>
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
            <p className="shijing-mj-reading__summary">{output.summary}</p>

            <dl className="shijing-mj-reading__core shijing-ziwei-brief__grid">
              {PROFILE_ORDER.map((key) => (
                <div key={key} className="shijing-mj-reading__core-item">
                  <dt>{z.profileLabels[key]}</dt>
                  <dd>{output.profile[key]}</dd>
                </div>
              ))}
              <div className="shijing-mj-reading__core-item shijing-ziwei-brief__quote">
                <dt>{ZIWEI_READING_COPY.quoteTitle}</dt>
                <dd>{output.summary}</dd>
              </div>
            </dl>
          </>
        ) : null}
      </section>

      <section className="shijing-mingjing-panel shijing-ziwei-decade" aria-label={z.decadeGuidanceTitle}>
        <header className="shijing-mingjing-panel__head shijing-ziwei-decade__head">
          <div>
            <p className="shijing-mingjing__eyebrow">{z.eyebrow}</p>
            <h2 className="shijing-mingjing-panel__title">{z.decadeGuidanceTitle}</h2>
          </div>
          <p>{ZIWEI_READING_COPY.decadeHint}</p>
        </header>
        <div className="shijing-ziwei-decade__grid">
          {decadePalaces.map((palace) => {
            const key = guidanceKeyForPalace(palace);
            const guidance = findGuidance(output, palace);
            const selected = key === selectedDecadeKey;
            return (
              <button
                key={key}
                type="button"
                className="shijing-ziwei-decade__card"
                data-selected={selected ? '' : undefined}
                data-has-guidance={guidance ? '' : undefined}
                aria-pressed={selected}
                onClick={() => setSelectedDecadeKey(key)}
              >
                <span>{ageRange(palace)}</span>
                <strong>{palace.name}</strong>
                <small>{guidance?.theme ?? majorStarText(palace)}</small>
              </button>
            );
          })}
        </div>
        {selectedPalace ? (
          <article className="shijing-ziwei-decade__selected" aria-label={ZIWEI_READING_COPY.selectedDecadeAria}>
            <div>
              <span>{ageRange(selectedPalace)} · {selectedPalace.name}</span>
              <h3>{selectedGuidance?.theme ?? majorStarText(selectedPalace)}</h3>
            </div>
            <p>{selectedGuidance?.strategy ?? ZIWEI_READING_COPY.emptyDecade}</p>
          </article>
        ) : null}
      </section>
    </>
  );
}
