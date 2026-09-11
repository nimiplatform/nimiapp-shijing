// Post-intake first-run HeJing empty state: keeps the immersive intake-hero
// visual (same artwork, same bottom-centered composition the 合镜 gate uses)
// and opens the first other-person profile. Existing profiles appear in the
// workbench selector once at least one Person exists.

import { useProductCopy } from '../../i18n/copy.ts';

export interface HeJingImmersiveEmptyProps {
  readonly onCreate: () => void;
}

// @nimi-authority: rule.shijing.ia.r009
export function HeJingImmersiveEmpty(props: HeJingImmersiveEmptyProps) {
  const copy = useProductCopy();
  const hero = copy.hejing.emptyHero;

  return (
    <section
      className="shijing-intake-hero"
      data-mirror-kind="hejing"
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
        <div className="shijing-intake-hero__actions">
          <button
            type="button"
            className="shijing-intake-hero__action"
            onClick={props.onCreate}
          >
            {hero.primaryAction}
            <span className="shijing-intake-hero__action-arrow" aria-hidden>→</span>
          </button>
        </div>
        <p className="shijing-intake-hero__subnote">{hero.stepsHint}</p>
      </div>
      <p className="shijing-intake-hero__footer">
        {hero.footer}
        <span className="shijing-intake-hero__footer-rule" aria-hidden />
      </p>
    </section>
  );
}
