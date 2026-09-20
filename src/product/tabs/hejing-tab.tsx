// HeJing (合镜) workbench — pattern-reading redesign.
import { useEffect, useMemo, useRef, useState } from 'react';

import { ConfirmDialog, nimiToast } from '@nimiplatform/kit/ui';
import { DEFAULT_METHOD_PROFILE_ID } from '../../domain/algorithm.ts';
import type { EventMemory } from '../../domain/event-memory.ts';
import { isMingJingRelationshipMirrorOutput } from '../../domain/mirror-output.ts';
import type { Person } from '../../domain/person.ts';
import type { ReadingGenerationFailure } from '../../domain/reading.ts';
import { inputsSummaryExpired } from '../astrology/inputs-summary-expiry.ts';
import { AddPersonDialog } from '../persons/person-editor.tsx';
import { SjpSelect } from '../components/sjp-select.tsx';
import { newReadingId } from '../ids/index.ts';
import { deleteEventMemory } from '../memories/memory-editor-state.ts';
import { METHOD_LABELS } from '../reading/reading-format.ts';
import { generateReadingForStorage } from '../reading/generate-and-store.ts';
import { latestMingJingRelationshipReading } from '../reading/reading-selectors.ts';
import { persistenceWriteSucceeded } from '../state/persistence-bridge.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import { relationshipNatalMirrorScopeForToday } from './mirror-scope-helpers.ts';
import { FailureBanner } from './shared/failure-banner.tsx';
import { ImportToShiJingButton } from './shared/import-to-shijing-button.tsx';
import { HeJingRelationshipTypeEmpty } from './hejing/hejing-empty-state.tsx';
import { HeJingImmersiveEmpty } from './hejing/hejing-immersive-empty.tsx';
import { HeJingPendingView } from './hejing/hejing-pending.tsx';
import { HeJingRecordDialog } from './hejing/hejing-record-dialog.tsx';
import {
  HeJingActionSection,
  HeJingOverviewSection,
  HeJingPatternsSection,
  HeJingRecentSection,
  HeJingTrackView,
  ICONS,
} from './hejing/hejing-sections.tsx';
import {
  HEJING_PAGE_COPY,
  HEJING_RELATIONSHIP_TYPES,
  buildHeJingWorkspaceFromPerson,
  hejingMethodSupportState,
  hejingPatternSupportState,
  hejingRelationshipTypeForPerson,
  hejingTrackRecords,
  hejingWorkspaceIdForPerson,
  hejingWorkspacesForRelationshipType,
  initialHeJingWorkspaceIdFromReadings,
  type HeJingRelationshipType,
  type HeJingTrackRecord,
} from './hejing/hejing-model.ts';

const copy = HEJING_PAGE_COPY;

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

type HeJingView = 'reading' | 'track';

// @nimi-authority: rule.shijing.ia.r009
export function HeJingTab() {
  const { state, replace_snapshot, runtime_ai_client } = useShijingStore();
  const currentMethodProfileId = state.snapshot.settings.method_profile_id ?? DEFAULT_METHOD_PROFILE_ID;
  // Workspaces come from real Persons only — sample workspaces live exclusively
  // in `src/product/dev/` fixtures.
  const workspaces = useMemo(
    () => state.snapshot.persons.map(buildHeJingWorkspaceFromPerson),
    [state.snapshot.persons],
  );
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
    () => workspaces.find((item) => item.id === selectedWorkspaceId) ?? workspaces[0] ?? null,
    [selectedWorkspaceId, workspaces],
  );
  const [selectedType, setSelectedType] = useState<HeJingRelationshipType>(
    initialWorkspace?.selectedRelationshipType ?? 'partner',
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
  const [view, setView] = useState<HeJingView>('reading');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<ReadingGenerationFailure | null>(null);
  const [addPersonOpen, setAddPersonOpen] = useState(false);
  const [recordDialog, setRecordDialog] = useState<{ open: boolean; editing: EventMemory | null }>({
    open: false,
    editing: null,
  });
  const [confirmingDelete, setConfirmingDelete] = useState<HeJingTrackRecord | null>(null);
  const methodSupport = useMemo(
    () => hejingMethodSupportState(currentMethodProfileId),
    [currentMethodProfileId],
  );
  const patternSupport = useMemo(
    () => hejingPatternSupportState(currentMethodProfileId),
    [currentMethodProfileId],
  );
  const selectedPersonRef = workspace?.personRef ?? null;
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
  const relationshipOutput =
    relationshipReading && isMingJingRelationshipMirrorOutput(relationshipReading.output)
      ? relationshipReading.output
      : null;
  const hasGeneratedRelationship = Boolean(relationshipOutput);
  const readingStale = useMemo(
    () => (relationshipReading ? inputsSummaryExpired(relationshipReading, new Date()) : false),
    [relationshipReading],
  );
  const cachedWorkspaceId = useMemo(
    () =>
      initialHeJingWorkspaceIdFromReadings({
        workspaces,
        readings: state.snapshot.readings,
        method_profile_id: currentMethodProfileId,
      }),
    [workspaces, state.snapshot.readings, currentMethodProfileId],
  );
  const trackRecords = useMemo(
    () => (selectedPersonRef ? hejingTrackRecords(state.snapshot, selectedPersonRef) : []),
    [state.snapshot, selectedPersonRef],
  );
  const methodLabel = METHOD_LABELS[currentMethodProfileId];
  const statusText = (() => {
    if (!relationshipReading || !relationshipOutput) return copy.statusPending;
    if (readingStale) return copy.statusStale;
    return copy.statusGenerated(
      relationshipOutput.relationship_subject.anchor_year,
      relationshipReading.created_at.slice(0, 10),
    );
  })();

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
    if (!selectedPersonRef) return;
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
    if (!persistenceWriteSucceeded(persistenceStatus)) {
      nimiToast.danger(copy.persistenceFailureStatus);
      return;
    }
    setView('reading');
    setStatusMessage(copy.generatedStatus);
  }

  function openRecordDialog(editing: EventMemory | null = null) {
    setRecordDialog({ open: true, editing });
  }

  function handleEditTrackRecord(record: HeJingTrackRecord) {
    const memory = state.snapshot.event_memories.find((item) => item.id === record.id);
    if (memory) openRecordDialog(memory);
  }

  async function handleConfirmDelete() {
    const record = confirmingDelete;
    if (!record) return;
    const outcome = deleteEventMemory(state.snapshot, record.id);
    if (!outcome.ok) {
      nimiToast.danger(copy.recordDeleteError);
      setConfirmingDelete(null);
      return;
    }
    const persistenceStatus = await replace_snapshot(outcome.next_space);
    if (!persistenceWriteSucceeded(persistenceStatus)) {
      nimiToast.danger(copy.recordDeleteError);
      return;
    }
    nimiToast.success(copy.recordDeletedToast);
    setConfirmingDelete(null);
  }

  const isFirstRun = state.snapshot.persons.length === 0;
  const canGenerate = methodSupport.supported && patternSupport.supported;

  return (
    <section
      className={isFirstRun ? 'shijing-hejing' : 'shijing-tab shijing-hejing'}
      data-mirror-kind="hejing"
    >
      {isFirstRun ? (
        <HeJingImmersiveEmpty onCreate={handleCreateHejing} />
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

          {workspace ? (
            <>
              <div className="shijing-hejing__toolbar">
                <div className="shijing-hejing__toolbar-meta">
                  <strong className="shijing-hejing__toolbar-name">{workspace.displayName}</strong>
                  {workspace.relationLabel ? (
                    <span className="shijing-hejing__toolbar-relation">{workspace.relationLabel}</span>
                  ) : null}
                  <span className="shijing-hejing__toolbar-method">
                    {copy.methodLabel} · {methodLabel}
                  </span>
                  <span
                    className="shijing-hejing__toolbar-status"
                    data-state={relationshipOutput ? (readingStale ? 'stale' : 'generated') : 'pending'}
                  >
                    {statusText}
                  </span>
                </div>
                <div className="shijing-hejing__toolbar-actions">
                  {hasGeneratedRelationship && canGenerate ? (
                    <button type="button" className="is-ghost" onClick={handleGenerateAdvice} disabled={loading}>
                      {ICONS.refresh}
                      {loading ? copy.generatingAdvice : copy.regenerate}
                    </button>
                  ) : null}
                  <button type="button" className="is-ghost" onClick={() => openRecordDialog()}>
                    {ICONS.pencil}
                    {copy.recordEntry}
                  </button>
                  {relationshipReading && !readingStale ? (
                    <ImportToShiJingButton readingId={relationshipReading.id} />
                  ) : null}
                  <div className="shijing-hejing__view-switch" role="group" aria-label={copy.viewSwitchAria}>
                    <button
                      type="button"
                      data-active={view === 'reading' ? '' : undefined}
                      onClick={() => setView('reading')}
                    >
                      {copy.viewReading}
                    </button>
                    <button
                      type="button"
                      data-active={view === 'track' ? '' : undefined}
                      onClick={() => setView('track')}
                    >
                      {copy.viewTrack}
                    </button>
                  </div>
                </div>
              </div>

              {view === 'reading' ? (
                <>
                  {statusMessage ? (
                    <p className="shijing-hejing__status" role="status">
                      {statusMessage}
                    </p>
                  ) : null}
                  {failure ? <FailureBanner failure={failure} /> : null}
                  {failure?.kind === 'patterns_unavailable' ? (
                    <p className="shijing-hejing__failure-guidance">{copy.patternFailureGuidance}</p>
                  ) : null}
                  {!methodSupport.supported ? (
                    <div className="shijing-hejing__unsupported" role="status">
                      <strong>{copy.unsupportedMethodTitle}</strong>
                      <p>{copy.unsupportedMethodBody}</p>
                      {methodSupport.detail ? <code>{methodSupport.detail}</code> : null}
                    </div>
                  ) : null}

                  {hasGeneratedRelationship && relationshipOutput ? (
                    <>
                      <HeJingOverviewSection
                        output={relationshipOutput}
                        recentAvailable={relationshipOutput.recent_status.availability === 'available'}
                      />
                      <HeJingPatternsSection
                        patterns={relationshipOutput.patterns}
                        relatedName={workspace.displayName}
                        methodLabel={methodLabel}
                        onRecord={() => openRecordDialog()}
                      />
                      {relationshipOutput.recent_status.availability === 'available' ? (
                        <HeJingRecentSection window={relationshipOutput.recent_status.window} />
                      ) : null}
                      <HeJingActionSection action={relationshipOutput.action} />
                    </>
                  ) : (
                    <HeJingPendingView
                      workspace={workspace}
                      canGenerate={canGenerate}
                      patternSupported={patternSupport.supported}
                      loading={loading}
                      onGenerate={handleGenerateAdvice}
                    />
                  )}
                </>
              ) : (
                <HeJingTrackView
                  records={trackRecords}
                  onRecord={() => openRecordDialog()}
                  onEdit={handleEditTrackRecord}
                  onDelete={setConfirmingDelete}
                />
              )}
            </>
          ) : (
            <HeJingRelationshipTypeEmpty
              typeLabel={selectedTypeLabel}
              onCreate={handleCreateHejing}
              onSelectExisting={handleCreateHejing}
            />
          )}

          <footer className="shijing-hejing__footer">
            <p>{workspace?.disclaimer ?? copy.emptyTypeDisclaimer}</p>
          </footer>
        </>
      )}

      <AddPersonDialog
        open={addPersonOpen}
        title={copy.addPersonDialogTitle}
        onClose={() => setAddPersonOpen(false)}
        onSavedPerson={handleRelationshipPersonSaved}
      />

      {selectedPersonRef && workspace ? (
        <HeJingRecordDialog
          open={recordDialog.open}
          personRef={selectedPersonRef}
          personDisplayName={workspace.displayName}
          editing={recordDialog.editing}
          onClose={() => setRecordDialog({ open: false, editing: null })}
        />
      ) : null}

      <ConfirmDialog
        open={confirmingDelete !== null}
        title={copy.trackDeleteConfirmTitle}
        message={confirmingDelete ? copy.trackDeleteConfirmMessage(confirmingDelete.body) : ''}
        confirmLabel={copy.trackDeleteConfirmLabel}
        cancelLabel={copy.trackDeleteCancelLabel}
        confirmTone="danger"
        onConfirm={() => void handleConfirmDelete()}
        onClose={() => setConfirmingDelete(null)}
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
