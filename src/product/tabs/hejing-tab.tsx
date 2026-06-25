import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { HeJingRadar } from './hejing/hejing-radar.tsx';
import {
  HEJING_PAGE_COPY,
  HEJING_RELATIONSHIP_TYPES,
  HEJING_RELATIONSHIP_WORKSPACES,
  type HeJingFutureWindow,
  type HeJingInsight,
  type HeJingMetric,
  type HeJingPersonProfile,
  type HeJingRelationshipType,
  type HeJingTimelineRecord,
  type HeJingWorkspace,
} from './hejing/hejing-model.ts';

const copy = HEJING_PAGE_COPY;

export function HeJingTab() {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(
    () => HEJING_RELATIONSHIP_WORKSPACES[0]?.id ?? '',
  );
  const workspace = useMemo(
    () =>
      HEJING_RELATIONSHIP_WORKSPACES.find((item) => item.id === selectedWorkspaceId)
      ?? HEJING_RELATIONSHIP_WORKSPACES[0],
    [selectedWorkspaceId],
  );
  const [selectedType, setSelectedType] = useState<HeJingRelationshipType>(
    workspace.selectedRelationshipType,
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    setSelectedType(workspace.selectedRelationshipType);
    setStatusMessage(null);
  }, [workspace]);

  function handleCreateHejing() {
    setStatusMessage(copy.createStatus);
  }

  function handleGenerateAdvice() {
    setStatusMessage(copy.adviceStatus);
  }

  function handleWriteRecord() {
    setStatusMessage(copy.recordStatus);
  }

  return (
    <section className="shijing-tab shijing-hejing" data-mirror-kind="hejing">
      <header className="shijing-hejing__intro">
        <div className="shijing-hejing__intro-copy">
          <span className="shijing-hejing__eyebrow">{copy.eyebrow}</span>
          <h1 className="shijing-hejing__intro-title">
            <span>{copy.introTitleLine1}</span>
            <span>{copy.introTitleLine2}</span>
          </h1>
          <p className="shijing-hejing__intro-lead">{copy.introLead}</p>
        </div>
        <button type="button" className="shijing-hejing__new-button" onClick={handleCreateHejing}>
          {copy.newHejing}
        </button>
      </header>

      <section className="shijing-hejing__hero" aria-labelledby="hejing-hero-title">
        <div className="shijing-hejing__hero-head">
          <RelationshipTypeTabs selectedType={selectedType} onSelect={setSelectedType} />
          <label className="shijing-hejing__object-select">
            <span>{copy.selectorTitle}</span>
            <select
              value={workspace.id}
              aria-label={copy.selectAria}
              onChange={(event) => setSelectedWorkspaceId(event.currentTarget.value)}
            >
              {HEJING_RELATIONSHIP_WORKSPACES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.selectorLabel}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="shijing-hejing__hero-body">
          <div className="shijing-hejing__pair">
            <PersonCircle profile={workspace.self} />
            <div className="shijing-hejing__pair-link" aria-hidden>
              <span />
              <strong>{copy.mirrorBadge}</strong>
              <span />
            </div>
            <PersonCircle profile={workspace.other} />
          </div>

          <div className="shijing-hejing__hero-detail">
            <h2 id="hejing-hero-title" className="shijing-hejing__headline">
              {workspace.headline}
            </h2>
            <p className="shijing-hejing__hero-summary">{workspace.summary}</p>
            <div className="shijing-hejing__summary-panel">
              <SummaryRow label={copy.basisLabel} value={workspace.basis} />
              <SummaryRow label={copy.phaseLabel} value={workspace.phase} />
              <SummaryRow label={copy.futureHintLabel} value={workspace.futureHint} />
            </div>
            <ul className="shijing-hejing__tags" aria-label={copy.keywordsAria}>
              {workspace.keywords.map((keyword) => (
                <li key={keyword}>{keyword}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {statusMessage ? (
        <p className="shijing-hejing__status" role="status">
          {statusMessage}
        </p>
      ) : null}

      <AnalysisSection
        className="shijing-hejing__metrics"
        title={copy.indexTitle}
        subtitle={copy.indexTitleEn}
      >
        <div className="shijing-hejing__index-body">
          <div className="shijing-hejing__radar-frame">
            <HeJingRadar metrics={workspace.metrics} label={copy.radarAria} />
          </div>
          <div className="shijing-hejing__metric-readouts">
            {workspace.metrics.map((metric) => (
              <MetricReadout key={metric.id} metric={metric} />
            ))}
          </div>
        </div>
      </AnalysisSection>

      <AnalysisSection
        className="shijing-hejing__structure"
        title={copy.intersectionTitle}
        subtitle={copy.intersectionTitleEn}
      >
        <div className="shijing-hejing__structure-grid">
          <PersonColumn profile={workspace.self} />
          <CrossColumn workspace={workspace} />
          <PersonColumn profile={workspace.other} />
        </div>
      </AnalysisSection>

      <AnalysisSection
        className="shijing-hejing__interaction"
        title={copy.waysTitle}
        subtitle={copy.waysTitleEn}
      >
        <div className="shijing-hejing__ways-list">
          {workspace.insights.map((insight) => (
            <WaysRow key={insight.id} insight={insight} />
          ))}
        </div>
      </AnalysisSection>

      <AnalysisSection
        className="shijing-hejing__windows"
        title={copy.futureTitle}
        subtitle={copy.futureTitleEn}
      >
        <div className="shijing-hejing__repair">
          <div className="shijing-hejing__repair-head">
            <strong>{workspace.repairWindow.title}</strong>
            <span>{workspace.repairWindow.range}</span>
          </div>
          <p>{workspace.repairWindow.body}</p>
        </div>
        <ol className="shijing-hejing__timeline">
          {workspace.futureWindows.map((node) => (
            <FutureNode key={node.id} node={node} />
          ))}
        </ol>
      </AnalysisSection>

      <AnalysisSection
        className="shijing-hejing__advice"
        title={copy.guidanceTitle}
        subtitle={copy.guidanceTitleEn}
      >
        <div className="shijing-hejing__advice-box">
          <div className="shijing-hejing__advice-text">
            <span>{copy.weeklyAdviceLabel}</span>
            <p>{workspace.weeklyAdvice}</p>
          </div>
          <button type="button" onClick={handleGenerateAdvice}>
            {copy.regenerateAdvice}
          </button>
        </div>
      </AnalysisSection>

      <AnalysisSection
        className="shijing-hejing__history-card"
        title={copy.historyTitle}
        subtitle={copy.historyTitleEn}
        action={
          <button
            type="button"
            className="shijing-hejing__head-action"
            onClick={handleWriteRecord}
          >
            {copy.writeRecord}
          </button>
        }
      >
        <ol className="shijing-hejing__history">
          {workspace.records.map((record) => (
            <HistoryRecord key={record.id} record={record} />
          ))}
        </ol>
      </AnalysisSection>

      <footer className="shijing-hejing__footer">
        <p>{workspace.disclaimer}</p>
      </footer>
    </section>
  );
}

function RelationshipTypeTabs({
  selectedType,
  onSelect,
}: {
  readonly selectedType: HeJingRelationshipType;
  readonly onSelect: (type: HeJingRelationshipType) => void;
}) {
  return (
    <div className="shijing-hejing__type-tabs" role="group" aria-label={copy.relationshipType}>
      <span>{copy.relationshipType}</span>
      {HEJING_RELATIONSHIP_TYPES.map((type) => (
        <button
          key={type.id}
          type="button"
          data-active={selectedType === type.id ? '' : undefined}
          onClick={() => onSelect(type.id)}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
}

function PersonCircle({ profile }: { readonly profile: HeJingPersonProfile }) {
  return (
    <div className="shijing-hejing__person" data-tone={profile.tone}>
      <div className="shijing-hejing__person-orb">
        <span className="shijing-hejing__person-role">{profile.label}</span>
        <strong className="shijing-hejing__person-name">{profile.name}</strong>
      </div>
      <small className="shijing-hejing__person-element">{profile.elementTag}</small>
    </div>
  );
}

function SummaryRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="shijing-hejing__summary-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SectionHead({
  title,
  subtitle,
  children,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly children?: ReactNode;
}) {
  return (
    <header className="shijing-hejing__section-head">
      <div className="shijing-hejing__section-title">
        <h2>{title}</h2>
        <span aria-hidden>{subtitle}</span>
      </div>
      {children}
    </header>
  );
}

// A content section whose bilingual title sits OUTSIDE the white card,
// with the rendered content held in the inner card panel below it.
function AnalysisSection({
  className,
  title,
  subtitle,
  action,
  children,
}: {
  readonly className: string;
  readonly title: string;
  readonly subtitle: string;
  readonly action?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <section className={`shijing-hejing__section ${className}`}>
      <SectionHead title={title} subtitle={subtitle}>
        {action}
      </SectionHead>
      <div className="shijing-hejing__card">{children}</div>
    </section>
  );
}

function MetricReadout({ metric }: { readonly metric: HeJingMetric }) {
  return (
    <article className="shijing-hejing__metric" data-tone={metric.tone}>
      <div className="shijing-hejing__metric-head">
        <span className="shijing-hejing__metric-dot" aria-hidden />
        <h3>{metric.label}</h3>
      </div>
      <p className="shijing-hejing__metric-value">
        <strong>{metric.value}</strong>
        <span>{copy.metricScaleSuffix}</span>
      </p>
    </article>
  );
}

function PersonColumn({ profile }: { readonly profile: HeJingPersonProfile }) {
  return (
    <article className="shijing-hejing__profile-card" data-tone={profile.tone}>
      <h3>
        {profile.label} · {profile.name}
      </h3>
      <ul>
        {profile.traits.map((trait) => (
          <li key={trait}>{trait}</li>
        ))}
      </ul>
    </article>
  );
}

function CrossColumn({ workspace }: { readonly workspace: HeJingWorkspace }) {
  return (
    <article className="shijing-hejing__cross-card">
      <div className="shijing-hejing__cross-block" data-kind="convergence">
        <h3>{copy.convergenceTitle}</h3>
        <ul>
          {workspace.structure.convergence.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div className="shijing-hejing__cross-block" data-kind="friction">
        <h3>{copy.frictionTitle}</h3>
        <ul>
          {workspace.structure.friction.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function WaysRow({ insight }: { readonly insight: HeJingInsight }) {
  return (
    <article className="shijing-hejing__ways" data-tone={insight.tone}>
      <span className="shijing-hejing__ways-icon" aria-hidden>
        {insight.iconLabel}
      </span>
      <div className="shijing-hejing__ways-copy">
        <h3>{insight.title}</h3>
        <p>{insight.body}</p>
      </div>
    </article>
  );
}

function FutureNode({ node }: { readonly node: HeJingFutureWindow }) {
  return (
    <li className="shijing-hejing__node" data-tone={node.tone}>
      <span className="shijing-hejing__node-marker" aria-hidden />
      <span className="shijing-hejing__node-label">{node.title}</span>
      <article className="shijing-hejing__node-card">
        <span className="shijing-hejing__node-badge">{node.status}</span>
        <p>{node.body}</p>
      </article>
    </li>
  );
}

function HistoryRecord({ record }: { readonly record: HeJingTimelineRecord }) {
  return (
    <li className="shijing-hejing__record">
      <time dateTime={record.date}>{record.date}</time>
      <div className="shijing-hejing__record-body">
        <div className="shijing-hejing__record-head">
          <h3>{record.title}</h3>
          <span className="shijing-hejing__record-tag">{record.tag}</span>
        </div>
        <p>
          <strong>{copy.aiInsightPrefix}</strong>
          {record.insight}
        </p>
      </div>
    </li>
  );
}
