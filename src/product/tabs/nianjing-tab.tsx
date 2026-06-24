// SJG-ASTRO-06 — NianJing phase + inflection mirror screen (W-c04
// timeline visualization).
//
// V2 layout (per the 年镜 redesign mockup):
//   1. Header strip — title + horizon meta + concern count +
//      「导入到时镜」/「生成长程相位」 actions + 上次生成 X 前.
//   2. Current-phase hero — a tinted overview card showing the
//      dominant *current* phase nature with per-concern chips on the
//      right pane (one row per active concern: label + nature chip +
//      band's year window). Rendered only when at least one concern
//      has a phase band covering today.
//   3. Filter row + legend — concern pills + 「编辑关注」shortcut on
//      the left, the five-tendency dot legend on the right, both in a
//      single capsule.
//   4. Long-horizon timeline card — year axis with a "现在" badge at
//      today's position, one lane per (optionally filtered) concern
//      tag with phase bands and inflection markers, a vertical dashed
//      now-line spanning the lanes, and a marker-legend strip at the
//      bottom of the card.
//   5. Concern focus bar — shared compact pill bar for activating /
//      archiving tags (full management lives in Settings → 关注).
//
// SJG-REMOVED-04: NO curves, K-line bars, luck-score curves, rankable
// numeric series, or aggregatable scores are introduced. The
// visualization is strictly band+marker, both as data primitives and
// as rendered visual primitives.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { NianJingMirrorOutput } from '../../domain/mirror-output.ts';
import type { ReadingGenerationFailure } from '../../domain/reading.ts';
import { generateReadingForStorage } from '../reading/generate-and-store.ts';
import { inputsSummaryStalenessForSpace } from '../astrology/inputs-summary-expiry.ts';
import { newReadingId } from '../ids/index.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import { MIRROR_KIND_LABELS } from '../i18n/copy.ts';
import { longHorizonMirrorScopeNextTenYears } from './mirror-scope-helpers.ts';
import { ImportToShiJingButton } from './shared/import-to-shijing-button.tsx';
import { FailureBanner } from './shared/failure-banner.tsx';
import { MirrorPageHeader } from './shared/mirror-page-header.tsx';
import { nianjingFreshnessView } from './nianjing/nianjing-staleness.ts';
import { buildNianJingDirectDisplayOutput } from './nianjing/nianjing-direct-output.ts';
import { NianJingReadyView } from './nianjing/nianjing-ready-view.tsx';
import { DetailDrawer } from './nianjing/nianjing-detail-drawer.tsx';
import { nowIso, relativeTimeShort, type SelectedDetail } from './nianjing/nianjing-view-model.ts';
import type { ShijingSettingsPageId } from '../../contracts/ia-contract.ts';

export interface NianJingTabProps {
  readonly onRequestOpenSettings?: (page?: ShijingSettingsPageId) => void;
}

export function NianJingTab(props: NianJingTabProps) {
  const { state, dispatch, runtime_ai_client } = useShijingStore();
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<ReadingGenerationFailure | null>(null);
  const [filterTagId, setFilterTagId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] =
    useState<SelectedDetail | null>(null);
  // Two-state version toggle: viewing the latest reading vs the
  // immediate prior one. We don't surface "version 1 / N" pagination
  // — the user only ever needs to undo a single generate and come
  // back. If they ever re-generate, the toggle re-points at "the new
  // latest" automatically (see effect below).
  const [viewingPrevious, setViewingPrevious] = useState(false);
  const nianjingScope = useMemo(() => longHorizonMirrorScopeNextTenYears(), []);
  const activeTags = useMemo(
    () => state.snapshot.concern_tags.filter((t) => t.status === 'active'),
    [state.snapshot.concern_tags],
  );
  const activeTagIds = useMemo(() => activeTags.map((t) => t.id), [activeTags]);

  // All NianJing readings sorted newest-first. Computed once per
  // snapshot change so the toggle is stable across re-renders.
  const nianjingReadings = useMemo(
    () =>
      [...state.snapshot.readings]
        .filter((r) => r.mirror_kind === 'nianjing')
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
    [state.snapshot.readings],
  );

  const hasPreviousReading = nianjingReadings.length >= 2;
  const latestNianjingReading = nianjingReadings[0];

  // When a new reading lands in the store (count grows), jump the
  // user to that new "latest". Otherwise a stale viewingPrevious=true
  // would silently hide their fresh generation behind the older one.
  const prevReadingCountRef = useRef(nianjingReadings.length);
  useEffect(() => {
    if (nianjingReadings.length > prevReadingCountRef.current) {
      setViewingPrevious(false);
    }
    prevReadingCountRef.current = nianjingReadings.length;
  }, [nianjingReadings.length]);

  // If the user asked for "上一版" but only one (or zero) reading
  // exists, fall back to the latest so the UI never points at undefined.
  const reading =
    viewingPrevious && hasPreviousReading
      ? nianjingReadings[1]
      : latestNianjingReading;

  const staleness = reading
    ? inputsSummaryStalenessForSpace({
        reading,
        space: state.snapshot,
        now: new Date(),
        expected_mirror_scope: nianjingScope,
        expected_concern_tag_refs: activeTagIds,
      })
    : { stale: false as const };
  const freshness = nianjingFreshnessView(staleness);
  const directDisplay = useMemo(
    () =>
      activeTags.length > 0
        ? buildNianJingDirectDisplayOutput({
            space: state.snapshot,
            mirror_scope: nianjingScope,
            active_concern_tags: activeTags,
          })
        : null,
    [activeTags, nianjingScope, state.snapshot],
  );

  async function handleGenerate() {
    setLoading(true);
    setFailure(null);
    const outcome = await generateReadingForStorage({
      id: newReadingId(),
      created_at: nowIso(),
      mirror_kind: 'nianjing',
      mirror_scope: nianjingScope,
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

  const persistedOutput =
    reading && freshness.render_output
      ? (reading.output as NianJingMirrorOutput)
      : null;
  const liveOutput = directDisplay?.ok ? directDisplay.output : null;
  const output = persistedOutput ?? liveOutput;
  const outputReading = persistedOutput ? reading : null;
  const displayFailure =
    failure ??
    (!loading && activeTagIds.length > 0 && !output && directDisplay && !directDisplay.ok
      ? directDisplay.failure
      : null);
  const importableReadingId = freshness.can_import_to_consultation ? reading?.id ?? null : null;
  const generatedAgo = reading?.created_at ? relativeTimeShort(reading.created_at) : null;
  const generatedAgoPrefix = viewingPrevious ? '上一版生成' : '上次生成';
  const actionLabel = loading
    ? '生成中...'
    : importableReadingId
      ? '更新可引用版本'
      : output
        ? '保存可引用版本'
        : '生成长程相位';

  return (
    <section
      className="shijing-tab shijing-nianjing"
      data-mirror-kind="nianjing"
      aria-label={MIRROR_KIND_LABELS.nianjing}
    >
      <MirrorPageHeader
        title={MIRROR_KIND_LABELS.nianjing}
        meta={generatedAgo ? <>{generatedAgoPrefix} {generatedAgo}</> : undefined}
        actions={(
          <>
            {importableReadingId ? <ImportToShiJingButton readingId={importableReadingId} /> : null}
            <button
              type="button"
              className="shijing-nianjing__generate"
              disabled={loading || activeTagIds.length === 0}
              onClick={handleGenerate}
            >
              <span className="shijing-nianjing__generate-icon" aria-hidden />
              {actionLabel}
            </button>
          </>
        )}
        footer={hasPreviousReading ? (
          <button
            type="button"
            className="shijing-nianjing__version-toggle"
            onClick={() => setViewingPrevious((v) => !v)}
            aria-pressed={viewingPrevious}
          >
            {viewingPrevious ? '回到最新版 →' : '← 还原上一版'}
          </button>
        ) : undefined}
      />

      {activeTagIds.length === 0 ? (
        <div
          role="status"
          aria-live="polite"
          className="shijing-nianjing__notice shijing-nianjing__notice--action"
        >
          <span>
            <strong>还没有激活关注</strong>
            年镜需要至少一个关注作为长程相位的镜片。
          </span>
          <button
            type="button"
            className="shijing-nianjing__notice-action"
            onClick={() => props.onRequestOpenSettings?.('concerns')}
          >
            去设置关注
          </button>
        </div>
      ) : null}
      {loading ? (
        <p role="status" className="shijing-nianjing__notice">正在生成长程相位…</p>
      ) : null}
      {!loading && !displayFailure && !output && activeTagIds.length > 0 ? (
        <p role="status" className="shijing-nianjing__notice">
          当前资料还无法推导出长程相位，请先补全本命输入与关注。
        </p>
      ) : null}
      {displayFailure ? <FailureBanner failure={displayFailure} /> : null}

      {output ? (
        <NianJingReadyView
          reading={outputReading}
          output={output}
          activeTags={activeTags}
          filterTagId={filterTagId}
          onFilterChange={setFilterTagId}
          onSelectDetail={setSelectedDetail}
        />
      ) : null}

      {selectedDetail ? (
        <DetailDrawer
          detail={selectedDetail}
          onClose={() => setSelectedDetail(null)}
          onOpenArchive={() => props.onRequestOpenSettings?.('memory')}
        />
      ) : null}
    </section>
  );
}
