import type { ReactNode } from 'react';

import { HEJING_PAGE_COPY } from './hejing-model.ts';

const copy = HEJING_PAGE_COPY;

interface HeJingEmptyStateCopyOverride {
  readonly title?: string;
  readonly lead?: string;
  readonly primaryCta?: string;
  readonly cardTitle?: string;
  readonly cardBody?: string;
  readonly startCta?: string;
  readonly existingCta?: string;
}

const HEJING_VALUE_ICONS: Record<string, ReactNode> = {
  baseline: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9.5" cy="12" r="5.5" />
      <circle cx="14.5" cy="12" r="5.5" />
    </svg>
  ),
  complement: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 4v16" />
      <path d="M6 7h12" />
      <path d="M9 20h6" />
      <path d="M6 7 3 13a3 3 0 0 0 6 0Z" />
      <path d="M18 7l-3 6a3 3 0 0 0 6 0Z" />
    </svg>
  ),
  window: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.6 2.6" />
    </svg>
  ),
};

function HeJingMirrorVisual() {
  const c = copy.empty;
  return (
    <svg
      className="shijing-hejing__empty-venn"
      viewBox="0 0 360 320"
      role="img"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="hejingVennGreen" cx="34%" cy="30%" r="78%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.96" />
          <stop offset="55%" stopColor="#c2e1cf" stopOpacity="0.62" />
          <stop offset="100%" stopColor="#4f9070" stopOpacity="0.5" />
        </radialGradient>
        <radialGradient id="hejingVennGold" cx="66%" cy="30%" r="78%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.92" />
          <stop offset="55%" stopColor="#eedfba" stopOpacity="0.58" />
          <stop offset="100%" stopColor="#c7a35c" stopOpacity="0.5" />
        </radialGradient>
      </defs>
      <line x1="180" y1="22" x2="180" y2="298" stroke="rgba(61,122,90,0.16)" strokeWidth="1" strokeDasharray="3 8" />
      <ellipse cx="180" cy="290" rx="118" ry="13" fill="rgba(61,122,90,0.08)" />
      <circle cx="136" cy="156" r="110" fill="url(#hejingVennGreen)" stroke="rgba(79,144,112,0.5)" strokeWidth="1.5" />
      <circle cx="224" cy="156" r="110" fill="url(#hejingVennGold)" stroke="rgba(176,138,62,0.46)" strokeWidth="1.5" />
      <text x="88" y="170" textAnchor="middle" className="shijing-hejing__empty-venn-side" fill="#285c44">{c.visualSelf}</text>
      <text x="272" y="170" textAnchor="middle" className="shijing-hejing__empty-venn-side" fill="#8a6c24">{c.visualOther}</text>
      <text x="180" y="174" textAnchor="middle" className="shijing-hejing__empty-venn-core" fill="#1c2b24">{c.visualMirror}</text>
    </svg>
  );
}

export function HeJingEmptyState({
  onCreate,
  onSelectExisting,
  copyOverride,
}: {
  readonly onCreate: () => void;
  readonly onSelectExisting: () => void;
  readonly copyOverride?: HeJingEmptyStateCopyOverride;
}) {
  const c = { ...copy.empty, ...copyOverride };
  return (
    <div className="shijing-hejing__empty">
      <header className="shijing-hejing__empty-intro">
        <div className="shijing-hejing__empty-intro-copy">
          <span className="shijing-hejing__eyebrow">{copy.eyebrow}</span>
          <h1 className="shijing-hejing__empty-title">{c.title}</h1>
          <p className="shijing-hejing__empty-lead">{c.lead}</p>
        </div>
        <button type="button" className="shijing-hejing__new-button" onClick={onCreate}>
          {c.primaryCta}
        </button>
      </header>

      <ul className="shijing-hejing__value-cards" aria-label={c.valueAria}>
        {c.valueCards.map((card) => (
          <li key={card.id} className="shijing-hejing__value-card">
            <span className="shijing-hejing__value-icon" aria-hidden>
              {HEJING_VALUE_ICONS[card.id]}
            </span>
            <div className="shijing-hejing__value-copy">
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </div>
            <span className="shijing-hejing__value-index" aria-hidden>
              {card.index}
            </span>
          </li>
        ))}
      </ul>

      <div className="shijing-hejing__empty-card">
        <div className="shijing-hejing__empty-visual">
          <HeJingMirrorVisual />
        </div>
        <div className="shijing-hejing__empty-panel">
          <h2>{c.cardTitle}</h2>
          <p>{c.cardBody}</p>
          <ol className="shijing-hejing__empty-steps">
            {c.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="shijing-hejing__empty-actions">
            <button type="button" className="is-primary" onClick={onCreate}>
              {c.startCta}
            </button>
            <button type="button" className="is-secondary" onClick={onSelectExisting}>
              {c.existingCta}
            </button>
          </div>
          <p className="shijing-hejing__empty-privacy">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            {c.privacy}
          </p>
        </div>
      </div>
    </div>
  );
}

export function HeJingRelationshipTypeEmpty({
  typeLabel,
  onCreate,
  onSelectExisting = onCreate,
}: {
  readonly typeLabel: string;
  readonly onCreate: () => void;
  readonly onSelectExisting?: () => void;
}) {
  return (
    <HeJingEmptyState
      onCreate={onCreate}
      onSelectExisting={onSelectExisting}
      copyOverride={{
        title: copy.emptyTypeTitle(typeLabel),
        lead: copy.emptyTypeBody(typeLabel),
        primaryCta: copy.emptyTypeAction(typeLabel),
        cardTitle: copy.emptyTypeTitle(typeLabel),
        cardBody: copy.emptyTypeHint,
        startCta: copy.emptyTypeAction(typeLabel),
        existingCta: copy.addPersonDialogTitle,
      }}
    />
  );
}
