// 命镜 · 命局总览 hero — the always-on archetype card. Pure deterministic display
// over MingJingChart: archetype title + plain-language persona, 用神/喜忌 element
// chips (有利 / 不利), and the current 大运 stage. No AI.

import { useProductCopy } from '../../i18n/copy.ts';
import type { MingJingChart } from '../../../domain/mingjing.ts';
import { useMingJingNarrative } from './mingjing-narrative.ts';
import { STEM_ELEMENT, pillarHanzi } from './ganzhi-hanzi.ts';

export function MingJingHero({
  chart,
  onSeeStages,
}: {
  readonly chart: MingJingChart;
  readonly onSeeStages: () => void;
}) {
  const copy = useProductCopy();
  const m = copy.mingjing;
  const elementLabels = m.fiveElements.labels;
  const tendencyLabels = copy.tendencyClassLabels;
  const narrative = useMingJingNarrative();
  const a = narrative.archetype(chart);
  const current = chart.dayun.periods.find((p) => p.is_current) ?? null;

  return (
    <header className="shijing-mj-hero" data-strength={a.strengthClass}>
      <div className="shijing-mj-hero__glow" aria-hidden="true" />
      <div className="shijing-mj-hero__main">
        <p className="shijing-mj-hero__eyebrow">{m.hero.eyebrow}</p>
        <h1 className="shijing-mj-hero__title">{a.title}</h1>
        <p className="shijing-mj-hero__summary">
          <span>{a.dayMaster}</span>
          <span className="shijing-mj-hero__dot">·</span>
          <span>{a.patternTag}</span>
          <span className="shijing-mj-hero__dot">·</span>
          <span>{a.strengthTag}</span>
        </p>
        <p className="shijing-mj-hero__persona">{a.persona}</p>
      </div>

      <aside className="shijing-mj-hero__panel">
        <div className="shijing-mj-hero__favor">
          <p className="shijing-mj-hero__favor-title">{m.hero.favorableTitle}</p>
          <div className="shijing-mj-hero__chips">
            {a.favorable.length > 0
              ? a.favorable.map((el) => (
                  <span key={el} className="shijing-mj-hero__chip" data-element={el}>
                    {elementLabels[el]}
                  </span>
                ))
              : <span className="shijing-mj-hero__chip-empty">—</span>}
          </div>
          <p className="shijing-mj-hero__favor-hint">{a.favorableHint}</p>
        </div>

        <div className="shijing-mj-hero__favor shijing-mj-hero__favor--adverse">
          <p className="shijing-mj-hero__favor-title">{m.hero.adverseTitle}</p>
          <div className="shijing-mj-hero__chips">
            {a.adverse.length > 0
              ? a.adverse.map((el) => (
                  <span key={el} className="shijing-mj-hero__chip shijing-mj-hero__chip--muted" data-element={el}>
                    {elementLabels[el]}
                  </span>
                ))
              : <span className="shijing-mj-hero__chip-empty">—</span>}
          </div>
        </div>

        <div className="shijing-mj-hero__stage">
          <p className="shijing-mj-hero__stage-label">{m.hero.currentStage}</p>
          {current ? (
            <p className="shijing-mj-hero__stage-value">
              <span className="shijing-mj-hero__stage-pillar" data-element={STEM_ELEMENT[current.pillar.stem]}>
                {pillarHanzi(current.pillar)}
              </span>
              <span className="shijing-mj-hero__stage-text">
                {m.hero.dayunWord} · {m.dayun.ageRange(current.start_age, current.end_age)}岁
              </span>
              <span className="shijing-mj-hero__stage-badge" data-nature={current.nature}>
                {tendencyLabels[current.nature]}
              </span>
            </p>
          ) : (
            <p className="shijing-mj-hero__stage-value shijing-mj-hero__stage-value--empty">{m.hero.notStarted}</p>
          )}
          <button type="button" className="shijing-mj-hero__cta" onClick={onSeeStages}>
            {m.hero.seeStages}
          </button>
        </div>
      </aside>
    </header>
  );
}
