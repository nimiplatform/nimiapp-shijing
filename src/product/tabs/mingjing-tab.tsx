// SJG-IA-08 — 命镜 (Destiny Mirror) tab.
//
// Two layers:
//   1. Deterministic natal projection (MingJingChart, SJG-ALGO-16) — rendered
//      live from natal inputs, no AI: 八字排盘 / 原局格局 / 大运结构 / 流年关键窗口
//      + 历史事件验证 timeline resonance.
//   2. AI 解读 (mingjing Reading, SJG-ASTRO-12) — 命局核心特点 + 长期阶段策略,
//      generated on demand and grounded by the chart + recorded history. The
//      chart numbers are never recomputed by the AI.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useShijingStore } from '../state/shijing-store.tsx';
import { useProductCopy, type ProductCopy } from '../i18n/copy.ts';
import type { ShijingSettingsPageId } from '../../contracts/ia-contract.ts';
import type { ShijingSettingsFocusTarget } from '../settings/settings-page-view.tsx';
import type { NatalReadinessReason } from '../subjects/natal-readiness.ts';
import type { ShiJingSpace } from '../../domain/shijing-space.ts';
import type {
  MingJingMirrorOutput,
  MingJingRelationshipMirrorOutput,
} from '../../domain/mirror-output.ts';
import type { ReadingGenerationFailure } from '../../domain/reading.ts';
import { buildMingJingProjection } from '../astrology/mingjing-projection.ts';
import {
  inputsSummaryExpired,
  inputsSummaryStalenessForSpace,
} from '../astrology/inputs-summary-expiry.ts';
import {
  latestMingJingNatalReading,
  latestMingJingRelationshipReading,
} from '../reading/reading-selectors.ts';
import { generateReadingForStorage } from '../reading/generate-and-store.ts';
import { newReadingId } from '../ids/index.ts';
import { ShijingOnboarding } from '../onboarding/shijing-onboarding.tsx';
import { mingJingReadiness } from './mingjing/mingjing-readiness.ts';
import { shouldShowMingJingStartupGuide } from './mingjing/mingjing-startup-guide.ts';
import {
  natalMirrorScopeForToday,
  relationshipNatalMirrorScopeForToday,
} from './mirror-scope-helpers.ts';
import { MingJingHero } from './mingjing/mingjing-hero.tsx';
import { MingJingPaipan } from './mingjing/mingjing-paipan.tsx';
import { MingJingDayun } from './mingjing/mingjing-dayun.tsx';
import { MingJingLiunian } from './mingjing/mingjing-liunian.tsx';
import { MingJingEvents } from './mingjing/mingjing-events.tsx';
import { MingJingReadingView } from './mingjing/mingjing-reading-view.tsx';
import { MingJingRelationshipReadingView } from './mingjing/mingjing-relationship-reading-view.tsx';
import { MingJingRectify } from './mingjing/mingjing-rectify.tsx';

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export interface MingJingTabProps {
  readonly onRequestOpenSettings?: (
    page?: ShijingSettingsPageId,
    focusTarget?: ShijingSettingsFocusTarget | null,
  ) => void;
  readonly startupGuideDismissed?: boolean;
  readonly onStartupGuideComplete?: () => void;
}

export function MingJingTab({
  onRequestOpenSettings,
  startupGuideDismissed: externalStartupGuideDismissed,
  onStartupGuideComplete,
}: MingJingTabProps) {
  const { state, dispatch, runtime_ai_client } = useShijingStore();
  const copy = useProductCopy();
  const m = copy.mingjing;
  const space = state.snapshot;

  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<ReadingGenerationFailure | null>(null);
  const [relationshipLoading, setRelationshipLoading] = useState(false);
  const [relationshipFailure, setRelationshipFailure] = useState<ReadingGenerationFailure | null>(null);
  const [selectedRelationshipPersonId, setSelectedRelationshipPersonId] = useState(
    () => space.persons[0]?.id ?? '',
  );
  const [showRectify, setShowRectify] = useState(false);
  const stagesRef = useRef<HTMLDivElement>(null);
  const scrollToStages = () =>
    stagesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const [localStartupGuideDismissed, setLocalStartupGuideDismissed] = useState(false);
  const startupGuideDismissed = externalStartupGuideDismissed ?? localStartupGuideDismissed;

  const readiness = useMemo(() => mingJingReadiness(space), [space]);
  const projection = useMemo(
    () => (readiness.ok ? buildMingJingProjection({ space }) : null),
    [space, readiness.ok],
  );

  useEffect(() => {
    if (space.persons.some((person) => person.id === selectedRelationshipPersonId)) return;
    setSelectedRelationshipPersonId(space.persons[0]?.id ?? '');
  }, [selectedRelationshipPersonId, space.persons]);

  const selectedRelationshipPersonRef = useMemo(
    () =>
      selectedRelationshipPersonId
        ? { kind: 'person' as const, id: selectedRelationshipPersonId }
        : null,
    [selectedRelationshipPersonId],
  );

  const reading = useMemo(
    () => latestMingJingNatalReading(space.readings),
    [space.readings],
  );
  const output = (reading?.output ?? null) as MingJingMirrorOutput | null;

  const relationshipReading = useMemo(
    () =>
      selectedRelationshipPersonRef
        ? latestMingJingRelationshipReading({
            readings: space.readings,
            related_person_ref: selectedRelationshipPersonRef,
          })
        : undefined,
    [selectedRelationshipPersonRef, space.readings],
  );
  const relationshipOutput =
    (relationshipReading?.output ?? null) as MingJingRelationshipMirrorOutput | null;

  // "Stale" = the recorded history changed since this reading, or it aged out.
  const stale = useMemo(() => {
    if (!reading) return false;
    const current = space.event_memories.map((e) => e.id).sort().join(',');
    const cited = [...reading.cited_event_memory_refs].sort().join(',');
    return current !== cited || inputsSummaryExpired(reading, new Date());
  }, [reading, space.event_memories]);

  const relationshipStale = useMemo(() => {
    if (!relationshipReading) return false;
    return inputsSummaryStalenessForSpace({
      reading: relationshipReading,
      space,
      now: new Date(),
      expected_mirror_scope: relationshipReading.mirror_scope,
      expected_concern_tag_refs: [],
      expected_cited_event_memory_refs: [],
    }).stale;
  }, [relationshipReading, space]);

  async function handleGenerate() {
    if (!projection || !projection.ok || loading) return;
    setLoading(true);
    setFailure(null);
    const outcome = await generateReadingForStorage({
      id: newReadingId(),
      created_at: nowIso(),
      mirror_kind: 'mingjing',
      mirror_scope: natalMirrorScopeForToday(),
      related_person_refs: [],
      concern_tag_refs: [],
      cited_event_memory_refs: space.event_memories.map((e) => e.id),
      space,
      deps: { runtime_ai_client },
    });
    setLoading(false);
    if (outcome.ok) {
      dispatch({ type: 'snapshot/replace', snapshot: outcome.next_space });
    } else {
      setFailure(outcome.failure);
    }
  }

  async function handleGenerateRelationship() {
    if (!selectedRelationshipPersonRef || relationshipLoading) return;
    setRelationshipLoading(true);
    setRelationshipFailure(null);
    const outcome = await generateReadingForStorage({
      id: newReadingId(),
      created_at: nowIso(),
      mirror_kind: 'mingjing',
      mirror_scope: relationshipNatalMirrorScopeForToday(selectedRelationshipPersonRef),
      related_person_refs: [selectedRelationshipPersonRef],
      concern_tag_refs: [],
      cited_event_memory_refs: [],
      cited_plan_item_refs: [],
      space,
      deps: { runtime_ai_client },
    });
    setRelationshipLoading(false);
    if (outcome.ok) {
      dispatch({ type: 'snapshot/replace', snapshot: outcome.next_space });
    } else {
      setRelationshipFailure(outcome.failure);
    }
  }

  function handleSpaceChange(next: ShiJingSpace) {
    dispatch({ type: 'snapshot/replace', snapshot: next });
  }

  function handleStartupGuideComplete() {
    setLocalStartupGuideDismissed(true);
    onStartupGuideComplete?.();
  }

  if (shouldShowMingJingStartupGuide({ space, startupGuideDismissed })) {
    return (
      <section
        className="shijing-tab shijing-mingjing shijing-mingjing--onboarding"
        data-mirror-kind="mingjing"
      >
        <ShijingOnboarding onComplete={handleStartupGuideComplete} />
      </section>
    );
  }

  return (
    <section className="shijing-tab shijing-mingjing" data-mirror-kind="mingjing">
      {!readiness.ok ? (
        <>
          <MingJingSimpleHeader copy={m} />
          <div className="shijing-mingjing__blocked">
            <MingJingReadinessCard
              reason={readiness.reason}
              copy={m}
              onOpen={() => onRequestOpenSettings?.('profile')}
            />
            {readiness.reason === 'birth_time_required_for_method' ? (
              <MingJingRectify space={space} onSpaceChange={handleSpaceChange} />
            ) : null}
          </div>
        </>
      ) : !projection || !projection.ok ? (
        <>
          <MingJingSimpleHeader copy={m} />
          <div className="shijing-mingjing__failure" role="alert">
            <h2>{m.failureTitle}</h2>
            <p>{projection && !projection.ok ? (projection.error.detail ?? projection.error.kind) : ''}</p>
          </div>
        </>
      ) : (
        <>
          <MingJingSimpleHeader copy={m} />
          <MingJingHero chart={projection.value} onSeeStages={scrollToStages} />
          <div className="shijing-mingjing__panels">
            <MingJingPaipan chart={projection.value} />
            <div ref={stagesRef} className="shijing-mingjing__anchor">
              <MingJingDayun dayun={projection.value.dayun} />
            </div>
            <MingJingLiunian liunian={projection.value.liunian} />
            <MingJingEvents chart={projection.value} space={space} onSpaceChange={handleSpaceChange} />
            <MingJingReadingView
              output={output}
              stale={stale}
              loading={loading}
              failure={failure}
              onGenerate={handleGenerate}
            />
            <MingJingRelationshipReadingView
              persons={space.persons}
              selectedPersonId={selectedRelationshipPersonId}
              readingId={relationshipReading?.id ?? null}
              output={relationshipOutput}
              stale={relationshipStale}
              loading={relationshipLoading}
              failure={relationshipFailure}
              onSelectPerson={(personId) => {
                setSelectedRelationshipPersonId(personId);
                setRelationshipFailure(null);
              }}
              onGenerate={handleGenerateRelationship}
              onOpenPeople={() => onRequestOpenSettings?.('profile')}
            />
          </div>
          {showRectify ? (
            <MingJingRectify
              space={space}
              onSpaceChange={handleSpaceChange}
              onClose={() => setShowRectify(false)}
            />
          ) : (
            <button
              type="button"
              className="shijing-mj-footer-cta"
              onClick={() => setShowRectify(true)}
            >
              {m.rectify.entryLive}
            </button>
          )}
        </>
      )}
    </section>
  );
}

function MingJingSimpleHeader({ copy }: { readonly copy: ProductCopy['mingjing'] }) {
  return (
    <header className="shijing-mingjing__hero">
      <h1 className="shijing-mingjing__title">{copy.title}</h1>
    </header>
  );
}

function MingJingReadinessCard({
  reason,
  copy,
  onOpen,
}: {
  readonly reason: NatalReadinessReason;
  readonly copy: ProductCopy['mingjing'];
  readonly onOpen: () => void;
}) {
  return (
    <div className="shijing-mingjing__readiness" role="status">
      <h2 className="shijing-mingjing__readiness-title">{copy.readiness.title}</h2>
      <p className="shijing-mingjing__readiness-body">{copy.readiness.reasons[reason] ?? copy.readiness.fallback}</p>
      <button type="button" className="shijing-mingjing__readiness-btn" onClick={onOpen}>
        {copy.readiness.button}
      </button>
    </div>
  );
}
