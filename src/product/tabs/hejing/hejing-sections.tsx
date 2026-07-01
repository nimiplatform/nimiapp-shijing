import type { ReactNode, Ref } from 'react';

import { HeJingRadar } from './hejing-radar.tsx';
import {
  HEJING_PAGE_COPY,
  type HeJingFocusCard,
  type HeJingInsight,
  type HeJingMetric,
  type HeJingPersonProfile,
  type HeJingQuarterWindow,
  type HeJingTimelineRecord,
  type HeJingWorkspace,
} from './hejing-model.ts';

const copy = HEJING_PAGE_COPY;

// --- Inline icon set -------------------------------------------------------
// Small, stroke-only glyphs so the page reads as a calm light app rather than
// a technical report.

function Icon({ children }: { readonly children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const ICONS = {
  understanding: (
    <Icon>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
    </Icon>
  ),
  communication: (
    <Icon>
      <path d="M5 5h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9l-4 3v-3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
    </Icon>
  ),
  consistency: (
    <Icon>
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9 4.5h6V7H9z" />
      <path d="M9 12h6M9 16h4" />
    </Icon>
  ),
  safety: (
    <Icon>
      <path d="M12 3.5 19 6v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6Z" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
  ),
  growth: (
    <Icon>
      <path d="m12 4 2.1 4.6L19 9.2l-3.6 3.3L16.3 18 12 15.4 7.7 18l.9-5.5L5 9.2l4.9-.6Z" />
    </Icon>
  ),
  repair: (
    <Icon>
      <path d="M12 20s-7-4.3-7-9.3A3.7 3.7 0 0 1 12 8a3.7 3.7 0 0 1 7 2.7c0 5-7 9.3-7 9.3Z" />
    </Icon>
  ),
  boundary: (
    <Icon>
      <path d="M12 3.5 19 6v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6Z" />
    </Icon>
  ),
  stuck: (
    <Icon>
      <path d="M12 4 2.5 20h19Z" />
      <path d="M12 10v4M12 17.2v.2" />
    </Icon>
  ),
  better: (
    <Icon>
      <path d="M12 20c0-4 1.5-7 6-9-4.5-.5-7.5 1-9 4.5C7.5 13 6 11 4 10.5 5 16 8 19 12 20Z" />
      <path d="M12 20v-6" />
    </Icon>
  ),
  weekly: (
    <Icon>
      <rect x="4" y="5.5" width="16" height="14" rx="2" />
      <path d="M4 9.5h16M8 3.5v4M16 3.5v4" />
    </Icon>
  ),
  windows: (
    <Icon>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.6 2.6" />
    </Icon>
  ),
  ways: (
    <Icon>
      <path d="M5 5h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9l-4 3v-3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
    </Icon>
  ),
  records: (
    <Icon>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M9 4v4h6V4M9 12h6M9 16h4" />
    </Icon>
  ),
  basis: (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </Icon>
  ),
  refresh: (
    <Icon>
      <path d="M4.5 9a7.5 7.5 0 0 1 12.7-3L20 8" />
      <path d="M20 4v4h-4" />
      <path d="M19.5 15a7.5 7.5 0 0 1-12.7 3L4 16" />
      <path d="M4 20v-4h4" />
    </Icon>
  ),
  pencil: (
    <Icon>
      <path d="M4 20h4L18.5 9.5a2 2 0 0 0-2.8-2.8L5 17.5Z" />
      <path d="M14.5 8.5 16.5 10.5" />
    </Icon>
  ),
  chat: (
    <Icon>
      <path d="M5 5h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9l-4 3v-3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
    </Icon>
  ),
  check: (
    <Icon>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12 2.3 2.3 4.7-4.6" />
    </Icon>
  ),
  chevron: (
    <Icon>
      <path d="m9 6 6 6-6 6" />
    </Icon>
  ),
} as const;

const SEASON_ICONS: Record<HeJingQuarterWindow['season'], ReactNode> = {
  spring: (
    <Icon>
      <path d="M12 20c0-4 1.5-7 6-9-4.5-.5-7.5 1-9 4.5C7.5 13 6 11 4 10.5 5 16 8 19 12 20Z" />
      <path d="M12 20v-6" />
    </Icon>
  ),
  summer: (
    <Icon>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </Icon>
  ),
  autumn: (
    <Icon>
      <path d="M6 20c6-1 11-6 12-15C9 6 4 11 6 20Z" />
      <path d="M6 20 12 12" />
    </Icon>
  ),
  winter: (
    <Icon>
      <path d="M12 3v18M4 7.5l16 9M20 7.5l-16 9M8.5 4.5 12 6l3.5-1.5M8.5 19.5 12 18l3.5 1.5M3.5 11l2-1.5M3.5 13l2 1.5M20.5 11l-2-1.5M20.5 13l-2 1.5" />
    </Icon>
  ),
};

const BASIS_ICONS: Record<string, ReactNode> = {
  wuxing: (
    <Icon>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4v16M5.1 8 18.9 16M18.9 8 5.1 16" />
    </Icon>
  ),
  shishen: (
    <Icon>
      <circle cx="12" cy="8" r="3" />
      <path d="M6 19a6 6 0 0 1 12 0" />
    </Icon>
  ),
  chonghe: (
    <Icon>
      <circle cx="9" cy="12" r="5" />
      <circle cx="15" cy="12" r="5" />
    </Icon>
  ),
  liunian: (
    <Icon>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.6 2.6" />
    </Icon>
  ),
  dayun: (
    <Icon>
      <path d="M4 15.5 9 10l3.5 3.5L20 6" />
      <path d="M15 6h5v5" />
    </Icon>
  ),
};

function basisIcon(id: string): ReactNode {
  return BASIS_ICONS[id] ?? BASIS_ICONS.wuxing;
}

function metricIcon(id: string): ReactNode {
  return ICONS[id as keyof typeof ICONS] ?? ICONS.understanding;
}

function focusIcon(kind: HeJingFocusCard['kind']): ReactNode {
  return ICONS[kind];
}

function wayKind(insightId: string): 'communication' | 'boundary' | 'repair' {
  if (insightId.includes('boundary')) return 'boundary';
  if (insightId.includes('repair')) return 'repair';
  return 'communication';
}

function recordTagTone(tag: string): 'green' | 'gold' {
  if (/合作|旅行|改善|和好|相处|谈话|成长/u.test(tag)) return 'green';
  return 'gold';
}

// --- Section shell ---------------------------------------------------------

export function HeJingSection({
  className,
  id,
  icon,
  sectionRef,
  title,
  action,
  children,
}: {
  readonly className: string;
  readonly id?: string;
  readonly icon: ReactNode;
  readonly sectionRef?: Ref<HTMLElement>;
  readonly title: string;
  readonly action?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <section ref={sectionRef} id={id} className={`shijing-hejing__section ${className}`}>
      <header className="shijing-hejing__section-head">
        <h2 className="shijing-hejing__section-title">
          <span className="shijing-hejing__section-icon" aria-hidden>
            {icon}
          </span>
          {title}
        </h2>
        {action}
      </header>
      <div className="shijing-hejing__card">{children}</div>
    </section>
  );
}

// --- 顶部关系总览 ----------------------------------------------------------

function PersonCircle({ profile }: { readonly profile: HeJingPersonProfile }) {
  return (
    <div className="shijing-hejing__person" data-tone={profile.tone}>
      <div className="shijing-hejing__person-orb">
        <span className="shijing-hejing__person-glyph" aria-hidden>
          {profile.initials}
        </span>
      </div>
      <strong className="shijing-hejing__person-name">{profile.name}</strong>
      <span className="shijing-hejing__person-role">{profile.roleLabel}</span>
    </div>
  );
}

export function HeJingOverview({
  workspace,
  actions,
}: {
  readonly workspace: HeJingWorkspace;
  readonly actions: ReactNode;
}) {
  return (
    <section className="shijing-hejing__overview" aria-labelledby="hejing-overview-title">
      <div className="shijing-hejing__overview-head">
        <div className="shijing-hejing__overview-copy">
          <span className="shijing-hejing__eyebrow">{copy.eyebrow}</span>
          <h1 id="hejing-overview-title" className="shijing-hejing__overview-title">
            {workspace.headline}
          </h1>
          <p className="shijing-hejing__overview-sub">
            {workspace.relationshipTypeLabel} · {workspace.year} 年
          </p>
          <p className="shijing-hejing__overview-mainline">{workspace.mainline}</p>
        </div>
        {actions}
      </div>

      <div className="shijing-hejing__overview-card">
        <div className="shijing-hejing__pair">
          <PersonCircle profile={workspace.self} />
          <div className="shijing-hejing__pair-link" aria-hidden>
            <span />
            <strong>{copy.mirrorBadge}</strong>
            <span />
          </div>
          <PersonCircle profile={workspace.other} />
        </div>

        <div className="shijing-hejing__overview-detail">
          <div className="shijing-hejing__status-row">
            <div className="shijing-hejing__status-block">
              <span className="shijing-hejing__detail-label">{copy.statusLabel}</span>
              <strong>
                {workspace.relationshipStatus}
                <span className="shijing-hejing__status-badge" aria-hidden>
                  {ICONS.safety}
                </span>
              </strong>
            </div>
            <div className="shijing-hejing__keywords">
              <span className="shijing-hejing__detail-label">{copy.keywordsLabel}</span>
              <ul aria-label={copy.keywordsLabel}>
                {workspace.keywords.map((keyword) => (
                  <li key={keyword}>{keyword}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="shijing-hejing__reminder">
            <span className="shijing-hejing__detail-label">{copy.reminderLabel}</span>
            <p>{workspace.topReminder}</p>
          </div>

          {workspace.todayActions.length > 0 ? (
            <div className="shijing-hejing__today">
              <span className="shijing-hejing__detail-label">{copy.todayLabel}</span>
              <ul>
                {workspace.todayActions.map((action) => (
                  <li key={action}>
                    <span className="shijing-hejing__today-icon" aria-hidden>
                      {ICONS.check}
                    </span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="shijing-hejing__overview-hint">{copy.pendingGenerationHint}</p>
          )}
        </div>
      </div>
    </section>
  );
}

// --- 当前相处重点 ----------------------------------------------------------

export function HeJingFocusSection({ cards }: { readonly cards: readonly HeJingFocusCard[] }) {
  return (
    <section className="shijing-hejing__section shijing-hejing__focus">
      <header className="shijing-hejing__section-head">
        <h2 className="shijing-hejing__section-title">
          <span className="shijing-hejing__section-icon" aria-hidden>
            {ICONS.better}
          </span>
          {copy.focusTitle}
        </h2>
      </header>
      <div className="shijing-hejing__focus-grid">
        {cards.map((card) => (
          <article key={card.id} className="shijing-hejing__focus-card" data-kind={card.kind}>
            <header>
              <span className="shijing-hejing__focus-icon" aria-hidden>
                {focusIcon(card.kind)}
              </span>
              <h3>{card.title}</h3>
            </header>
            <ul>
              {card.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

// --- 关系雷达 --------------------------------------------------------------

function MetricReadout({ metric }: { readonly metric: HeJingMetric }) {
  return (
    <article className="shijing-hejing__metric" data-tone={metric.tone}>
      <span className="shijing-hejing__metric-icon" aria-hidden>
        {metricIcon(metric.id)}
      </span>
      <div className="shijing-hejing__metric-body">
        <div className="shijing-hejing__metric-head">
          <h3>{metric.label}</h3>
          <span className="shijing-hejing__metric-value">
            <strong>{metric.value}</strong>
            {copy.metricScaleSuffix}
          </span>
        </div>
        <p>{metric.explanation}</p>
      </div>
    </article>
  );
}

export function HeJingRadarSection({ workspace }: { readonly workspace: HeJingWorkspace }) {
  return (
    <HeJingSection
      className="shijing-hejing__radar-section"
      icon={ICONS.growth}
      title={`${workspace.relationshipTypeLabel}${copy.radarTitleSuffix}`}
    >
      <div className="shijing-hejing__index-body">
        <div className="shijing-hejing__radar-frame">
          <HeJingRadar metrics={workspace.metrics} label={`${workspace.relationshipTypeLabel}${copy.radarTitleSuffix}`} />
          <ul className="shijing-hejing__radar-legend" aria-hidden>
            <li data-kind="value">
              <span className="shijing-hejing__radar-swatch" />
              我与 {workspace.other.name}
            </li>
            <li data-kind="reference">
              <span className="shijing-hejing__radar-swatch" />
              {copy.radarReferenceLabel}
            </li>
          </ul>
        </div>
        <div className="shijing-hejing__metric-readouts">
          {workspace.metrics.map((metric) => (
            <MetricReadout key={metric.id} metric={metric} />
          ))}
        </div>
      </div>
    </HeJingSection>
  );
}

// --- 未来时间窗口 ----------------------------------------------------------

export function HeJingWindowsSection({ quarters }: { readonly quarters: readonly HeJingQuarterWindow[] }) {
  return (
    <HeJingSection className="shijing-hejing__windows" icon={ICONS.windows} title={copy.windowsTitle}>
      <ol className="shijing-hejing__timeline">
        {quarters.map((quarter) => (
          <li key={quarter.id} className="shijing-hejing__quarter" data-tone={quarter.tone}>
            <div className="shijing-hejing__quarter-head">
              <span className="shijing-hejing__quarter-marker" aria-hidden />
              <span className="shijing-hejing__quarter-label">
                {quarter.label} <small>({quarter.range})</small>
              </span>
              <span className="shijing-hejing__quarter-season" aria-hidden>
                {SEASON_ICONS[quarter.season]}
              </span>
            </div>
            <div className="shijing-hejing__quarter-card">
              <dl>
                <div>
                  <dt>{copy.windowsStateLabel}</dt>
                  <dd>{quarter.state}</dd>
                </div>
                <div>
                  <dt data-kind="watch">{copy.windowsWatchLabel}</dt>
                  <dd>{quarter.watch}</dd>
                </div>
                <div>
                  <dt data-kind="action">{copy.windowsActionLabel}</dt>
                  <dd>{quarter.action}</dd>
                </div>
              </dl>
            </div>
          </li>
        ))}
      </ol>
    </HeJingSection>
  );
}

// --- 相处方式 --------------------------------------------------------------

export function HeJingWaysSection({ insights }: { readonly insights: readonly HeJingInsight[] }) {
  return (
    <HeJingSection className="shijing-hejing__ways-section" icon={ICONS.ways} title={copy.waysTitle}>
      <div className="shijing-hejing__ways-list">
        {insights.map((insight) => (
          <article key={insight.id} className="shijing-hejing__ways" data-tone={insight.tone}>
            <span className="shijing-hejing__ways-icon" aria-hidden>
              {ICONS[wayKind(insight.id)]}
            </span>
            <div className="shijing-hejing__ways-copy">
              <h3>{insight.title}</h3>
              <p>{insight.body}</p>
            </div>
            <span className="shijing-hejing__ways-caret" aria-hidden>
              {ICONS.chevron}
            </span>
          </article>
        ))}
      </div>
    </HeJingSection>
  );
}

// --- 共同记录 --------------------------------------------------------------

export function HeJingRecordsSection({
  records,
  onWrite,
  rootRef,
}: {
  readonly records: readonly HeJingTimelineRecord[];
  readonly onWrite: () => void;
  readonly rootRef?: Ref<HTMLElement>;
}) {
  return (
    <HeJingSection
      className="shijing-hejing__records"
      id="hejing-records"
      icon={ICONS.records}
      sectionRef={rootRef}
      title={copy.recordsTitle}
    >
      <div className="shijing-hejing__records-bar">
        <p className="shijing-hejing__records-lead">{copy.recordsLead}</p>
        <button type="button" className="shijing-hejing__head-action is-solid" onClick={onWrite}>
          {ICONS.pencil}
          {copy.writeRecord}
        </button>
      </div>
      {records.length > 0 ? (
        <ol className="shijing-hejing__record-list">
          {records.map((record) => (
            <li key={record.id} className="shijing-hejing__record">
              <time dateTime={record.date}>{record.date}</time>
              <div className="shijing-hejing__record-body">
                <div className="shijing-hejing__record-head">
                  <h3>{record.title}</h3>
                  <span className="shijing-hejing__record-tag" data-tone={recordTagTone(record.tag)}>
                    {record.tag}
                  </span>
                </div>
                <p>{record.description}</p>
              </div>
              <div className="shijing-hejing__record-meta">
                <span className="shijing-hejing__record-author">{copy.recordsAuthor}</span>
                <button
                  type="button"
                  className="shijing-hejing__record-menu"
                  aria-label={copy.recordsMenuAria}
                  onClick={onWrite}
                >
                  <span aria-hidden>···</span>
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="shijing-hejing__records-empty">{copy.recordsEmpty}</p>
      )}
    </HeJingSection>
  );
}

// --- 命理依据（折叠） ------------------------------------------------------

export function HeJingBasisSection({ workspace }: { readonly workspace: HeJingWorkspace }) {
  return (
    <details className="shijing-hejing__basis">
      <summary>
        <span className="shijing-hejing__basis-summary">
          <span className="shijing-hejing__section-icon" aria-hidden>
            {ICONS.basis}
          </span>
          <span className="shijing-hejing__basis-title">{copy.basisTitle}</span>
          <span className="shijing-hejing__basis-hint">{copy.basisHint}</span>
        </span>
        <ul className="shijing-hejing__basis-chips" aria-hidden>
          {workspace.astrologyBasis.map((chip) => (
            <li key={chip.id}>
              <span className="shijing-hejing__basis-chip-icon">{basisIcon(chip.id)}</span>
              {chip.label}
            </li>
          ))}
        </ul>
        <span className="shijing-hejing__basis-caret" aria-hidden>
          {ICONS.chevron}
        </span>
      </summary>
      <div className="shijing-hejing__basis-body">
        <BasisColumn title={copy.basisConvergenceTitle} kind="convergence" items={workspace.structure.convergence} />
        <BasisColumn title={copy.basisFrictionTitle} kind="friction" items={workspace.structure.friction} />
      </div>
    </details>
  );
}

function BasisColumn({
  title,
  kind,
  items,
}: {
  readonly title: string;
  readonly kind: 'convergence' | 'friction';
  readonly items: readonly string[];
}) {
  return (
    <div className="shijing-hejing__basis-block" data-kind={kind}>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
