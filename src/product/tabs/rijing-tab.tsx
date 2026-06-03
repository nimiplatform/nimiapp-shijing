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

import { useMemo, useState } from 'react';

import type { ReadingGenerationFailure } from '../../domain/reading.ts';
import type { RiJingMirrorOutput } from '../../domain/mirror-output.ts';
import { generateReadingForStorage } from '../reading/generate-and-store.ts';
import { inputsSummaryExpired } from '../astrology/inputs-summary-expiry.ts';
import { newReadingId } from '../ids/index.ts';
import { latestReadingByMirrorKind } from '../reading/reading-selectors.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import { MIRROR_KIND_LABELS } from '../i18n/copy.ts';
import { classifyMirrorTabState } from './mirror-state.ts';
import { dailyMirrorScopeForToday } from './mirror-scope-helpers.ts';
import { subjectMirrorReadiness } from '../subjects/natal-readiness.ts';
import type { ShijingSettingsPageId } from '../../contracts/ia-contract.ts';
import { CitationDrawer } from './shared/citation-drawer.tsx';
import { ImportToShiJingButton } from './shared/import-to-shijing-button.tsx';
import { FailureBanner } from './shared/failure-banner.tsx';
import {
  deriveEvidenceChips,
  deriveRiJingActions,
  deriveRiJingHero,
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

export interface RiJingTabProps {
  readonly onRequestOpenSettings?: (page?: ShijingSettingsPageId) => void;
}

export function RiJingTab(props: RiJingTabProps) {
  const { state, dispatch, runtime_ai_client } = useShijingStore();
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<ReadingGenerationFailure | null>(null);

  const reading = latestReadingByMirrorKind({
    readings: state.snapshot.readings,
    mirror_kind: 'rijing',
  });
  const stale = reading ? inputsSummaryExpired(reading, new Date()) : false;
  const tabState = useMemo(
    () =>
      classifyMirrorTabState({
        ...(reading ? { reading } : {}),
        ...(failure ? { failure } : {}),
        loading,
        stale,
      }),
    [reading, failure, loading, stale],
  );

  const activeTags = state.snapshot.concern_tags.filter((t) => t.status === 'active');
  const activeTagIds = activeTags.map((t) => t.id);

  const dailyScope = useMemo(() => dailyMirrorScopeForToday(), []);
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

  const hero = deriveRiJingHero(reading);
  const actions = deriveRiJingActions(reading);
  const evidenceChips = deriveEvidenceChips(reading);
  const dateLabel = rijingDateLabel(dailyScope.basis_time_zone);

  async function handleGenerate() {
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

  const refreshDisabled = loading || activeTagIds.length === 0 || !readiness.ok;
  const refreshAriaLabel = loading
    ? '生成中…'
    : activeTagIds.length === 0
      ? '请先在「设置 → 关注标签」中激活至少一个关注'
      : !readiness.ok
        ? '资料还不足以生成今日'
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
      {tabState.kind === 'failure' ? <FailureBanner failure={tabState.failure} /> : null}
      {tabState.kind === 'ready' && tabState.stale ? (
        <p role="alert" className="shijing-rijing__stale">
          当前日镜已超过 24 小时,建议重新生成。
        </p>
      ) : null}

      <RiJingHero
        content={hero}
        refreshDisabled={refreshDisabled}
        refreshAriaLabel={refreshAriaLabel}
        onRefresh={handleGenerate}
        focusTags={activeTags.map((t) => ({ id: t.id, label: t.label }))}
        onManageFocus={() => props.onRequestOpenSettings?.('concerns')}
      />

      <RiJingReadinessNotice
        readiness={readiness}
        onRequestOpenSettings={() => props.onRequestOpenSettings?.()}
      />

      <RiJingEventInput />

      <RiJingActions items={actions} />

      <RiJingProjections projections={projections} concernTags={state.snapshot.concern_tags} />

      {tabState.kind === 'ready' ? (
        <div className="shijing-rijing__quick-actions">
          <ImportToShiJingButton readingId={tabState.reading.id} />
        </div>
      ) : null}

      <RiJingEvidenceRow chips={evidenceChips} disabled={!reading}>
        {reading ? <CitationDrawer reading={reading} /> : null}
      </RiJingEvidenceRow>
    </section>
  );
}
