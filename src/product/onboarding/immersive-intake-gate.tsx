// Immersive intake gate (rule.shijing.ia.r005): before the first
// self + concern intake completes, the 日镜 / 月镜 / 合镜 content areas render
// this full-bleed hero instead of mirror content. Navigation stays free; the
// single CTA is the recovery route into 命镜, which hosts the intake.
// Per-mirror artwork and grade are retinted through [data-mirror-kind].

import { useProductCopy } from '../i18n/copy.ts';

export interface ImmersiveIntakeGateProps {
  readonly mirror: 'rijing' | 'yuejing' | 'hejing';
  readonly onGoToMingJing: () => void;
  readonly pendingSteps: string;
}

// @nimi-authority: rule.shijing.ia.r005
export function ImmersiveIntakeGate(props: ImmersiveIntakeGateProps) {
  const copy = useProductCopy();
  const hero = copy[props.mirror].intakeHero;

  return (
    <section
      className="shijing-intake-hero"
      data-mirror-kind={props.mirror}
      aria-label={hero.ariaLabel}
    >
      <div className="shijing-intake-hero__content">
        <p className="shijing-intake-hero__eyebrow">{hero.eyebrow}</p>
        <h1 className="shijing-intake-hero__title">
          {hero.titleLead}
          <br />
          {hero.titleEmphasis}
        </h1>
        <span className="shijing-intake-hero__divider" aria-hidden />
        <p className="shijing-intake-hero__body">{hero.body}</p>
        <button
          type="button"
          className="shijing-intake-hero__action"
          onClick={props.onGoToMingJing}
        >
          {hero.action}
          <span className="shijing-intake-hero__action-arrow" aria-hidden>→</span>
        </button>
        <p className="shijing-intake-hero__subnote" role="status">{props.pendingSteps}</p>
      </div>
      <p className="shijing-intake-hero__footer">
        {hero.footer}
        <span className="shijing-intake-hero__footer-rule" aria-hidden />
      </p>
    </section>
  );
}
