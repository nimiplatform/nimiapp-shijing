// SJG-ASTRO-04 — RiJing daily mirror screen.
//
// Restores the rich Today/RiJing visual experience that the W05 cutover
// temporarily collapsed into a minimal head + memory form. The pieces
// here all hang off the new Mirror Architecture v1 contracts:
//
//   Header                — "日镜" title + inline date / weekday
//   RiJingHero            — conclusion / keywords / leanings / reminder
//                           with an icon-only refresh control and an
//                           embedded "今日参考的事件" footer (edit +
//                           delete with kit ConfirmDialog)
//   RiJingReadinessNotice — 资料完整度 info card (subjectMirrorReadiness)
//   RiJingEventInput      — "今天有特别的事情吗？" → upsertEventMemory
//   RiJingProjections     — concern-tag projection grid (one card per
//                           active tag)
//   ImportToShiJingButton — quick action: ask 时镜 about this reading
//   RiJingEvidenceRow     — collapsible wrapping CitationDrawer

import { useEffect, useMemo, useRef, useState } from 'react';

import type { ReadingGenerationFailure } from '../../domain/reading.ts';
import type { RiJingMirrorOutput } from '../../domain/mirror-output.ts';
import { generateReadingForStorage } from '../reading/generate-and-store.ts';
import { computeCanonicalHash } from '../astrology/canonical-hash.ts';
import { inputsSummaryStaleForSpace } from '../astrology/inputs-summary-expiry.ts';
import { newReadingId } from '../ids/index.ts';
import { latestReadingByMirrorKind } from '../reading/reading-selectors.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import { MIRROR_KIND_LABELS } from '../i18n/copy.ts';
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
import { CitationDrawer } from './shared/citation-drawer.tsx';
import { ImportToShiJingButton } from './shared/import-to-shijing-button.tsx';
import { FailureBanner } from './shared/failure-banner.tsx';
import {
  deriveEvidenceChips,
  deriveRiJingActions,
  deriveRiJingHero,
  type RiJingEmptyStateKind,
  rijingDateLabel,
} from './rijing/rijing-derive.ts';
import { RiJingHero } from './rijing/rijing-hero.tsx';
import { RiJingReadinessNotice } from './rijing/rijing-readiness.tsx';
import { RiJingEventInput } from './rijing/rijing-event-input.tsx';
import { RiJingActions } from './rijing/rijing-actions.tsx';
import { RiJingProjections } from './rijing/rijing-projections.tsx';
import { RiJingEvidenceRow } from './rijing/rijing-evidence.tsx';

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
):
  | {
      readonly label: string;
      readonly onClick: () => void;
    }
  | undefined {
  switch (state) {
    case 'profile_incomplete':
      return {
        label: '完善资料',
        onClick: () => onRequestOpenSettings?.('profile', 'self_profile_editor'),
      };
    case 'missing_focus':
      return {
        label: '管理关注',
        onClick: () => onRequestOpenSettings?.('concerns'),
      };
    case 'runtime_ai_failed':
      return {
        label: '配置 AI 模型',
        onClick: () => onRequestOpenSettings?.('settings', 'ai_model_config'),
      };
    case 'persistence_failed':
      return {
        label: '管理本地数据',
        onClick: () => onRequestOpenSettings?.('settings', 'privacy_local_data'),
      };
    case 'ready_to_generate':
      return {
        label: '生成今日日镜',
        onClick: onGenerate,
      };
    case 'persistence_pending':
      return undefined;
  }
}

function failureActionFor(
  failure: ReadingGenerationFailure,
  onRequestOpenSettings: RiJingTabProps['onRequestOpenSettings'],
):
  | {
      readonly label: string;
      readonly onClick: () => void;
    }
  | undefined {
  if (failure.kind !== 'runtime_ai_failed') return undefined;
  return {
    label: '配置 AI 模型',
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
      }),
    [
      dailyScope,
      state.snapshot.settings.method_profile_id,
      state.snapshot.self_subject.natal_inputs,
      activeTags,
      state.snapshot.settings.response_preferences,
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
  const hero = deriveRiJingHero(currentReading, { empty_state: emptyState });
  const heroEmptyAction =
    currentReading || loading ? undefined : emptyActionForState(emptyState, props.onRequestOpenSettings, handleGenerate);
  const actions = deriveRiJingActions(currentReading);
  const evidenceChips = deriveEvidenceChips(currentReading);
  const dateLabel = rijingDateLabel(dailyScope.basis_time_zone);
  const runtimeFailureAction =
    tabState.kind === 'failure'
      ? failureActionFor(tabState.failure, props.onRequestOpenSettings)
      : undefined;

  const refreshDisabled = loading || !persistenceReady || activeTagIds.length === 0 || !readiness.ok;
  const refreshAriaLabel = loading
    ? '生成中…'
    : !persistenceReady
      ? persistence_status.kind === 'error'
        ? '本地数据读写失败,请先在设置中处理'
        : '本地数据加载中,暂不能生成今日'
      : !readiness.ok
        ? '资料还不足以生成今日'
        : activeTagIds.length === 0
          ? '请先在「设置 → 关注标签」中激活至少一个关注'
          : tabState.kind === 'failure'
            ? '重新生成今日'
            : '刷新今日';

  const projections =
    tabState.kind === 'ready' && tabState.reading.output.mirror_kind === 'rijing'
      ? (tabState.reading.output as RiJingMirrorOutput).concern_projections
      : [];

  return (
    <section
      className="shijing-tab shijing-rijing"
      data-mirror-kind="rijing"
      aria-label={MIRROR_KIND_LABELS.rijing}
    >
      <header className="shijing-rijing__header">
        <div className="shijing-rijing__title">
          <h1 id="shijing-rijing-heading">{MIRROR_KIND_LABELS.rijing}</h1>
          <span className="shijing-rijing__date" aria-hidden>
            <span className="shijing-rijing__date-main">{dateLabel.date}</span>
            <span className="shijing-rijing__date-sep" aria-hidden>·</span>
            <span>{dateLabel.weekday}</span>
          </span>
        </div>
      </header>

      {activeTagIds.length === 0 ? (
        <p className="shijing-rijing__empty-tags" role="status">
          请先在「设置 → 关注标签」中激活至少一个关注，今日才能围绕你正在意的事生成。
        </p>
      ) : null}

      {tabState.kind === 'loading' ? (
        <p role="status">正在生成今日日镜…</p>
      ) : null}
      {tabState.kind === 'failure' ? (
        <FailureBanner failure={tabState.failure} action={runtimeFailureAction} />
      ) : null}
      <RiJingHero
        content={hero}
        refreshDisabled={refreshDisabled}
        refreshAriaLabel={refreshAriaLabel}
        onRefresh={handleGenerate}
        focusTags={activeTags.map((t) => ({ id: t.id, label: t.label }))}
        onManageFocus={() => props.onRequestOpenSettings?.('concerns')}
        emptyAction={heroEmptyAction}
      />

      <RiJingReadinessNotice
        readiness={readiness}
        onRequestOpenSettings={() => props.onRequestOpenSettings?.('profile', 'self_profile_editor')}
      />

      <RiJingEventInput />

      <RiJingActions items={actions} />

      <RiJingProjections projections={projections} concernTags={state.snapshot.concern_tags} />

      {tabState.kind === 'ready' ? (
        <div className="shijing-rijing__quick-actions">
          <ImportToShiJingButton readingId={tabState.reading.id} />
        </div>
      ) : null}

      <RiJingEvidenceRow chips={evidenceChips} disabled={!currentReading}>
        {currentReading ? <CitationDrawer reading={currentReading} /> : null}
      </RiJingEvidenceRow>
    </section>
  );
}
