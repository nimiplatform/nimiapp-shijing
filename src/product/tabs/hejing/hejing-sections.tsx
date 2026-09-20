// HeJing (合镜) ready-state sections — pattern-reading redesign.
//
// Render tree order (proposal §3): 关系概览 → 主要相处模式 → 近期变化(仅有依据时)
// → 下一次,可以试这一件事. Every section renders the admitted
// MingJingRelationshipMirrorOutput fields verbatim; evidence_summary and the
// per-pattern 解读依据 stay deterministic text, never re-worded here.

import type { ReactNode, Ref } from 'react';

import type {
  MingJingRelationshipAction,
  MingJingRelationshipMirrorOutput,
  MingJingRelationshipPattern,
  RelationshipRecentWindow,
} from '../../../domain/mirror-output.ts';
import { relationshipPatternRuleBasis } from '../../astrology/relationship-pattern-rules.ts';
import { formatTendencyClass } from '../../reading/reading-format.ts';
import {
  HEJING_PAGE_COPY,
  hejingRecentWindowLabel,
  type HeJingPersonProfile,
  type HeJingTrackRecord,
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
  overview: (
    <Icon>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  ),
  patterns: (
    <Icon>
      <circle cx="9" cy="12" r="5" />
      <circle cx="15" cy="12" r="5" />
    </Icon>
  ),
  recent: (
    <Icon>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.6 2.6" />
    </Icon>
  ),
  action: (
    <Icon>
      <path d="M12 20c0-4 1.5-7 6-9-4.5-.5-7.5 1-9 4.5C7.5 13 6 11 4 10.5 5 16 8 19 12 20Z" />
      <path d="M12 20v-6" />
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
  chevron: (
    <Icon>
      <path d="m9 6 6 6-6 6" />
    </Icon>
  ),
} as const;

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

// --- 待生成 hero 双人头像(仅 pending 视图使用) -------------------------------

export function PersonCircle({ profile }: { readonly profile: HeJingPersonProfile }) {
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

// --- 区域一 关系概览 ---------------------------------------------------------

export function HeJingOverviewSection({
  output,
  recentAvailable,
}: {
  readonly output: MingJingRelationshipMirrorOutput;
  readonly recentAvailable: boolean;
}) {
  const keywords = output.overview.keywords.slice(0, 3);
  return (
    <HeJingSection
      className="shijing-hejing__overview-section"
      icon={ICONS.overview}
      title={copy.overviewTitle}
    >
      <h3 className="shijing-hejing__overview-heading">{output.overview.title}</h3>
      <p className="shijing-hejing__overview-summary">{output.overview.summary}</p>
      {keywords.length > 0 ? (
        <ul className="shijing-hejing__keyword-chips" aria-label={copy.keywordsAria}>
          {keywords.map((keyword) => (
            <li key={keyword}>{keyword}</li>
          ))}
        </ul>
      ) : null}
      {!recentAvailable ? (
        <p className="shijing-hejing__recent-note" role="status">
          {copy.recentUnavailableNote}
        </p>
      ) : null}
    </HeJingSection>
  );
}

// --- 区域二 主要相处模式 -----------------------------------------------------

function HeJingPatternItem({
  pattern,
  relatedName,
  methodLabel,
  onRecord,
}: {
  readonly pattern: MingJingRelationshipPattern;
  readonly relatedName: string;
  readonly methodLabel: string;
  readonly onRecord: () => void;
}) {
  const basis = relationshipPatternRuleBasis(pattern.rule_ref);
  return (
    <li className="shijing-hejing__pattern" data-pattern-id={pattern.pattern_id}>
      <header className="shijing-hejing__pattern-head">
        <span className="shijing-hejing__pattern-rank">{copy.patternRankLabel(pattern.rank)}</span>
        <h3 className="shijing-hejing__pattern-name">{pattern.name}</h3>
      </header>

      <dl className="shijing-hejing__tendencies">
        <div className="shijing-hejing__tendency" data-side="self">
          <dt>{copy.selfTendencyLabel}</dt>
          <dd>{pattern.self_tendency}</dd>
        </div>
        <div className="shijing-hejing__tendency" data-side="related">
          <dt>{relatedName}</dt>
          <dd>{pattern.related_tendency}</dd>
        </div>
      </dl>

      <div className="shijing-hejing__pattern-block">
        <h4>{copy.scenarioLabel}</h4>
        <p>{pattern.scenario}</p>
      </div>

      <div className="shijing-hejing__expression-grid">
        <div className="shijing-hejing__pattern-block" data-kind="aligned">
          <h4>{copy.alignedLabel}</h4>
          <p>{pattern.aligned_expression}</p>
        </div>
        <div className="shijing-hejing__pattern-block" data-kind="friction">
          <h4>{copy.frictionLabel}</h4>
          <p>{pattern.friction_expression}</p>
        </div>
      </div>

      <div className="shijing-hejing__pattern-block">
        <h4>{copy.signalsLabel}</h4>
        <ul className="shijing-hejing__signals">
          {pattern.signals.map((signal) => (
            <li key={signal}>{signal}</li>
          ))}
        </ul>
      </div>

      <footer className="shijing-hejing__pattern-foot">
        <button
          type="button"
          className="shijing-hejing__pattern-record"
          onClick={onRecord}
        >
          {ICONS.pencil}
          {copy.recordPatternEntry}
        </button>
        <details className="shijing-hejing__basis">
          <summary>
            <span className="shijing-hejing__basis-summary">
              {ICONS.basis}
              {copy.basisDrawerLabel}
            </span>
            <span className="shijing-hejing__basis-caret" aria-hidden>
              {ICONS.chevron}
            </span>
          </summary>
          <div className="shijing-hejing__basis-body">
            <dl>
              <div>
                <dt>{copy.basisMethodLabel}</dt>
                <dd>{methodLabel}</dd>
              </div>
              <div>
                <dt>{copy.basisEvidenceLabel}</dt>
                <dd>{pattern.evidence_summary}</dd>
              </div>
              <div>
                <dt>{copy.basisRuleLabel}</dt>
                <dd>
                  <strong>{basis.title}</strong>
                  <p>{basis.body}</p>
                </dd>
              </div>
            </dl>
            <p className="shijing-hejing__basis-limitation">{copy.basisLimitation}</p>
          </div>
        </details>
      </footer>
    </li>
  );
}

export function HeJingPatternsSection({
  patterns,
  relatedName,
  methodLabel,
  onRecord,
}: {
  readonly patterns: readonly MingJingRelationshipPattern[];
  readonly relatedName: string;
  readonly methodLabel: string;
  readonly onRecord: () => void;
}) {
  return (
    <HeJingSection
      className="shijing-hejing__patterns-section"
      icon={ICONS.patterns}
      title={copy.patternsTitle}
    >
      <ol className="shijing-hejing__pattern-list">
        {patterns.map((pattern) => (
          <HeJingPatternItem
            key={pattern.pattern_id}
            pattern={pattern}
            relatedName={relatedName}
            methodLabel={methodLabel}
            onRecord={onRecord}
          />
        ))}
      </ol>
    </HeJingSection>
  );
}

// --- 区域三 近期变化(仅有依据时渲染) -----------------------------------------

export function HeJingRecentSection({
  window,
}: {
  readonly window: RelationshipRecentWindow;
}) {
  return (
    <HeJingSection
      className="shijing-hejing__recent-section"
      icon={ICONS.recent}
      title={copy.recentTitle}
    >
      <dl className="shijing-hejing__recent-meta">
        <div>
          <dt>{copy.recentWindowLabel}</dt>
          <dd>{hejingRecentWindowLabel(window)}</dd>
        </div>
        <div>
          <dt>{copy.recentNatureLabel}</dt>
          <dd>{formatTendencyClass(window.nature)}</dd>
        </div>
      </dl>
      <p className="shijing-hejing__recent-summary">{window.summary}</p>
      <p className="shijing-hejing__recent-precision">{copy.recentPrecisionNote}</p>
    </HeJingSection>
  );
}

// --- 区域四 下一次,可以试这一件事 ---------------------------------------------

export function HeJingActionSection({
  action,
}: {
  readonly action: MingJingRelationshipAction;
}) {
  return (
    <HeJingSection
      className="shijing-hejing__action-section"
      icon={ICONS.action}
      title={copy.actionTitle}
    >
      <div className="shijing-hejing__action-block">
        <h3>{copy.actionSituationLabel}</h3>
        <p>{action.situation}</p>
      </div>
      <div className="shijing-hejing__action-block">
        <h3>{copy.actionStepLabel}</h3>
        <p>{action.step}</p>
      </div>
      <div className="shijing-hejing__action-block">
        <h3>{copy.actionPhraseLabel}</h3>
        <blockquote className="shijing-hejing__action-phrase">{action.example_phrase}</blockquote>
      </div>
      <div className="shijing-hejing__action-block">
        <h3>{copy.actionRationaleLabel}</h3>
        <p>{action.rationale}</p>
      </div>
      <div className="shijing-hejing__action-block">
        <h3>{copy.actionObservationLabel}</h3>
        <p>{action.observation}</p>
      </div>
    </HeJingSection>
  );
}

// --- 轨迹(二级视图) -----------------------------------------------------------

export function HeJingTrackView({
  records,
  onRecord,
  onEdit,
  onDelete,
  sectionRef,
}: {
  readonly records: readonly HeJingTrackRecord[];
  readonly onRecord: () => void;
  readonly onEdit: (record: HeJingTrackRecord) => void;
  readonly onDelete: (record: HeJingTrackRecord) => void;
  readonly sectionRef?: Ref<HTMLElement>;
}) {
  return (
    <HeJingSection
      className="shijing-hejing__track"
      id="hejing-track"
      icon={ICONS.records}
      sectionRef={sectionRef}
      title={copy.trackTitle}
      action={
        <button type="button" className="shijing-hejing__head-action is-solid" onClick={onRecord}>
          {ICONS.pencil}
          {copy.recordEntry}
        </button>
      }
    >
      <p className="shijing-hejing__track-note">{copy.trackNote}</p>
      {records.length === 0 ? (
        <div className="shijing-hejing__track-empty">
          <h3>{copy.trackEmptyTitle}</h3>
          <p>{copy.trackEmptyBody}</p>
          <button type="button" className="shijing-hejing__head-action" onClick={onRecord}>
            {ICONS.pencil}
            {copy.trackEmptyCta}
          </button>
        </div>
      ) : (
        <ol className="shijing-hejing__track-list">
          {records.map((record) => (
            <li key={`${record.kind}:${record.id}`} className="shijing-hejing__track-item">
              <span className="shijing-hejing__track-badge" data-kind={record.kind}>
                {record.kind === 'event' ? copy.trackEventBadge : copy.trackPlanBadge}
              </span>
              <time dateTime={record.date}>{record.date}</time>
              <p>{record.body}</p>
              {record.kind === 'event' ? (
                <span className="shijing-hejing__track-actions">
                  <button type="button" onClick={() => onEdit(record)}>
                    {copy.trackEditLabel}
                  </button>
                  <button type="button" data-tone="danger" onClick={() => onDelete(record)}>
                    {copy.trackDeleteLabel}
                  </button>
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </HeJingSection>
  );
}
