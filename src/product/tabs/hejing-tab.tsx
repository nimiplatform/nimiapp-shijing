import { useEffect, useMemo, useState, type ReactNode } from 'react';

import type { MingJingRelationshipMirrorOutput } from '../../domain/mirror-output.ts';
import type { Person } from '../../domain/person.ts';
import type { ReadingGenerationFailure } from '../../domain/reading.ts';
import type { SubjectRef } from '../../domain/subject-ref.ts';
import { AddPersonDialog } from '../persons/person-editor.tsx';
import { newReadingId } from '../ids/index.ts';
import { generateReadingForStorage } from '../reading/generate-and-store.ts';
import { latestMingJingRelationshipReading } from '../reading/reading-selectors.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import { relationshipNatalMirrorScopeForToday } from './mirror-scope-helpers.ts';
import { FailureBanner } from './shared/failure-banner.tsx';
import { HeJingRadar } from './hejing/hejing-radar.tsx';
import {
  HEJING_PAGE_COPY,
  HEJING_RELATIONSHIP_TYPES,
  HEJING_RELATIONSHIP_WORKSPACES,
  buildGeneratedHeJingWorkspace,
  buildHeJingWorkspaceFromPerson,
  hejingMethodSupportState,
  hejingWorkspaceIdForPerson,
  type HeJingFutureWindow,
  type HeJingInsight,
  type HeJingMetric,
  type HeJingPersonProfile,
  type HeJingRelationshipType,
  type HeJingTimelineRecord,
  type HeJingWorkspace,
} from './hejing/hejing-model.ts';

const copy = HEJING_PAGE_COPY;

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function personRefForWorkspace(
  workspaceId: string,
): Extract<SubjectRef, { kind: 'person' }> | null {
  if (!workspaceId.startsWith('person:')) return null;
  const id = workspaceId.slice('person:'.length);
  return id ? { kind: 'person', id } : null;
}

function isRelationshipOutput(output: unknown): output is MingJingRelationshipMirrorOutput {
  return (
    typeof output === 'object' &&
    output !== null &&
    (output as { mirror_kind?: unknown }).mirror_kind === 'mingjing' &&
    (output as { output_kind?: unknown }).output_kind === 'relationship_hepan'
  );
}

export function HeJingTab() {
  const { state, dispatch, runtime_ai_client } = useShijingStore();
  const workspaces = useMemo(() => {
    const personWorkspaces = state.snapshot.persons.map(buildHeJingWorkspaceFromPerson);
    return personWorkspaces.length > 0 ? personWorkspaces : HEJING_RELATIONSHIP_WORKSPACES;
  }, [state.snapshot.persons]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(
    () => workspaces[0]?.id ?? '',
  );
  const workspace = useMemo(
    () =>
      workspaces.find((item) => item.id === selectedWorkspaceId)
      ?? workspaces[0]
      ?? HEJING_RELATIONSHIP_WORKSPACES[0],
    [selectedWorkspaceId, workspaces],
  );
  const [selectedType, setSelectedType] = useState<HeJingRelationshipType>(
    workspace.selectedRelationshipType,
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<ReadingGenerationFailure | null>(null);
  const [addPersonOpen, setAddPersonOpen] = useState(false);
  const currentMethodProfileId = state.snapshot.settings.method_profile_id;
  const methodSupport = useMemo(
    () => hejingMethodSupportState(currentMethodProfileId),
    [currentMethodProfileId],
  );
  const selectedPersonRef = personRefForWorkspace(workspace.id);
  const relationshipReading = useMemo(
    () =>
      selectedPersonRef
        ? latestMingJingRelationshipReading({
            readings: state.snapshot.readings,
            related_person_ref: selectedPersonRef,
            method_profile_id: currentMethodProfileId,
          })
        : undefined,
    [state.snapshot.readings, selectedPersonRef, currentMethodProfileId],
  );
  const relationshipOutput = isRelationshipOutput(relationshipReading?.output)
    ? relationshipReading.output
    : null;
  const displayWorkspace = useMemo(
    () =>
      relationshipReading
        ? buildGeneratedHeJingWorkspace({ workspace, reading: relationshipReading })
        : workspace,
    [relationshipReading, workspace],
  );

  useEffect(() => {
    setSelectedType(workspace.selectedRelationshipType);
    setStatusMessage(null);
  }, [workspace]);

  useEffect(() => {
    if (workspaces.length === 0) return;
    if (workspaces.some((item) => item.id === selectedWorkspaceId)) return;
    setSelectedWorkspaceId(workspaces[0].id);
  }, [selectedWorkspaceId, workspaces]);

  function handleCreateHejing() {
    setAddPersonOpen(true);
  }

  function handleRelationshipPersonSaved(person: Person) {
    setSelectedWorkspaceId(hejingWorkspaceIdForPerson(person.id));
    setAddPersonOpen(false);
    setStatusMessage(null);
    setFailure(null);
  }

  async function handleGenerateAdvice() {
    if (!selectedPersonRef) {
      setStatusMessage(copy.createStatus);
      return;
    }
    setLoading(true);
    setFailure(null);
    setStatusMessage(null);
    const outcome = await generateReadingForStorage({
      id: newReadingId(),
      created_at: nowIso(),
      mirror_kind: 'mingjing',
      mirror_scope: relationshipNatalMirrorScopeForToday(selectedPersonRef),
      related_person_refs: [selectedPersonRef],
      concern_tag_refs: [],
      space: state.snapshot,
      deps: { runtime_ai_client },
    });
    setLoading(false);
    if (!outcome.ok) {
      setFailure(outcome.failure);
      return;
    }
    dispatch({ type: 'snapshot/replace', snapshot: outcome.next_space });
    setStatusMessage((outcome.reading.output as MingJingRelationshipMirrorOutput).summary);
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
              {workspaces.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.selectorLabel}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="shijing-hejing__hero-body">
          <div className="shijing-hejing__pair">
            <PersonCircle profile={displayWorkspace.self} />
            <div className="shijing-hejing__pair-link" aria-hidden>
              <span />
              <strong>{copy.mirrorBadge}</strong>
              <span />
            </div>
            <PersonCircle profile={displayWorkspace.other} />
          </div>

          <div className="shijing-hejing__hero-detail">
            <h2 id="hejing-hero-title" className="shijing-hejing__headline">
              {displayWorkspace.headline}
            </h2>
            <p className="shijing-hejing__hero-summary">{displayWorkspace.summary}</p>
            <div className="shijing-hejing__summary-panel">
              <SummaryRow label={copy.basisLabel} value={displayWorkspace.basis} />
              <SummaryRow label={copy.phaseLabel} value={displayWorkspace.phase} />
              <SummaryRow label={copy.futureHintLabel} value={displayWorkspace.futureHint} />
            </div>
            <ul className="shijing-hejing__tags" aria-label={copy.keywordsAria}>
              {displayWorkspace.keywords.map((keyword) => (
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
      {failure ? <FailureBanner failure={failure} /> : null}

      {!methodSupport.supported ? (
        <div className="shijing-hejing__unsupported" role="status">
          <strong>{copy.unsupportedMethodTitle}</strong>
          <p>{copy.unsupportedMethodBody}</p>
          {methodSupport.detail ? <code>{methodSupport.detail}</code> : null}
        </div>
      ) : null}

      {methodSupport.supported && relationshipOutput ? (
        <AnalysisSection
          className="shijing-hejing__generated"
          title={copy.generatedTitle}
          subtitle={copy.generatedSubtitle}
        >
          <div className="shijing-hejing__generated-grid">
            <div>
              <h3>{relationshipOutput.summary}</h3>
              <p>{relationshipOutput.structure.baseline_pattern}</p>
              <p>{relationshipOutput.structure.attraction_and_support}</p>
              <p>{relationshipOutput.structure.friction_and_misread}</p>
            </div>
            <ol className="shijing-hejing__generated-windows">
              {relationshipOutput.timing_windows.map((window) => (
                <li key={`${window.start_date}-${window.end_date}`}>
                  <strong>{window.start_date} - {window.end_date}</strong>
                  <span>{window.nature}</span>
                  <p>{window.summary}</p>
                </li>
              ))}
            </ol>
          </div>
        </AnalysisSection>
      ) : null}

      {methodSupport.supported ? (
        <>
        <AnalysisSection
        className="shijing-hejing__metrics"
        title={copy.indexTitle}
        subtitle={copy.indexTitleEn}
      >
        <div className="shijing-hejing__index-body">
          <div className="shijing-hejing__radar-frame">
            <HeJingRadar metrics={displayWorkspace.metrics} label={copy.radarAria} />
          </div>
          <div className="shijing-hejing__metric-readouts">
            {displayWorkspace.metrics.map((metric) => (
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
          <PersonColumn profile={displayWorkspace.self} />
          <CrossColumn workspace={displayWorkspace} />
          <PersonColumn profile={displayWorkspace.other} />
        </div>
      </AnalysisSection>

      <AnalysisSection
        className="shijing-hejing__interaction"
        title={copy.waysTitle}
        subtitle={copy.waysTitleEn}
      >
        <div className="shijing-hejing__ways-list">
          {displayWorkspace.insights.map((insight) => (
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
            <strong>{displayWorkspace.repairWindow.title}</strong>
            <span>{displayWorkspace.repairWindow.range}</span>
          </div>
          <p>{displayWorkspace.repairWindow.body}</p>
        </div>
        <ol className="shijing-hejing__timeline">
          {displayWorkspace.futureWindows.map((node) => (
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
            <p>{displayWorkspace.weeklyAdvice}</p>
          </div>
          <button type="button" onClick={handleGenerateAdvice}>
            {loading ? copy.generatingAdvice : copy.regenerateAdvice}
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
          {displayWorkspace.records.map((record) => (
            <HistoryRecord key={record.id} record={record} />
          ))}
        </ol>
      </AnalysisSection>
        </>
      ) : null}

      <footer className="shijing-hejing__footer">
        <p>{displayWorkspace.disclaimer}</p>
      </footer>

      <AddPersonDialog
        open={addPersonOpen}
        title={copy.addPersonDialogTitle}
        onClose={() => setAddPersonOpen(false)}
        onSavedPerson={handleRelationshipPersonSaved}
      />
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
      <div className="shijing-hejing__profile-content">
        <h3>
          {profile.label} · {profile.name}
        </h3>
        <ul>
          {profile.traits.map((trait) => (
            <li key={trait}>{trait}</li>
          ))}
        </ul>
      </div>
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
