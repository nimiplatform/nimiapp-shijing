// HeJing 待生成视图 — shown when a relationship person exists but no
// relationship_hepan reading has been generated yet. Ready-to-generate hero
// plus a pattern-based preview of the sections that will unfold after
// generation. When the selected method has no admitted pattern rules, the
// typed gate replaces the generate CTA — the page never auto-switches method.

import { HEJING_PAGE_COPY, type HeJingWorkspace } from './hejing-model.ts';
import { ICONS, PersonCircle } from './hejing-sections.tsx';

const copy = HEJING_PAGE_COPY;

function pendingPreviewIcon(iconId: string) {
  return ICONS[iconId as keyof typeof ICONS] ?? ICONS.patterns;
}

export function HeJingPendingView({
  workspace,
  canGenerate,
  patternSupported,
  loading,
  onGenerate,
}: {
  readonly workspace: HeJingWorkspace;
  readonly canGenerate: boolean;
  readonly patternSupported: boolean;
  readonly loading: boolean;
  readonly onGenerate: () => void;
}) {
  return (
    <>
      <section className="shijing-hejing__pending" aria-labelledby="hejing-pending-title">
        <div className="shijing-hejing__pending-head">
          <span className="shijing-hejing__eyebrow">{copy.eyebrow}</span>
          <h1 id="hejing-pending-title" className="shijing-hejing__pending-title">
            {workspace.headline}
          </h1>
          <p className="shijing-hejing__pending-sub">{workspace.relationshipTypeLabel}</p>
        </div>

        <div className="shijing-hejing__pending-stage">
          <PersonCircle profile={workspace.self} />
          <div className="shijing-hejing__pending-link" aria-hidden>
            <span />
            <strong>{copy.mirrorBadge}</strong>
            <span />
          </div>
          <PersonCircle profile={workspace.other} />
        </div>

        <span className="shijing-hejing__pending-chip">
          <i aria-hidden />
          {copy.pendingStatusChip} · {copy.pendingReadyNote}
        </span>

        {patternSupported ? (
          canGenerate ? (
            <div className="shijing-hejing__pending-actions">
              <button
                type="button"
                className="shijing-hejing__pending-cta"
                onClick={onGenerate}
                disabled={loading}
              >
                {loading ? copy.generatingAdvice : copy.generateHejing}
              </button>
              <p className="shijing-hejing__pending-note">
                <span aria-hidden>{ICONS.basis}</span>
                {copy.pendingCtaNote}
              </p>
            </div>
          ) : null
        ) : (
          <div className="shijing-hejing__pattern-unsupported" role="status">
            <strong>{copy.patternUnsupportedTitle}</strong>
            <p>{copy.patternUnsupportedBody}</p>
            <p className="shijing-hejing__pattern-unsupported-hint">{copy.patternUnsupportedHint}</p>
          </div>
        )}
      </section>

      <section className="shijing-hejing__pending-preview" aria-label={copy.pendingPreviewTitle}>
        <h2 className="shijing-hejing__pending-preview-title">{copy.pendingPreviewTitle}</h2>
        <ul className="shijing-hejing__pending-preview-grid">
          {copy.pendingPreviewCards.map((card) => (
            <li key={card.id} className="shijing-hejing__pending-card">
              <span className="shijing-hejing__pending-card-icon" aria-hidden>
                {pendingPreviewIcon(card.icon)}
              </span>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
              <span className="shijing-hejing__pending-skeleton" aria-hidden />
              <span className="shijing-hejing__pending-skeleton" aria-hidden />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
