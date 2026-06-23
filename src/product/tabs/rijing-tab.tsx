// SJG-ASTRO-04 — RiJing daily mirror screen.
//
// Progressive-disclosure layout (Mirror Architecture v1). Each module reads as
// one takeaway; depth is folded behind explicit toggles so the surface no
// longer lays every detail out flat:
//
//   Header             — "日镜" title + inline date / weekday
//   RiJingHero         — 今日总览: conclusion + energy meter + tendency /
//                        confidence, with the full 解读 (今日基调 + 今日事件解析)
//                        folded behind 展开完整解读
//   RiJingProjections  — 今日关注分镜: lens filter + collapsible concern rows
//   RiJingEventInput   — 今日参照: today's reference events (inline edit /
//                        delete) + composer → upsertEventMemory
//   RiJingActions      — 今日行动: 做一件事 / 说一句话 + 导入到时镜咨询
//   RiJingDataSection  — 推演依据与数据说明: evidence chips + an expandable data
//                        panel that folds in the 资料完整度 readiness signal

import { useEffect, useMemo, useRef, useState } from 'react';

import type { ReadingGenerationFailure } from '../../domain/reading.ts';
import type { RiJingMirrorOutput } from '../../domain/mirror-output.ts';
import type { EventMemory } from '../../domain/event-memory.ts';
import { generateReadingForStorage } from '../reading/generate-and-store.ts';
import { computeCanonicalHash } from '../astrology/canonical-hash.ts';
import { inputsSummaryStaleForSpace } from '../astrology/inputs-summary-expiry.ts';
import { newReadingId } from '../ids/index.ts';
import { latestReadingByMirrorKind } from '../reading/reading-selectors.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import { useProductCopy, type ProductCopy } from '../i18n/copy.ts';
import { classifyMirrorTabState } from './mirror-state.ts';
import { persistenceReadyForAutoGeneration } from './auto-generation-readiness.ts';
import { dailyMirrorScopeForToday } from './mirror-scope-helpers.ts';
import {
  subjectMirrorReadiness,
  type NatalReadiness,
} from '../subjects/natal-readiness.ts';
import type { ShijingSettingsPageId } from '../../contracts/ia-contract.ts';
import type { ShijingSettingsFocusTarget } from '../settings/settings-page-view.tsx';
import type { PersistenceLifecycleStatus } from '../state/persistence-bridge.ts';
import { FailureBanner } from './shared/failure-banner.tsx';
import {
  deriveRiJingActions,
  deriveRiJingDataPanel,
  deriveRiJingHero,
  deriveRiJingReferenceEventRefs,
  type RiJingEmptyStateKind,
  rijingDateLabel,
} from './rijing/rijing-derive.ts';
import { RiJingHero } from './rijing/rijing-hero.tsx';
import { RiJingEventInput } from './rijing/rijing-event-input.tsx';
import { RiJingActions } from './rijing/rijing-actions.tsx';
import { RiJingProjections } from './rijing/rijing-projections.tsx';
import { RiJingDataSection } from './rijing/rijing-evidence.tsx';

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

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
      return {
        label: copy.rijing.emptyActions.runtime_ai_failed,
        onClick: () => onRequestOpenSettings?.('settings', 'ai_model_config'),
      };
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
  if (failure.kind !== 'runtime_ai_failed') return undefined;
  return {
    label: copy.rijing.failureActions.runtimeAi,
    onClick: () => onRequestOpenSettings?.('settings', 'ai_model_config'),
  };
}

export interface RiJingTabProps {
  readonly onRequestOpenSettings?: (
    page?: ShijingSettingsPageId,
    focusTarget?: ShijingSettingsFocusTarget | null,
  ) => void;
}

export function RiJingTab(props: RiJingTabProps) {
  const copy = useProductCopy();
  const { state, dispatch, persistence_status, persistence_client, runtime_ai_client } = useShijingStore();
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<ReadingGenerationFailure | null>(null);

  const activeTags = useMemo(
    () => state.snapshot.concern_tags.filter((t) => t.status === 'active'),
    [state.snapshot.concern_tags],
  );
  const activeTagIds = useMemo(() => activeTags.map((t) => t.id), [activeTags]);
  const today = new Date().toISOString().slice(0, 10);
  const dailyScope = useMemo(() => dailyMirrorScopeForToday(), [today]);
  const referenceEventRefs = useMemo(
    () =>
      deriveRiJingReferenceEventRefs({
        memories: state.snapshot.event_memories,
        scope: dailyScope,
      }),
    [state.snapshot.event_memories, dailyScope],
  );
  const reading = latestReadingByMirrorKind({
    readings: state.snapshot.readings,
    mirror_kind: 'rijing',
  });
  const stale = reading
    ? inputsSummaryStaleForSpace({
        reading,
        space: state.snapshot,
        now: new Date(),
        expected_mirror_scope: dailyScope,
        expected_concern_tag_refs: activeTagIds,
        expected_cited_event_memory_refs: referenceEventRefs,
      })
    : false;
  const currentReading = reading && !stale ? reading : undefined;
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

  const readiness = useMemo(
    () =>
      subjectMirrorReadiness({
        subject: 'self',
        space: state.snapshot,
        mirror_kind: 'rijing',
        mirror_scope: dailyScope,
      }),
    [state.snapshot, dailyScope],
  );

  const autoGenSignature = useMemo(
    () =>
      computeCanonicalHash({
        mirror_scope: dailyScope,
        // Switching the 命理 method must invalidate the auto-gen attempt so the
        // mirror regenerates under the new engine (else stale BaZi data persists).
        method_profile_id: state.snapshot.settings.method_profile_id ?? null,
        self_natal_inputs: state.snapshot.self_subject.natal_inputs,
        active_concern_tags: activeTags.map((tag) => ({
          id: tag.id,
          label: tag.label,
          status: tag.status,
          sort_order: tag.sort_order,
          parsed_topics: tag.parsed_topics,
          mention_refs: tag.mention_refs,
          prompt_text: tag.prompt_text,
        })),
        response_preferences: state.snapshot.settings.response_preferences,
        cited_event_memory_refs: referenceEventRefs,
      }),
    [
      dailyScope,
      state.snapshot.settings.method_profile_id,
      state.snapshot.self_subject.natal_inputs,
      activeTags,
      state.snapshot.settings.response_preferences,
      referenceEventRefs,
    ],
  );
  const autoGenAttemptRef = useRef<string | null>(null);
  const persistenceReady = persistenceReadyForAutoGeneration({
    persistence_status,
    has_persistence_client: persistence_client !== null,
  });

  useEffect(() => {
    if (loading) return;
    if (!persistenceReady) return;
    if (!readiness.ok) return;
    if (activeTagIds.length === 0) return;
    if (currentReading) return;
    if (autoGenAttemptRef.current === autoGenSignature) return;
    autoGenAttemptRef.current = autoGenSignature;
    void handleGenerate();
  }, [loading, persistenceReady, readiness, activeTagIds, currentReading, autoGenSignature]);

  async function handleGenerate() {
    if (loading || !persistenceReady || !readiness.ok || activeTagIds.length === 0) return;
    setLoading(true);
    setFailure(null);
    const outcome = await generateReadingForStorage({
      id: newReadingId(),
      created_at: nowIso(),
      mirror_kind: 'rijing',
      mirror_scope: dailyMirrorScopeForToday(),
      related_person_refs: [],
      concern_tag_refs: activeTagIds,
      cited_event_memory_refs: referenceEventRefs,
      space: state.snapshot,
      deps: { runtime_ai_client },
    });
    setLoading(false);
    if (outcome.ok) {
      dispatch({ type: 'snapshot/replace', snapshot: outcome.next_space });
    } else {
      setFailure(outcome.failure);
    }
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
  const heroEmptyAction =
    currentReading || loading
      ? undefined
      : emptyActionForState(emptyState, props.onRequestOpenSettings, handleGenerate, copy);
  const actions = deriveRiJingActions(
    currentReading,
    copy,
    activeTags.map((t) => ({ id: t.id, label: t.label })),
  );
  const dataPanel = deriveRiJingDataPanel(currentReading, copy);
  const dateLabel = rijingDateLabel(dailyScope.basis_time_zone, copy);
  const runtimeFailureAction =
    tabState.kind === 'failure'
      ? failureActionFor(tabState.failure, props.onRequestOpenSettings, copy)
      : undefined;

  const refreshDisabled = loading || !persistenceReady || activeTagIds.length === 0 || !readiness.ok;
  const refreshAriaLabel = loading
    ? copy.rijing.refreshAria.loading
    : !persistenceReady
      ? persistence_status.kind === 'error'
        ? copy.rijing.refreshAria.persistenceFailed
        : copy.rijing.refreshAria.persistencePending
      : !readiness.ok
        ? copy.rijing.refreshAria.profileIncomplete
        : activeTagIds.length === 0
          ? copy.rijing.refreshAria.missingFocus
          : tabState.kind === 'failure'
            ? copy.rijing.refreshAria.regenerate
            : copy.rijing.refreshAria.refresh;

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
      <header className="shijing-rijing__header">
        <div className="shijing-rijing__title">
          <h1 id="shijing-rijing-heading">{copy.mirrorKindLabels.rijing}</h1>
          <span className="shijing-rijing__date" aria-hidden>
            <span className="shijing-rijing__date-main">{dateLabel.date}</span>
            <span className="shijing-rijing__date-sep" aria-hidden>·</span>
            <span>{dateLabel.weekday}</span>
          </span>
        </div>
      </header>

      {activeTagIds.length === 0 ? (
        <p className="shijing-rijing__empty-tags" role="status">
          {copy.rijing.emptyTagsStatus}
        </p>
      ) : null}

      {tabState.kind === 'loading' ? (
        <p role="status">{copy.rijing.loadingStatus}</p>
      ) : null}
      {tabState.kind === 'failure' ? (
        <FailureBanner failure={tabState.failure} action={runtimeFailureAction} />
      ) : null}
      <RiJingHero
        content={hero}
        refreshDisabled={refreshDisabled}
        refreshAriaLabel={refreshAriaLabel}
        onRefresh={handleGenerate}
        emptyAction={heroEmptyAction}
      />

      <RiJingProjections projections={projections} concernTags={state.snapshot.concern_tags} />

      <RiJingEventInput references={todayReferenceMemories} />

      <RiJingActions
        items={actions}
        importReadingId={tabState.kind === 'ready' ? tabState.reading.id : undefined}
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
