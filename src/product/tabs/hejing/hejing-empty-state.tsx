import { HEJING_PAGE_COPY } from './hejing-model.ts';

const copy = HEJING_PAGE_COPY;

interface HeJingEmptyStateCopyOverride {
  readonly title?: string;
  readonly lead?: string;
  readonly startCta?: string;
  readonly existingCta?: string;
}

function HeJingMirrorVisual() {
  const c = copy.empty;
  return (
    <svg
      className="shijing-hejing__empty-venn"
      viewBox="0 0 420 250"
      role="img"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="hejingVennGreen" cx="38%" cy="30%" r="82%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#c4e2d2" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#5d9878" stopOpacity="0.48" />
        </radialGradient>
        <radialGradient id="hejingVennGold" cx="62%" cy="30%" r="82%">
          <stop offset="0%" stopColor="#fffdf6" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#efe0b8" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#c5a055" stopOpacity="0.46" />
        </radialGradient>
        <radialGradient id="hejingVennGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#e9f0e4" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#e9f0e4" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="210" cy="228" rx="118" ry="9" fill="rgba(28,43,36,0.05)" />
      <path
        d="M0,-7 C1.2,-1.4 1.4,-1.2 7,0 C1.4,1.2 1.2,1.4 0,7 C-1.2,1.4 -1.4,1.2 -7,0 C-1.4,-1.2 -1.2,-1.4 0,-7 Z"
        transform="translate(112 42)"
        fill="rgba(176,138,62,0.5)"
      />
      <path
        d="M0,-5 C0.9,-1 1,-0.9 5,0 C1,0.9 0.9,1 0,5 C-0.9,1 -1,0.9 -5,0 C-1,-0.9 -0.9,-1 0,-5 Z"
        transform="translate(316 58)"
        fill="rgba(79,144,112,0.45)"
      />
      <circle cx="176" cy="118" r="86" fill="url(#hejingVennGreen)" stroke="rgba(61,122,90,0.58)" strokeWidth="1.25" />
      <circle cx="244" cy="118" r="86" fill="url(#hejingVennGold)" stroke="rgba(176,138,62,0.54)" strokeWidth="1.25" />
      <circle className="shijing-hejing__empty-venn-glow" cx="210" cy="118" r="46" fill="url(#hejingVennGlow)" />
      <text x="138" y="118" textAnchor="middle" dominantBaseline="central" className="shijing-hejing__empty-venn-side" fill="#285c44">
        {c.visualSelf}
      </text>
      <text x="282" y="118" textAnchor="middle" dominantBaseline="central" className="shijing-hejing__empty-venn-side" fill="#8a6c24">
        {c.visualOther}
      </text>
      <text x="210" y="120" textAnchor="middle" dominantBaseline="central" className="shijing-hejing__empty-venn-core" fill="#1c2b24">
        {c.visualMirror}
      </text>
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
      <span className="shijing-hejing__eyebrow shijing-hejing__empty-eyebrow">{copy.eyebrow}</span>
      <h1 className="shijing-hejing__empty-title">{c.title}</h1>
      <p className="shijing-hejing__empty-lead">{c.lead}</p>

      <div className="shijing-hejing__empty-visual">
        <HeJingMirrorVisual />
      </div>

      <div className="shijing-hejing__empty-actions">
        <button type="button" className="is-primary" onClick={onCreate}>
          {c.startCta}
        </button>
        <button type="button" className="is-quiet" onClick={onSelectExisting}>
          {c.existingCta}
        </button>
      </div>

      <ol className="shijing-hejing__empty-steps">
        {c.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <ul className="shijing-hejing__empty-values" aria-label={c.valueAria}>
        {c.valueCards.map((card) => (
          <li key={card.id} className="shijing-hejing__empty-value">
            <span className="shijing-hejing__value-index" aria-hidden>
              {card.index}
            </span>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </li>
        ))}
      </ul>

      <p className="shijing-hejing__empty-privacy">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        {c.privacy}
      </p>
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
        startCta: copy.emptyTypeAction(typeLabel),
        existingCta: copy.addPersonDialogTitle,
      }}
    />
  );
}
