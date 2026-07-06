import { useEffect, useMemo, useRef, useState } from 'react';

import type { MingJingRelationshipMirrorOutput } from '../../domain/mirror-output.ts';
import type { Person } from '../../domain/person.ts';
import type { ReadingGenerationFailure } from '../../domain/reading.ts';
import type { SubjectRef } from '../../domain/subject-ref.ts';
import { AddPersonDialog } from '../persons/person-editor.tsx';
import { SjpSelect } from '../components/sjp-select.tsx';
import { newReadingId } from '../ids/index.ts';
import { generateReadingForStorage } from '../reading/generate-and-store.ts';
import { latestMingJingRelationshipReading } from '../reading/reading-selectors.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import { relationshipNatalMirrorScopeForToday } from './mirror-scope-helpers.ts';
import { FailureBanner } from './shared/failure-banner.tsx';
import { HeJingEmptyState, HeJingRelationshipTypeEmpty } from './hejing/hejing-empty-state.tsx';
import {
  HeJingBasisSection,
  HeJingFocusSection,
  HeJingOverview,
  HeJingRadarSection,
  HeJingRecordsSection,
  HeJingWaysSection,
  HeJingWindowsSection,
  ICONS,
} from './hejing/hejing-sections.tsx';
import {
  HEJING_PAGE_COPY,
  HEJING_RELATIONSHIP_TYPES,
  HEJING_RELATIONSHIP_WORKSPACES,
  buildGeneratedHeJingWorkspace,
  buildHeJingWorkspaceFromPerson,
  hejingMethodSupportState,
  hejingRelationshipTypeForPerson,
  hejingWorkspaceIdForPerson,
  hejingWorkspacesForRelationshipType,
  initialHeJingWorkspaceIdFromReadings,
  type HeJingRelationshipType,
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
  const { state, replace_snapshot, runtime_ai_client } = useShijingStore();
  const currentMethodProfileId = state.snapshot.settings.method_profile_id;
  const workspaces = useMemo(() => {
    const personWorkspaces = state.snapshot.persons.map(buildHeJingWorkspaceFromPerson);
    return personWorkspaces.length > 0 ? personWorkspaces : HEJING_RELATIONSHIP_WORKSPACES;
  }, [state.snapshot.persons]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(
    () =>
      initialHeJingWorkspaceIdFromReadings({
        workspaces,
        readings: state.snapshot.readings,
        method_profile_id: currentMethodProfileId,
      }),
  );
  const restoredGeneratedWorkspaceRef = useRef(false);
  const initialWorkspace = useMemo(
    () =>
      workspaces.find((item) => item.id === selectedWorkspaceId)
      ?? workspaces[0]
      ?? HEJING_RELATIONSHIP_WORKSPACES[0],
    [selectedWorkspaceId, workspaces],
  );
  const [selectedType, setSelectedType] = useState<HeJingRelationshipType>(
    initialWorkspace.selectedRelationshipType,
  );
  const filteredWorkspaces = useMemo(
    () => hejingWorkspacesForRelationshipType(workspaces, selectedType),
    [workspaces, selectedType],
  );
  const hasSelectedTypeWorkspaces = filteredWorkspaces.length > 0;
  const workspace = useMemo(
    () =>
      filteredWorkspaces.find((item) => item.id === selectedWorkspaceId)
      ?? filteredWorkspaces[0]
      ?? null,
    [filteredWorkspaces, selectedWorkspaceId],
  );
  const selectedTypeLabel = useMemo(
    () =>
      HEJING_RELATIONSHIP_TYPES.find((type) => type.id === selectedType)?.label
      ?? HEJING_RELATIONSHIP_TYPES[0].label,
    [selectedType],
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<ReadingGenerationFailure | null>(null);
  const [addPersonOpen, setAddPersonOpen] = useState(false);
  const recordsSectionRef = useRef<HTMLElement | null>(null);
  const methodSupport = useMemo(
    () => hejingMethodSupportState(currentMethodProfileId),
    [currentMethodProfileId],
  );
  const selectedPersonRef = workspace ? personRefForWorkspace(workspace.id) : null;
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
  const hasGeneratedRelationship = Boolean(relationshipOutput);
  const cachedWorkspaceId = useMemo(
    () =>
      initialHeJingWorkspaceIdFromReadings({
        workspaces,
        readings: state.snapshot.readings,
        method_profile_id: currentMethodProfileId,
      }),
    [workspaces, state.snapshot.readings, currentMethodProfileId],
  );
  const displayWorkspace = useMemo(
    () =>
      workspace && relationshipReading
        ? buildGeneratedHeJingWorkspace({ workspace, reading: relationshipReading })
        : workspace,
    [relationshipReading, workspace],
  );

  useEffect(() => {
    setStatusMessage(null);
  }, [workspace?.id]);

  useEffect(() => {
    if (restoredGeneratedWorkspaceRef.current) return;
    if (!cachedWorkspaceId) return;
    if (cachedWorkspaceId === selectedWorkspaceId) return;
    const cachedWorkspace = workspaces.find((item) => item.id === cachedWorkspaceId);
    if (!cachedWorkspace) return;
    if (cachedWorkspaceId === (workspaces[0]?.id ?? '')) return;
    restoredGeneratedWorkspaceRef.current = true;
    setSelectedType(cachedWorkspace.selectedRelationshipType);
    setSelectedWorkspaceId(cachedWorkspaceId);
  }, [cachedWorkspaceId, selectedWorkspaceId, workspaces]);

  useEffect(() => {
    if (!hasSelectedTypeWorkspaces) return;
    if (filteredWorkspaces.some((item) => item.id === selectedWorkspaceId)) return;
    setSelectedWorkspaceId(filteredWorkspaces[0].id);
  }, [filteredWorkspaces, hasSelectedTypeWorkspaces, selectedWorkspaceId]);

  function handleCreateHejing() {
    setAddPersonOpen(true);
  }

  function handleRelationshipPersonSaved(person: Person) {
    restoredGeneratedWorkspaceRef.current = true;
    setSelectedType(hejingRelationshipTypeForPerson(person));
    setSelectedWorkspaceId(hejingWorkspaceIdForPerson(person.id));
    setAddPersonOpen(false);
    setStatusMessage(null);
    setFailure(null);
  }

  function handleSelectRelationshipType(type: HeJingRelationshipType) {
    const nextWorkspace = hejingWorkspacesForRelationshipType(workspaces, type)[0];
    restoredGeneratedWorkspaceRef.current = true;
    setSelectedType(type);
    setStatusMessage(null);
    setFailure(null);
    if (nextWorkspace) setSelectedWorkspaceId(nextWorkspace.id);
  }

  function handleSelectWorkspace(workspaceId: string) {
    restoredGeneratedWorkspaceRef.current = true;
    setSelectedWorkspaceId(workspaceId);
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
    const persistenceStatus = await replace_snapshot(outcome.next_space);
    if (persistenceStatus.kind === 'error') {
      setStatusMessage(copy.persistenceFailureStatus);
      return;
    }
    setStatusMessage((outcome.reading.output as MingJingRelationshipMirrorOutput).summary);
  }

  function handleWriteRecord() {
    setStatusMessage(copy.recordStatus);
    window.requestAnimationFrame(() => {
      recordsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function handleChat() {
    setStatusMessage(copy.chatStatus);
  }

  const isFirstRun = state.snapshot.persons.length === 0;

  const overviewActions = (
    <div className="shijing-hejing__hero-actions">
      {hasGeneratedRelationship && methodSupport.supported ? (
        <>
          <button type="button" className="is-primary" onClick={handleGenerateAdvice} disabled={loading}>
            {ICONS.refresh}
            {loading ? copy.generatingAdvice : copy.regenerate}
          </button>
          <button type="button" className="is-ghost" onClick={handleWriteRecord}>
            {ICONS.pencil}
            {copy.writeRecord}
          </button>
          <button type="button" className="is-ghost" onClick={handleChat}>
            {ICONS.chat}
            {copy.chat}
          </button>
        </>
      ) : methodSupport.supported ? (
        <button type="button" className="is-primary" onClick={handleGenerateAdvice} disabled={loading}>
          {loading ? copy.generatingAdvice : copy.generateHejing}
        </button>
      ) : null}
    </div>
  );

  return (
    <section className="shijing-tab shijing-hejing" data-mirror-kind="hejing">
      {isFirstRun ? (
        <HeJingEmptyState onCreate={handleCreateHejing} onSelectExisting={handleCreateHejing} />
      ) : (
        <>
          <div className="shijing-hejing__controls">
            <RelationshipTypeTabs selectedType={selectedType} onSelect={handleSelectRelationshipType} />
            {hasSelectedTypeWorkspaces && workspace ? (
              <div className="shijing-hejing__object-select">
                <span>{copy.selectorTitle}</span>
                <SjpSelect
                  value={workspace.id}
                  aria-label={copy.selectAria}
                  className="shijing-hejing__object-select-trigger"
                  onValueChange={handleSelectWorkspace}
                  options={filteredWorkspaces.map((item) => ({
                    value: item.id,
                    label: item.selectorLabel,
                  }))}
                />
              </div>
            ) : null}
          </div>

          {displayWorkspace ? (
            <>
              <HeJingOverview workspace={displayWorkspace} actions={overviewActions} />

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

              {hasGeneratedRelationship && methodSupport.supported && relationshipOutput ? (
                <>
                  <HeJingFocusSection cards={displayWorkspace.focusCards} />
                  <HeJingRadarSection workspace={displayWorkspace} />
                  <HeJingWindowsSection quarters={displayWorkspace.quarters} />
                  <HeJingWaysSection insights={displayWorkspace.insights} />
                  <HeJingRecordsSection records={displayWorkspace.records} onWrite={handleWriteRecord} rootRef={recordsSectionRef} />
                  <HeJingBasisSection workspace={displayWorkspace} />
                </>
              ) : null}
            </>
          ) : (
            <HeJingRelationshipTypeEmpty
              typeLabel={selectedTypeLabel}
              onCreate={handleCreateHejing}
              onSelectExisting={handleCreateHejing}
            />
          )}

          <footer className="shijing-hejing__footer">
            <p>{displayWorkspace?.disclaimer ?? copy.emptyTypeDisclaimer}</p>
          </footer>
        </>
      )}

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
