// SJG-ASTRO-04 — RiJing daily mirror screen.
//
// Progressive-disclosure layout (Mirror Architecture v1). Each module reads as
// one takeaway; depth is shown in place so the surface no
// longer lays every detail out flat:
//
//   Header             — "日镜" title + inline date / weekday + primary controls
//   RiJingHero         — 今日总览: conclusion + energy meter + tendency /
//                        confidence, with 今日事件解析 shown directly below
//                        the overview
//   RiJingProjections  — 今日关注分镜: lens filter + collapsible concern rows
//   RiJingEventInput   — 今日参照: today's reference events (inline edit /
//                        delete) + composer → upsertEventMemory
//   RiJingActions      — 今日行动: one action card per concern
//   RiJingDataSection  — 推演依据与数据说明: evidence chips + an expandable data
//                        panel that folds in the 资料完整度 readiness signal

import { useEffect, useMemo } from 'react';

import type { ReadingGenerationFailure } from '../../domain/reading.ts';
import type { RiJingMirrorOutput } from '../../domain/mirror-output.ts';
import type { EventMemory } from '../../domain/event-memory.ts';
import { useRiJingGeneration } from '../daily-rijing/rijing-generation-provider.tsx';
import { planRiJing } from '../reading/rijing-plan.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import { useProductCopy, type ProductCopy } from '../i18n/copy.ts';
import { classifyMirrorTabState } from './mirror-state.ts';
import {
  persistenceReadyForAutoGeneration,
  persistenceReadyForManualGeneration,
} from './auto-generation-readiness.ts';
import { dailyMirrorScopeForToday } from './mirror-scope-helpers.ts';
import type { NatalReadiness } from '../subjects/natal-readiness.ts';
import type { ShijingSettingsPageId } from '../../contracts/ia-contract.ts';
import type { ShijingSettingsFocusTarget } from '../settings/settings-page-view.tsx';
import type { PersistenceLifecycleStatus } from '../state/persistence-bridge.ts';
import { FailureBanner } from './shared/failure-banner.tsx';
import { GeneratingButton } from './shared/generating-button.tsx';
import { ImportToShiJingButton } from './shared/import-to-shijing-button.tsx';
import { MirrorPageHeader } from './shared/mirror-page-header.tsx';
import {
  isMethodFeatureUnsupportedFailure,
} from './shared/reading-failure-copy.ts';
import {
  deriveRiJingActions,
  deriveRiJingDataPanel,
  deriveRiJingHero,
  deriveRiJingReferenceEventRefs,
  type RiJingEmptyStateKind,
  rijingDateLabel,
} from './rijing/rijing-derive.ts';
import { deriveRiJingDailyAlmanac } from './rijing/rijing-daily-almanac.ts';
import { RiJingHero } from './rijing/rijing-hero.tsx';
import { RiJingEventInput } from './rijing/rijing-event-input.tsx';
import { RiJingActions } from './rijing/rijing-actions.tsx';
import { RiJingProjections } from './rijing/rijing-projections.tsx';
import { RiJingDataSection } from './rijing/rijing-evidence.tsx';

function deriveRiJingEmptyState(input: {
  readonly hasReading: boolean;
  readonly failure: ReadingGenerationFailure | null;
  readonly persistenceStatus: PersistenceLifecycleStatus;
  readonly persistenceReady: boolean;
  readonly readiness: NatalReadiness;
  readonly activeTagCount: number;
}): RiJingEmptyStateKind {
  if (input.hasReading) return 'ready_to_generate';
  if (input.failure?.kind === 'runtime_ai_failed') return 'runtime_ai_failed';
  if (input.persistenceStatus.kind === 'error') return 'persistence_failed';
  if (!input.persistenceReady) return 'persistence_pending';
  if (!input.readiness.ok) return 'profile_incomplete';
  if (input.activeTagCount === 0) return 'missing_focus';
  return 'ready_to_generate';
}

function emptyActionForState(
  state: RiJingEmptyStateKind,
  onRequestOpenSettings: RiJingTabProps['onRequestOpenSettings'],
  onGenerate: () => void,
  copy: ProductCopy,
):
  | {
      readonly label: string;
      readonly onClick: () => void;
    }
  | undefined {
  switch (state) {
    case 'profile_incomplete':
      return {
        label: copy.rijing.emptyActions.profile_incomplete,
        onClick: () => onRequestOpenSettings?.('profile', 'self_profile_editor'),
      };
    case 'missing_focus':
      return {
        label: copy.rijing.emptyActions.missing_focus,
        onClick: () => onRequestOpenSettings?.('concerns'),
      };
    case 'runtime_ai_failed':
      return undefined;
    case 'persistence_failed':
      return {
        label: copy.rijing.emptyActions.persistence_failed,
        onClick: () => onRequestOpenSettings?.('settings', 'privacy_local_data'),
      };
    case 'ready_to_generate':
      return {
        label: copy.rijing.emptyActions.ready_to_generate,
        onClick: onGenerate,
      };
    case 'persistence_pending':
      return undefined;
  }
}

function failureActionFor(
  failure: ReadingGenerationFailure,
  onRequestOpenSettings: RiJingTabProps['onRequestOpenSettings'],
  copy: ProductCopy,
):
  | {
      readonly label: string;
      readonly onClick: () => void;
    }
  | undefined {
  if (isMethodFeatureUnsupportedFailure(failure)) {
    return {
      label: copy.rijing.failureActions.methodProfile,
      onClick: () => onRequestOpenSettings?.('settings', 'method_profile'),
    };
  }
  return undefined;
}

export interface RiJingTabProps {
  readonly onRequestOpenSettings?: (
    page?: ShijingSettingsPageId,
    focusTarget?: ShijingSettingsFocusTarget | null,
  ) => void;
}

export function RiJingTab(props: RiJingTabProps) {
  const copy = useProductCopy();
  const { state, persistence_status, persistence_client } = useShijingStore();
  const generation = useRiJingGeneration();

  const activeTags = useMemo(
    () => state.snapshot.concern_tags.filter((t) => t.status === 'active'),
    [state.snapshot.concern_tags],
  );
  const today = dailyMirrorScopeForToday().date;
  // The same plan the in-app RiJing generation entry uses, so the page and
  // the daily run agree on whether today's Reading is current.
  const plan = useMemo(() => planRiJing(state.snapshot, new Date()), [state.snapshot, today]);
  const dailyScope = plan.scope;
  const activeTagIds = plan.active_tag_ids;
  const referenceEventRefs = plan.reference_event_refs;
  const readiness = plan.readiness;
  const currentReading = plan.current_reading;
  const loading = generation.status.kind === 'generating';
  const dailyRiJing = state.snapshot.settings.daily_rijing;
  const dailyNote = dailyRiJing?.enabled && !plan.has_reading_today && !loading
    ? copy.dailyRiJing.pageNote(dailyRiJing.time)
    : null;
  const failure: ReadingGenerationFailure | null =
    generation.status.kind === 'failed' && generation.status.signature === plan.signature
      ? generation.status.failure
      : null;
  const tabState = useMemo(
    () =>
      classifyMirrorTabState({
        ...(currentReading ? { reading: currentReading } : {}),
        ...(failure ? { failure } : {}),
        loading,
        stale: false,
      }),
    [currentReading, failure, loading],
  );

  const persistenceReady = persistenceReadyForAutoGeneration({
    persistence_status,
    has_persistence_client: persistence_client !== null,
  });
  const manualPersistenceReady = persistenceReadyForManualGeneration({
    persistence_status,
    has_persistence_client: persistence_client !== null,
  });
  const saveFailed = generation.status.kind === 'save_failed' && generation.status.signature === plan.signature;
  const manualGenerationReady = manualPersistenceReady && readiness.ok && activeTagIds.length > 0;

  // Opening RiJing generates or refreshes today's Reading once per set of
  // inputs; the generation entry skips it when a current Reading exists, when
  // daily RiJing is on and today has no Reading yet, when these inputs were
  // already attempted, or while another generation runs.
  const requestGeneration = generation.request;
  useEffect(() => {
    if (!persistenceReady || !readiness.ok || activeTagIds.length === 0 || currentReading) return;
    void requestGeneration('page');
  }, [requestGeneration, persistenceReady, readiness.ok, activeTagIds.length, currentReading, plan.signature]);

  function handleGenerate() {
    if (loading || !manualGenerationReady) return;
    void requestGeneration('manual');
  }

  const emptyState = deriveRiJingEmptyState({
    hasReading: currentReading !== undefined,
    failure,
    persistenceStatus: persistence_status,
    persistenceReady,
    readiness,
    activeTagCount: activeTagIds.length,
  });
  const heroReferenceMemories = useMemo(() => {
    const refs = new Set(currentReading?.cited_event_memory_refs ?? referenceEventRefs);
    return state.snapshot.event_memories.filter((memory) => refs.has(memory.id));
  }, [currentReading, referenceEventRefs, state.snapshot.event_memories]);
  // All of today's RiJing-sourced reference events (newest first), shown in
  // 今日参照 with inline edit/delete.
  const todayReferenceMemories = useMemo(() => {
    const refs = deriveRiJingReferenceEventRefs({
      memories: state.snapshot.event_memories,
      scope: dailyScope,
      limit: Number.MAX_SAFE_INTEGER,
    });
    const byId = new Map(state.snapshot.event_memories.map((memory) => [memory.id, memory]));
    return refs
      .map((ref) => byId.get(ref))
      .filter((memory): memory is EventMemory => memory !== undefined);
  }, [state.snapshot.event_memories, dailyScope]);
  const hero = deriveRiJingHero(currentReading, {
    empty_state: emptyState,
    copy,
    focus_tags: activeTags.map((tag) => ({ id: tag.id, label: tag.label })),
    reference_memories: heroReferenceMemories,
  });
  const dailyAlmanac = deriveRiJingDailyAlmanac(dailyScope.date);
  const heroEmptyAction =
    currentReading || loading
      ? undefined
      : saveFailed && manualGenerationReady
        ? { label: copy.rijing.refreshAria.regenerate, onClick: handleGenerate }
        : emptyActionForState(emptyState, props.onRequestOpenSettings, handleGenerate, copy);
  const actions = deriveRiJingActions(
    currentReading,
    activeTags.map((t) => ({ id: t.id, label: t.label })),
  );
  const dataPanel = deriveRiJingDataPanel(currentReading, copy);
  const dateLabel = rijingDateLabel(dailyScope.basis_time_zone, copy);
  const failureAction =
    tabState.kind === 'failure'
      ? failureActionFor(tabState.failure, props.onRequestOpenSettings, copy)
      : undefined;

  const refreshDisabled = loading || !manualGenerationReady;
  const refreshAriaLabel = loading
    ? copy.rijing.refreshAria.loading
    : !manualPersistenceReady
      ? persistence_status.kind === 'error'
        ? copy.rijing.refreshAria.persistenceFailed
        : copy.rijing.refreshAria.persistencePending
      : !readiness.ok
        ? copy.rijing.refreshAria.profileIncomplete
        : activeTagIds.length === 0
          ? copy.rijing.refreshAria.missingFocus
          : tabState.kind === 'failure' || saveFailed
            ? copy.rijing.refreshAria.regenerate
            : copy.rijing.refreshAria.refresh;
  const refreshButtonLabel = loading
    ? copy.rijing.refreshAria.loading
    : tabState.kind === 'failure' || saveFailed
      ? copy.rijing.refreshAria.regenerate
      : currentReading
        ? copy.rijing.refreshAria.refresh
        : copy.rijing.emptyActions.ready_to_generate;
  const importableReadingId = tabState.kind === 'ready' ? tabState.reading.id : null;

  const projections =
    tabState.kind === 'ready' && tabState.reading.output.mirror_kind === 'rijing'
      ? (tabState.reading.output as RiJingMirrorOutput).concern_projections
      : [];

  return (
    <section
      className="shijing-tab shijing-rijing"
      data-mirror-kind="rijing"
      aria-label={copy.mirrorKindLabels.rijing}
    >
      <MirrorPageHeader
        title={copy.mirrorKindLabels.rijing}
        headingId="shijing-rijing-heading"
        metaAriaHidden
        meta={(
          <>
            <span className="shijing-rijing__date-main">{dateLabel.date}</span>
            <span className="shijing-rijing__date-sep" aria-hidden>·</span>
            <span>{dateLabel.weekday}</span>
          </>
        )}
        actions={(
          <>
            {importableReadingId ? <ImportToShiJingButton readingId={importableReadingId} /> : null}
            <GeneratingButton
              className="shijing-rijing__generate"
              disabled={refreshDisabled}
              busy={loading}
              busyLabel={copy.rijing.refreshAria.loading}
              onClick={handleGenerate}
              aria-label={refreshAriaLabel}
            >
              {refreshButtonLabel}
            </GeneratingButton>
          </>
        )}
      />

      {activeTagIds.length === 0 ? (
        <div className="shijing-rijing__empty-tags" role="status" aria-live="polite">
          <div>
            <strong className="shijing-rijing__empty-tags-title">
              {copy.rijing.emptyTagsTitle}
            </strong>
            <p>{copy.rijing.emptyTagsStatus}</p>
          </div>
          <button
            type="button"
            className="shijing-rijing__empty-tags-action"
            onClick={() => props.onRequestOpenSettings?.('concerns')}
          >
            {copy.rijing.emptyTagsAction}
          </button>
        </div>
      ) : null}

      {tabState.kind === 'loading' ? (
        <p role="status">{copy.rijing.loadingStatus}</p>
      ) : null}
      {dailyNote ? <p role="status">{dailyNote}</p> : null}
      {tabState.kind === 'failure' ? (
        <FailureBanner failure={tabState.failure} action={failureAction} onRetry={handleGenerate} />
      ) : null}
      <RiJingHero
        content={hero}
        dailyAlmanac={dailyAlmanac}
        emptyAction={heroEmptyAction}
      />

      <RiJingProjections projections={projections} concernTags={state.snapshot.concern_tags} />

      <RiJingEventInput references={todayReferenceMemories} />

      <RiJingActions
        groups={actions}
        concernTags={state.snapshot.concern_tags}
      />

      <RiJingDataSection
        panel={dataPanel}
        readiness={readiness}
        onCompleteProfile={() => props.onRequestOpenSettings?.('profile', 'self_profile_editor')}
        disabled={!currentReading}
      />
    </section>
  );
}
