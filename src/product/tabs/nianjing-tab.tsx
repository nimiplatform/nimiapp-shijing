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
import type {
  NianJingInflectionKind,
  NianJingInflectionPoint,
  NianJingMirrorOutput,
  NianJingNature,
  NianJingPhaseBand,
} from '../../domain/mirror-output.ts';
import {
  CONCERN_TAG_ACTIVE_LIMIT,
  type ConcernTag,
} from '../../domain/concern-tag.ts';
import type { ReadingGenerationFailure, Reading } from '../../domain/reading.ts';
import { generateReadingForStorage } from '../reading/generate-and-store.ts';
import { inputsSummaryStaleForSpace } from '../astrology/inputs-summary-expiry.ts';
import { newConcernTagId, newReadingId } from '../ids/index.ts';
import { readingHasSyntheticNianjingBaseline } from '../reading/reading-selectors.ts';
import { useShijingStore } from '../state/shijing-store.tsx';
import {
  MIRROR_KIND_LABELS,
  NIANJING_INFLECTION_KIND_LABELS,
  TENDENCY_CLASS_LABELS,
} from '../i18n/copy.ts';
import { longHorizonMirrorScopeNextTenYears } from './mirror-scope-helpers.ts';
import { classifyMirrorTabState } from './mirror-state.ts';
import {
  deriveConcernTagLabelForDisplay,
  parseConcernTagInput,
} from '../concern-tags/concern-tag-parser.ts';
import {
  CONCERN_PRESETS,
  type ConcernPreset,
  concernSubtitleFor,
  trimmedConcernLabel,
} from '../concern-tags/concern-presets.ts';
import { CitationDrawer } from './shared/citation-drawer.tsx';
import { ImportToShiJingButton } from './shared/import-to-shijing-button.tsx';
import { FailureBanner } from './shared/failure-banner.tsx';
import { NianJingEventRecorder } from './nianjing/nianjing-event-recorder.tsx';
import type { ShijingSettingsPageId } from '../../contracts/ia-contract.ts';

// ===== Pure helpers (no React) =======================================

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateToMs(date: string): number {
  return Date.parse(date + 'T00:00:00Z');
}

function yearOf(date: string): number {
  return Number(date.slice(0, 4));
}

// Severity ordering for picking the dominant *current* phase nature
// across concerns. Higher score = more notable → wins the headline
// slot in the hero card. Matches `yuejing-tab.tsx::TENDENCY_SEVERITY`
// so the cross-mirror "what should the user notice first" priority
// reads identically.
const NATURE_SEVERITY: Record<NianJingNature, number> = {
  blocked: 4,
  turning: 3,
  watch: 2,
  supportive: 1,
  steady: 0,
};

const HERO_BODY_BY_NATURE: Record<NianJingNature, string> = {
  supportive: '整体助力,长程红利逐步释放,适合主动布局。',
  steady: '整体平稳,适合按既定方向稳步推进。',
  watch: '需持续观察,留意节奏调整与外缘变化。',
  blocked: '长程阻滞,宜守不宜攻,等待结构松动。',
  turning: '处于转折,留意拐点信号并把握窗口期。',
};

const INFLECTION_KIND_LABELS = NIANJING_INFLECTION_KIND_LABELS;

// Structured guidance per phase nature. Drives the "结论 → 解释 →
// 行动建议 → 提醒" drawer rendering. `{concern}` placeholders are
// substituted at render time with the active concern's label so each
// sentence reads as if written for that specific area of life.
interface NatureGuidanceItem {
  readonly title: string;
  readonly description: string;
}

interface NatureGuidance {
  readonly oneLine: string;
  readonly meaning: string;
  readonly keywords: readonly string[];
  readonly suggestions: readonly NatureGuidanceItem[];
  readonly cautions: readonly NatureGuidanceItem[];
}

const NATURE_GUIDANCE: Record<NianJingNature, NatureGuidance> = {
  supportive: {
    oneLine: '外部机会开始变多,适合主动打开{concern}局面。',
    meaning:
      '这是一段适合主动出击的{concern}助力期。外部环境、人脉机会和资源流动会更容易向你靠近,适合启动新项目、争取合作、扩大影响力。',
    keywords: ['主动出击', '资源靠近', '新机会', '建立连接'],
    suggestions: [
      {
        title: '启动新项目',
        description: '把已经酝酿的想法推到台前,开始试水和验证。',
      },
      {
        title: '争取合作资源',
        description: '主动联系关键人物、寻找合作方,或打开新的业务渠道。',
      },
      {
        title: '扩大{concern}边界',
        description: '适合尝试新的方向、机会窗口、公开表达或个人品牌建设。',
      },
    ],
    cautions: [
      {
        title: '不要只等机会出现',
        description: '助力期更像是顺风,不是自动成功。需要主动表达、主动连接、主动推进。',
      },
      {
        title: '避免过早承诺过多',
        description: '机会变多时,也容易分散精力。建议先判断资源质量,再投入长期成本。',
      },
    ],
  },
  steady: {
    oneLine: '节奏平稳,适合把{concern}基础打扎实。',
    meaning:
      '这是一段{concern}的平稳期。外部环境既没有强助力,也没有明显阻碍,大局已定、节奏可控,是夯实基础、积累实力的好时段,不需要做大的方向调整。',
    keywords: ['稳步推进', '夯实基础', '长期主义', '不慌不躁'],
    suggestions: [
      {
        title: '把基础工作做扎实',
        description: '系统化梳理流程、建立可复用的方法,为下一波动作做准备。',
      },
      {
        title: '巩固现有关系',
        description: '维护核心人脉、深化既有合作,在熟悉的圈子里加深信任。',
      },
      {
        title: '小步迭代',
        description: '不必追求大破大立,通过小幅试验持续优化,降低风险。',
      },
    ],
    cautions: [
      {
        title: '别在平稳期硬找刺激',
        description: '平稳不等于停滞。强行制造变化容易自我消耗,顺势而为更省力。',
      },
      {
        title: '警惕慢性松懈',
        description: '没有明显阻力时最容易掉以轻心。设定可衡量的小目标维持节奏。',
      },
    ],
  },
  watch: {
    oneLine: '外部信号尚不明朗,{concern}先观察、再行动。',
    meaning:
      '这是一段{concern}的观察期。多方因素正在博弈,格局未定。这时候保持耐心与敏锐度,比急于下结论或做大动作更有价值。',
    keywords: ['延后决策', '收集信息', '留意信号', '保持灵活'],
    suggestions: [
      {
        title: '广泛收集信息',
        description: '多接触不同来源的视角,不预设立场,等关键信号自然浮现。',
      },
      {
        title: '保留多个选项',
        description: '不急于把鸡蛋放进任何一个篮子,为变化预留空间。',
      },
      {
        title: '低成本试水',
        description: '用小成本、小动作探路,把"试错"控制在可承受范围内。',
      },
    ],
    cautions: [
      {
        title: '别把观察当借口',
        description: '观察期不是不作为。如果一直拖延,信号过去后机会也走了。',
      },
      {
        title: '小心信息茧房',
        description: '只听想听的会让判断失真。主动接触和自己结论相反的视角。',
      },
    ],
  },
  blocked: {
    oneLine: '大环境逆风,{concern}重在守稳与积蓄。',
    meaning:
      '这是一段{concern}的阻滞期。推进会比平时更费力,资源也容易受限。不宜强行突破,以守为攻、修内功、等待格局松动,会比硬扛更有效。',
    keywords: ['以守为攻', '修内功', '节流', '蓄能'],
    suggestions: [
      {
        title: '收缩战线',
        description: '聚焦核心目标,砍掉边缘的高消耗项目,把资源集中在最关键的事上。',
      },
      {
        title: '修内功',
        description: '用阻滞期补短板:学习、复盘、整理系统。等风向变了才能跑得动。',
      },
      {
        title: '稳住基本盘',
        description: '维护好已有的关键关系和资产,不在低谷时做大决策。',
      },
    ],
    cautions: [
      {
        title: '不要硬刚环境',
        description: '逆风时强行推进容易加速消耗。学会"暂时退一步"不是失败。',
      },
      {
        title: '警惕情绪化决策',
        description: '受挫感容易让人做出冲动的"破局"动作。重大决定建议延后。',
      },
    ],
  },
  turning: {
    oneLine: '格局正在重组,{concern}既是窗口也是分岔点。',
    meaning:
      '这是一段{concern}的转折期。旧的稳态正在解体,新的稳态尚未定型。窗口期内的关键决策会决定下一段走向——既有破局机会,也有结构性风险。',
    keywords: ['关键决策', '窗口期', '破局', '清理旧框'],
    suggestions: [
      {
        title: '审视核心方向',
        description: '借转折期重新评估目标和路径,该校准就校准,该换轨就换轨。',
      },
      {
        title: '果断决断',
        description: '该做的取舍不要拖。转折期的犹豫成本比决策错误更高。',
      },
      {
        title: '清理旧包袱',
        description: '了断不再服务于你的关系、项目、习惯,给新格局腾出空间。',
      },
    ],
    cautions: [
      {
        title: '别在转折期求稳',
        description: '试图维持旧格局往往让动荡时间更长。承认变化,主动调整。',
      },
      {
        title: '不要孤军作战',
        description: '转折期容易自我怀疑。找信得过的人讨论判断,降低盲点。',
      },
    ],
  },
};

function substituteConcernPlaceholder(text: string, concern: string): string {
  return text.replaceAll('{concern}', concern);
}

function formatDateDots(iso: string): string {
  return iso.replaceAll('-', '.');
}

// User-facing explanations for each inflection kind. Rendered in the
// right-side drawer when the user clicks a marker — surfaces what the
// marker means in plain language without requiring the user to know
// 命理 terminology in advance.
const INFLECTION_KIND_DESCRIPTIONS: Record<NianJingInflectionKind, string> = {
  dayun_boundary:
    '大运是十年一换的长期周期。「大运边界」标记当前十年格局结束、下一段开始的瞬间——人生主旋律、能量主线在此处发生根本性切换,是最值得关注的长程拐点。',
  annual_transition:
    '流年是一年一换的周期。「流年切换」标记从一个干支年进入下一个的瞬间,影响当年的整体走势与机遇窗口。',
  monthly_transition:
    '流月是一月一换的周期。「流月切换」标记节气交替的时刻,对短期决策与节奏调整有提示作用。',
  marker_cluster:
    '多个不同周期(大运 / 流年 / 流月)的关键节点在短时间内集中出现。「多重节点」意味着叠加效应放大,是格局转换最显著的时间窗。',
};

function relativeTimeShort(iso: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime();
  if (diff < 60_000) return '刚刚';
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  return `${day} 天前`;
}

// Find the phase band that contains `today` for a given concern, if
// any. The lookup is a linear scan: phase counts per concern are small
// (≤ ~10 bands across a 10-year horizon).
function currentBandFor(
  bands: readonly NianJingPhaseBand[],
  today: string,
): NianJingPhaseBand | null {
  for (const band of bands) {
    if (band.start_date <= today && today <= band.end_date) return band;
  }
  return null;
}

function dominantCurrentNature(
  laneEntries: ReadonlyArray<{ readonly current: NianJingPhaseBand | null }>,
): NianJingNature {
  let best: NianJingNature = 'steady';
  let bestScore = -1;
  for (const entry of laneEntries) {
    if (!entry.current) continue;
    const s = NATURE_SEVERITY[entry.current.nature];
    if (s > bestScore) {
      best = entry.current.nature;
      bestScore = s;
    }
  }
  return best;
}

function bandYearRangeLabel(band: NianJingPhaseBand): string {
  const s = yearOf(band.start_date);
  const e = yearOf(band.end_date);
  if (s === e) return `${s} 年`;
  return `${s}–${e}`;
}

// ===== Top-level component ==========================================

export interface NianJingTabProps {
  readonly onRequestOpenSettings?: (page?: ShijingSettingsPageId) => void;
}

// Discriminated union driving the right-side detail drawer. One slot
// covers both phase bands and inflection markers so they're mutually
// exclusive — opening one closes the other automatically — and so a
// single drawer component handles both content shapes.
type SelectedDetail =
  | {
      readonly kind: 'band';
      readonly band: NianJingPhaseBand;
      readonly tag: ConcernTag;
    }
  | {
      readonly kind: 'inflection';
      readonly inflection: NianJingInflectionPoint;
      readonly tag: ConcernTag;
    };

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
        .filter((r) => r.mirror_kind === 'nianjing' && !readingHasSyntheticNianjingBaseline(r))
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

  const stale = reading
    ? inputsSummaryStaleForSpace({
        reading,
        space: state.snapshot,
        now: new Date(),
        expected_mirror_scope: nianjingScope,
        expected_concern_tag_refs: activeTagIds,
      })
    : false;
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

  const output = reading ? (reading.output as NianJingMirrorOutput) : null;

  return (
    <section
      className="shijing-tab shijing-nianjing"
      data-mirror-kind="nianjing"
      aria-label={MIRROR_KIND_LABELS.nianjing}
    >
      <NianJingHeaderStrip
        generating={loading}
        canGenerate={activeTagIds.length > 0}
        readingId={reading?.id ?? null}
        readingCreatedAt={reading?.created_at ?? null}
        onGenerate={handleGenerate}
        hasPreviousReading={hasPreviousReading}
        viewingPrevious={viewingPrevious}
        onToggleVersion={() => setViewingPrevious((v) => !v)}
      />

      {activeTagIds.length === 0 ? (
        <p role="status" className="shijing-nianjing__notice">
          请先在下方「关注标签」中添加并激活至少一个关注。
        </p>
      ) : null}
      {tabState.kind === 'loading' ? (
        <p role="status" className="shijing-nianjing__notice">正在生成长程相位…</p>
      ) : null}
      {tabState.kind === 'empty' && activeTagIds.length > 0 ? (
        <p role="status" className="shijing-nianjing__notice">
          尚未生成长程相位,点击右上「生成长程相位」开始。
        </p>
      ) : null}
      {tabState.kind === 'failure' ? <FailureBanner failure={tabState.failure} /> : null}

      {tabState.kind === 'ready' && output ? (
        <NianJingReadyView
          reading={tabState.reading}
          output={output}
          stale={tabState.stale}
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

// ===== 1) Header strip ==============================================

interface NianJingHeaderStripProps {
  readonly generating: boolean;
  readonly canGenerate: boolean;
  readonly readingId: string | null;
  readonly readingCreatedAt: string | null;
  readonly onGenerate: () => void;
  readonly hasPreviousReading: boolean;
  readonly viewingPrevious: boolean;
  readonly onToggleVersion: () => void;
}

function NianJingHeaderStrip(props: NianJingHeaderStripProps) {
  const ago = props.readingCreatedAt ? relativeTimeShort(props.readingCreatedAt) : null;
  const agoPrefix = props.viewingPrevious ? '上一版生成' : '上次生成';
  return (
    <header className="shijing-nianjing__strip">
      <div className="shijing-nianjing__strip-titles">
        <h1>{MIRROR_KIND_LABELS.nianjing}</h1>
      </div>
      <div className="shijing-nianjing__strip-actions">
        <div className="shijing-nianjing__strip-buttons">
          {props.readingId ? <ImportToShiJingButton readingId={props.readingId} /> : null}
          <button
            type="button"
            className="shijing-nianjing__generate"
            disabled={props.generating || !props.canGenerate}
            onClick={props.onGenerate}
          >
            <span className="shijing-nianjing__generate-icon" aria-hidden />
            {props.generating ? '生成中…' : '生成长程相位'}
          </button>
        </div>
        <div className="shijing-nianjing__strip-footer">
          {ago ? (
            <small className="shijing-nianjing__ago">
              {agoPrefix} {ago}
            </small>
          ) : null}
          {props.hasPreviousReading ? (
            <button
              type="button"
              className="shijing-nianjing__version-toggle"
              onClick={props.onToggleVersion}
              aria-pressed={props.viewingPrevious}
            >
              {props.viewingPrevious ? '回到最新版 →' : '← 还原上一版'}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

// ===== 2) Ready view (hero + filter row + timeline + footer) =========

interface LaneViewModel {
  readonly tag: ConcernTag;
  readonly phases: readonly NianJingPhaseBand[];
  readonly inflections: readonly NianJingInflectionPoint[];
  readonly current: NianJingPhaseBand | null;
}

function buildLanes(
  output: NianJingMirrorOutput,
  activeTags: readonly ConcernTag[],
  today: string,
): readonly LaneViewModel[] {
  const phasesByTag = new Map<string, NianJingPhaseBand[]>();
  const inflectionsByTag = new Map<string, NianJingInflectionPoint[]>();
  for (const phase of output.phase_bands) {
    const arr = phasesByTag.get(phase.concern_tag_ref);
    if (arr) arr.push(phase);
    else phasesByTag.set(phase.concern_tag_ref, [phase]);
  }
  for (const inflection of output.inflection_points) {
    const arr = inflectionsByTag.get(inflection.concern_tag_ref);
    if (arr) arr.push(inflection);
    else inflectionsByTag.set(inflection.concern_tag_ref, [inflection]);
  }
  // Drive lane order from the user's active-concern order (settings)
  // rather than insertion order from the generator output. Inactive
  // tags don't get a lane even if the generator referenced them.
  return activeTags.map((tag) => {
    const phases = phasesByTag.get(tag.id) ?? [];
    const inflections = inflectionsByTag.get(tag.id) ?? [];
    return {
      tag,
      phases,
      inflections,
      current: currentBandFor(phases, today),
    };
  });
}

interface NianJingReadyViewProps {
  readonly reading: Reading;
  readonly output: NianJingMirrorOutput;
  readonly stale: boolean;
  readonly activeTags: readonly ConcernTag[];
  readonly filterTagId: string | null;
  readonly onFilterChange: (id: string | null) => void;
  readonly onSelectDetail: (selection: SelectedDetail) => void;
}

function NianJingReadyView(props: NianJingReadyViewProps) {
  const today = todayIsoDate();
  const lanes = useMemo(
    () => buildLanes(props.output, props.activeTags, today),
    [props.output, props.activeTags, today],
  );
  // Both hero + timeline scope to the user's concern filter. Without
  // this, picking 事业 would still leave the hero on 姻缘's more-severe
  // 观察 (since dominantCurrentNature picks the highest severity across
  // ALL lanes), which reads as "the filter is broken".
  const lanesForView = useMemo(
    () =>
      props.filterTagId
        ? lanes.filter((l) => l.tag.id === props.filterTagId)
        : lanes,
    [lanes, props.filterTagId],
  );
  const focusedTag = useMemo(
    () =>
      props.filterTagId
        ? props.activeTags.find((t) => t.id === props.filterTagId) ?? null
        : null,
    [props.activeTags, props.filterTagId],
  );
  const horizonStartMs = dateToMs(props.output.horizon.start_date);
  const horizonEndMs = dateToMs(props.output.horizon.end_date);
  const horizonSpan = Math.max(1, horizonEndMs - horizonStartMs);
  const todayMs = dateToMs(today);
  const nowPct = Math.max(
    0,
    Math.min(100, ((todayMs - horizonStartMs) / horizonSpan) * 100),
  );

  function percentOf(date: string): number {
    const ms = dateToMs(date);
    if (!Number.isFinite(ms)) return 0;
    return Math.max(0, Math.min(100, ((ms - horizonStartMs) / horizonSpan) * 100));
  }

  const hasCurrent = lanesForView.some((l) => l.current !== null);
  const heroNature = dominantCurrentNature(lanesForView);

  return (
    <>
      {props.stale ? (
        <p role="alert" className="shijing-nianjing__stale">
          当前长程相位已超过 30 天,建议重新生成。
        </p>
      ) : null}

      {hasCurrent ? (
        <NianJingPhaseHero
          horizon={props.output.horizon}
          nature={heroNature}
          today={today}
          lanes={lanesForView}
          focusedTag={focusedTag}
        />
      ) : null}

      <NianJingFilterRow
        activeTags={props.activeTags}
        filterTagId={props.filterTagId}
        onFilterChange={props.onFilterChange}
      />

      <NianJingTimeline
        lanes={lanesForView}
        horizon={props.output.horizon}
        nowPct={nowPct}
        percentOf={percentOf}
        onSelectDetail={props.onSelectDetail}
      />

      <details className="shijing-nianjing__footer">
        <summary>长程相位摘要与生成依据</summary>
        <p className="shijing-nianjing__footer-summary">{props.output.summary}</p>
        <CitationDrawer reading={props.reading} />
      </details>
    </>
  );
}

// ===== 3) Current-phase hero ========================================

function NianJingPhaseHero(props: {
  readonly horizon: { readonly start_date: string; readonly end_date: string };
  readonly nature: NianJingNature;
  readonly today: string;
  readonly lanes: readonly LaneViewModel[];
  readonly focusedTag: ConcernTag | null;
}) {
  const natureLabel = TENDENCY_CLASS_LABELS[props.nature];
  const body = HERO_BODY_BY_NATURE[props.nature];
  const currentYear = yearOf(props.today);
  const horizonLabel = `${yearOf(props.horizon.start_date)}–${yearOf(props.horizon.end_date)}`;
  const eyebrowText = props.focusedTag
    ? `${trimmedConcernLabel(props.focusedTag)} · 此刻`
    : '当前阶段 · 此刻';

  return (
    <article
      className="shijing-nianjing__hero"
      data-nature={props.nature}
      aria-label="当前长程相位"
    >
      <div className="shijing-nianjing__hero-headline">
        <span className="shijing-nianjing__hero-eyebrow">{eyebrowText}</span>
        <div className="shijing-nianjing__hero-nature">
          <strong>{natureLabel}</strong>
          <small>{currentYear} 年 · {horizonLabel} 展望</small>
        </div>
        <p className="shijing-nianjing__hero-body">{body}</p>
      </div>
      <ul className="shijing-nianjing__hero-rows" aria-label="各关注当前相位">
        {props.lanes.map((lane) => {
          const nature = lane.current?.nature ?? 'steady';
          // Prefer the band's stage-name summary (e.g. "建设期",
          // "观察期") over the bare year range — the stage name is
          // what the mockup leads with and what the user recognizes.
          // Fall back to the year range, then to em-dash if no
          // current band exists for this concern.
          const detail = lane.current
            ? lane.current.summary || bandYearRangeLabel(lane.current)
            : '—';
          return (
            <li key={lane.tag.id}>
              <span className="shijing-nianjing__hero-row-label">
                {trimmedConcernLabel(lane.tag)}
              </span>
              <span
                className="shijing-nianjing__hero-row-chip"
                data-nature={nature}
              >
                <span className="shijing-nianjing__hero-row-chip-dot" aria-hidden />
                {TENDENCY_CLASS_LABELS[nature]}
              </span>
              <span className="shijing-nianjing__hero-row-detail">{detail}</span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

// ===== 4) Filter row + tendency legend ==============================

function NianJingFilterRow(props: {
  readonly activeTags: readonly ConcernTag[];
  readonly filterTagId: string | null;
  readonly onFilterChange: (id: string | null) => void;
}) {
  const [editorOpen, setEditorOpen] = useState(false);
  return (
    <div
      className="shijing-nianjing__filter-row"
      role="toolbar"
      aria-label="按关注筛选 / 相位图例"
    >
      <fieldset className="shijing-nianjing__filter">
        <legend>关注</legend>
        <FilterPill
          label="全部"
          selected={props.filterTagId === null}
          onSelect={() => props.onFilterChange(null)}
        />
        {props.activeTags.map((tag) => (
          <FilterPill
            key={tag.id}
            label={trimmedConcernLabel(tag)}
            selected={props.filterTagId === tag.id}
            onSelect={() => props.onFilterChange(tag.id)}
          />
        ))}
        <span className="shijing-nianjing__editor-anchor">
          <button
            type="button"
            className="shijing-nianjing__filter-manage"
            aria-expanded={editorOpen}
            aria-haspopup="dialog"
            onClick={() => setEditorOpen((o) => !o)}
          >
            ✎ 编辑关注
          </button>
          {editorOpen ? (
            <ConcernEditorPopover onClose={() => setEditorOpen(false)} />
          ) : null}
        </span>
      </fieldset>
      <ul className="shijing-nianjing__legend" aria-label="相位图例">
        {(Object.entries(TENDENCY_CLASS_LABELS) as ReadonlyArray<[NianJingNature, string]>).map(
          ([nat, label]) => (
            <li key={nat} data-nature={nat}>
              <span className="shijing-nianjing__legend-dot" aria-hidden />
              {label}
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

// ===== 4b) Concern editor popover ===================================
// Inline manager rendered when「✎ 编辑关注」is clicked. Lets the user
// quickly archive an active concern, re-activate an archived one, add
// a preset, or type a free-form concern. Heavier flows (resolving
// @person mentions, prompt-text editing) still live in Settings →
// 关注 — this popover stays small and intent-focused.

function ConcernEditorPopover(props: { readonly onClose: () => void }) {
  const { state, dispatch } = useShijingStore();
  const [draftInput, setDraftInput] = useState('');
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const tags = state.snapshot.concern_tags;
  const active = useMemo(() => tags.filter((t) => t.status === 'active'), [tags]);
  const activeCount = active.length;
  const atLimit = activeCount >= CONCERN_TAG_ACTIVE_LIMIT;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') props.onClose();
    }
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!popoverRef.current || !target) return;
      if (popoverRef.current.contains(target)) return;
      // Don't close on a click of our own trigger; the trigger's click
      // handler will toggle the open state itself.
      const triggerBtn = (target as HTMLElement).closest?.(
        'button[aria-expanded][aria-haspopup="dialog"]',
      );
      if (triggerBtn) return;
      props.onClose();
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [props]);

  function commitTags(next: readonly ConcernTag[]) {
    dispatch({
      type: 'snapshot/replace',
      snapshot: { ...state.snapshot, concern_tags: next },
    });
  }

  function archiveTag(id: string) {
    commitTags(
      tags.map((t) =>
        t.id === id ? { ...t, status: 'archived', updated_at: nowIso() } : t,
      ),
    );
  }

  function activateExisting(id: string) {
    if (atLimit) return;
    commitTags(
      tags.map((t) =>
        t.id === id ? { ...t, status: 'active', updated_at: nowIso() } : t,
      ),
    );
  }

  function addPreset(preset: ConcernPreset) {
    if (atLimit) return;
    const existing = tags.find((t) => t.label === preset.label);
    if (existing) {
      if (existing.status === 'active') return;
      activateExisting(existing.id);
      return;
    }
    const ts = nowIso();
    const tag: ConcernTag = {
      id: newConcernTagId(),
      label: preset.label,
      status: 'active',
      sort_order: tags.length,
      parsed_topics: [...preset.topics],
      mention_refs: [],
      prompt_text: preset.subtitle,
      created_at: ts,
      updated_at: ts,
    };
    commitTags([...tags, tag]);
  }

  function addCustom() {
    if (atLimit) return;
    const trimmed = draftInput.trim();
    if (trimmed.length === 0) return;
    const parsed = parseConcernTagInput(draftInput, {
      persons: state.snapshot.persons,
    });
    const ts = nowIso();
    const tag: ConcernTag = {
      id: newConcernTagId(),
      label: deriveConcernTagLabelForDisplay(parsed) || trimmed,
      status: 'active',
      sort_order: tags.length,
      parsed_topics: [...parsed.parsed_topics],
      mention_refs: [...parsed.mention_refs],
      prompt_text: parsed.prompt_text,
      created_at: ts,
      updated_at: ts,
    };
    commitTags([...tags, tag]);
    setDraftInput('');
  }

  type Suggestion =
    | { readonly kind: 'archived'; readonly id: string; readonly label: string; readonly subtitle: string }
    | { readonly kind: 'preset'; readonly preset: ConcernPreset };

  const suggestions: readonly Suggestion[] = useMemo(() => {
    const archived: Suggestion[] = tags
      .filter((t) => t.status === 'archived')
      .map((t) => ({
        kind: 'archived',
        id: t.id,
        label: t.label,
        subtitle: concernSubtitleFor(t),
      }));
    const presetSuggestions: Suggestion[] = CONCERN_PRESETS
      .filter((p) => !tags.some((t) => t.label === p.label))
      .map((p) => ({ kind: 'preset', preset: p }));
    return [...archived, ...presetSuggestions];
  }, [tags]);

  return (
    <div
      ref={popoverRef}
      className="shijing-nianjing__editor"
      role="dialog"
      aria-label="管理关注"
    >
      <header className="shijing-nianjing__editor-head">
        <strong>管理关注</strong>
        <span className="shijing-nianjing__editor-count">
          {activeCount}/{CONCERN_TAG_ACTIVE_LIMIT}
        </span>
      </header>
      <p className="shijing-nianjing__editor-subtitle">
        激活的关注会出现在时间轴上,独立计算相位带与拐点。
      </p>

      {active.length > 0 ? (
        <section className="shijing-nianjing__editor-section">
          <h4>已激活</h4>
          <ul>
            {active.map((tag) => (
              <li key={tag.id}>
                <div className="shijing-nianjing__editor-row-text">
                  <strong>{trimmedConcernLabel(tag)}</strong>
                  <small>{concernSubtitleFor(tag)}</small>
                </div>
                <button
                  type="button"
                  className="shijing-nianjing__editor-remove"
                  onClick={() => archiveTag(tag.id)}
                >
                  移除
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {suggestions.length > 0 ? (
        <section className="shijing-nianjing__editor-section">
          <h4>可添加</h4>
          <ul>
            {suggestions.map((s) => {
              const label = s.kind === 'archived' ? s.label : s.preset.label;
              const subtitle = s.kind === 'archived' ? s.subtitle : s.preset.subtitle;
              const key = s.kind === 'archived' ? `arc-${s.id}` : `pre-${s.preset.label}`;
              return (
                <li key={key}>
                  <div className="shijing-nianjing__editor-row-text">
                    <strong>{label.replace(/^#/, '')}</strong>
                    <small>{subtitle}</small>
                  </div>
                  <button
                    type="button"
                    className="shijing-nianjing__editor-add"
                    disabled={atLimit}
                    title={atLimit ? `已达激活上限 ${CONCERN_TAG_ACTIVE_LIMIT}` : '加入关注'}
                    onClick={() => {
                      if (s.kind === 'archived') {
                        activateExisting(s.id);
                      } else {
                        addPreset(s.preset);
                      }
                    }}
                  >
                    添加
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="shijing-nianjing__editor-custom">
        <input
          type="text"
          value={draftInput}
          onChange={(e) => setDraftInput(e.currentTarget.value)}
          placeholder='自定义关注,如「学业」「创业」'
          disabled={atLimit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !atLimit && draftInput.trim().length > 0) {
              e.preventDefault();
              addCustom();
            }
          }}
        />
        <button
          type="button"
          className="shijing-nianjing__editor-add"
          disabled={atLimit || draftInput.trim().length === 0}
          onClick={addCustom}
        >
          添加
        </button>
      </div>
    </div>
  );
}

function FilterPill(props: {
  readonly label: string;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className="shijing-nianjing__filter-pill"
      aria-pressed={props.selected}
      onClick={props.onSelect}
    >
      {props.label}
    </button>
  );
}

// ===== 5) Long-horizon timeline =====================================

interface NianJingTimelineProps {
  readonly lanes: readonly LaneViewModel[];
  readonly horizon: { readonly start_date: string; readonly end_date: string };
  readonly nowPct: number;
  readonly percentOf: (date: string) => number;
  readonly onSelectDetail: (selection: SelectedDetail) => void;
}

function NianJingTimeline(props: NianJingTimelineProps) {
  const startYear = yearOf(props.horizon.start_date);
  const endYear = yearOf(props.horizon.end_date);
  // One tick per year from (start+1) to end inclusive. The start year
  // slot is reserved for the "现在" badge at today's actual position.
  const tickYears: readonly number[] = useMemo(() => {
    const xs: number[] = [];
    for (let y = startYear + 1; y <= endYear; y += 1) xs.push(y);
    return xs;
  }, [startYear, endYear]);

  function tickPct(year: number): number {
    return props.percentOf(`${year}-01-01`);
  }

  if (props.lanes.length === 0) {
    return (
      <p className="shijing-nianjing__notice" role="status">
        当前筛选下没有可显示的相位带。
      </p>
    );
  }

  return (
    <article
      className="shijing-nianjing__timeline"
      aria-label="按关注标签的长程相位带与拐点时间轴"
    >
      <div className="shijing-nianjing__lanes-wrap">
        <div className="shijing-nianjing__axis" aria-hidden>
          <span
            className="shijing-nianjing__now-tag"
            style={{ left: `${props.nowPct}%` }}
          >
            现在
          </span>
          {tickYears.map((year) => (
            <span
              key={year}
              className="shijing-nianjing__axis-tick"
              style={{ left: `${tickPct(year)}%` }}
            >
              {year}
            </span>
          ))}
        </div>
        {props.lanes.map((lane) => (
          <div className="shijing-nianjing__lane" key={lane.tag.id}>
            <span className="shijing-nianjing__lane-label">
              <strong>{trimmedConcernLabel(lane.tag)}</strong>
              {lane.current ? (
                <small>{TENDENCY_CLASS_LABELS[lane.current.nature]}期</small>
              ) : (
                <small>—</small>
              )}
            </span>
            <div className="shijing-nianjing__lane-track">
              {lane.phases.map((band, i) => {
                const left = props.percentOf(band.start_date);
                const right = props.percentOf(band.end_date);
                const width = Math.max(0.5, right - left);
                const natureLabel = TENDENCY_CLASS_LABELS[band.nature];
                return (
                  <button
                    key={i}
                    type="button"
                    className="shijing-nianjing__band"
                    data-nature={band.nature}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    title={`${band.start_date} → ${band.end_date} · ${natureLabel}期 · 点按查看`}
                    aria-label={`${bandYearRangeLabel(band)} ${natureLabel}期,点按查看说明`}
                    onClick={() =>
                      props.onSelectDetail({ kind: 'band', band, tag: lane.tag })
                    }
                  >
                    <span className="shijing-nianjing__band-label">
                      {natureLabel}
                    </span>
                    <span className="shijing-nianjing__band-detail">
                      {bandYearRangeLabel(band)}
                    </span>
                  </button>
                );
              })}
              {lane.inflections.map((inflection, i) => {
                const left = props.percentOf(inflection.date);
                const kindLabel = INFLECTION_KIND_LABELS[inflection.kind];
                return (
                  <button
                    key={`marker-${i}`}
                    type="button"
                    className="shijing-nianjing__marker"
                    data-kind={inflection.kind}
                    style={{ left: `${left}%` }}
                    title={`${inflection.date} · ${kindLabel} · 点按查看`}
                    aria-label={`${inflection.date} ${kindLabel},点按查看说明`}
                    onClick={() =>
                      props.onSelectDetail({
                        kind: 'inflection',
                        inflection,
                        tag: lane.tag,
                      })
                    }
                  />
                );
              })}
            </div>
          </div>
        ))}
        {/* Vertical "现在" line laid across all lanes. The track region
         * starts at lane-label (96px) + grid gap (14px) = 110px and
         * spans the remaining width. The CSS calc projects nowPct
         * (0..100) onto that sub-range. */}
        <div
          className="shijing-nianjing__nowline"
          aria-hidden
          style={{
            left: `calc(110px + (100% - 110px) * ${(props.nowPct / 100).toFixed(4)})`,
          }}
        />
      </div>

      <ul className="shijing-nianjing__timeline-legend" aria-label="拐点 / 现在 图例">
        <li>
          <span className="shijing-nianjing__legend-marker" data-kind="dayun_boundary" aria-hidden />
          大运边界
        </li>
        <li>
          <span className="shijing-nianjing__legend-marker" data-kind="annual_transition" aria-hidden />
          流年切换
        </li>
        <li>
          <span className="shijing-nianjing__legend-marker" data-kind="marker_cluster" aria-hidden />
          多重节点
        </li>
        <li className="shijing-nianjing__legend-now">
          <span className="shijing-nianjing__legend-now-line" aria-hidden />
          现在
        </li>
      </ul>
    </article>
  );
}

// ===== 6) Right-side detail drawer ==================================
// Opens when the user clicks a phase band OR an inflection marker in
// the timeline. Visual treatment matches the YueJing day panel
// (flush-to-edge, nearly-opaque white glass, left-only border, soft
// leftward shadow, light white-wash backdrop). The two kinds share
// the same shell + close button + escape handling; only the body
// content differs.

function DetailDrawer(props: {
  readonly detail: SelectedDetail;
  readonly onClose: () => void;
  readonly onOpenArchive: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') props.onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [props]);

  const isBand = props.detail.kind === 'band';
  const ariaLabel = isBand
    ? `${TENDENCY_CLASS_LABELS[props.detail.band.nature]}期 详情`
    : `${INFLECTION_KIND_LABELS[props.detail.inflection.kind]} 详情`;

  return (
    <>
      <div
        className="shijing-nianjing__inflection-backdrop"
        onClick={props.onClose}
        role="presentation"
        aria-hidden
      />
      <aside
        className="shijing-nianjing__inflection-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        data-kind={props.detail.kind}
        data-nature={
          props.detail.kind === 'band' ? props.detail.band.nature : undefined
        }
      >
        <button
          type="button"
          className="shijing-nianjing__inflection-close"
          onClick={props.onClose}
          aria-label="关闭"
        >
          ✕
        </button>

        {isBand
          ? renderBandContent(
              props.detail.band,
              props.detail.tag,
              props.onClose,
              props.onOpenArchive,
            )
          : renderInflectionContent(
              props.detail.inflection,
              props.detail.tag,
              props.onClose,
              props.onOpenArchive,
            )}
      </aside>
    </>
  );
}

function renderBandContent(
  band: NianJingPhaseBand,
  tag: ConcernTag,
  onClose: () => void,
  onOpenArchive: () => void,
) {
  const natureLabel = TENDENCY_CLASS_LABELS[band.nature];
  const concernLabel = trimmedConcernLabel(tag);
  const guidance = NATURE_GUIDANCE[band.nature];
  const subst = (s: string): string => substituteConcernPlaceholder(s, concernLabel);

  return (
    <>
      <header className="shijing-nianjing__band-detail-head">
        <strong className="shijing-nianjing__band-detail-title">
          {bandYearRangeLabel(band)}
        </strong>
        <div className="shijing-nianjing__band-detail-pills">
          <span className="shijing-nianjing__band-detail-pill">{concernLabel}</span>
          <span
            className="shijing-nianjing__band-detail-pill"
            data-nature={band.nature}
          >
            {natureLabel}期
          </span>
        </div>
        <p className="shijing-nianjing__band-detail-oneline">
          <span
            className="shijing-nianjing__band-detail-oneline-icon"
            aria-hidden
          >
            ✦
          </span>
          {subst(guidance.oneLine)}
        </p>
      </header>

      <section className="shijing-nianjing__band-detail-card shijing-nianjing__band-detail-meaning">
        <h3>这一阶段代表什么?</h3>
        <p>{subst(guidance.meaning)}</p>
      </section>

      <section className="shijing-nianjing__band-detail-keywords">
        <h4>关键词</h4>
        <ul className="shijing-nianjing__band-detail-keyword-pills">
          {guidance.keywords.map((kw) => (
            <li key={kw}>{kw}</li>
          ))}
        </ul>
      </section>

      <section className="shijing-nianjing__band-detail-card shijing-nianjing__band-detail-suggestions">
        <h4>
          <span className="shijing-nianjing__band-detail-h4-dot" aria-hidden />
          适合做
        </h4>
        <ul>
          {guidance.suggestions.map((item, i) => (
            <li key={item.title}>
              <span
                className="shijing-nianjing__band-detail-item-num"
                aria-hidden
              >
                {i + 1}
              </span>
              <div>
                <strong>{subst(item.title)}</strong>
                <p>{subst(item.description)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="shijing-nianjing__band-detail-card shijing-nianjing__band-detail-cautions">
        <h4>
          <span
            className="shijing-nianjing__band-detail-h4-dot"
            data-tone="caution"
            aria-hidden
          />
          提醒
        </h4>
        <ul>
          {guidance.cautions.map((item) => (
            <li key={item.title}>
              <span
                className="shijing-nianjing__band-detail-caution-icon"
                aria-hidden
              >
                !
              </span>
              <div>
                <strong>{subst(item.title)}</strong>
                <p>{subst(item.description)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <footer className="shijing-nianjing__band-detail-footer">
        <div className="shijing-nianjing__band-detail-footer-row">
          <span className="shijing-nianjing__band-detail-footer-label">
            时间范围
          </span>
          <span className="shijing-nianjing__band-detail-footer-value">
            {formatDateDots(band.start_date)} → {formatDateDots(band.end_date)}
          </span>
        </div>
        <div className="shijing-nianjing__band-detail-footer-row">
          <span className="shijing-nianjing__band-detail-footer-label">
            生成依据
          </span>
          <span className="shijing-nianjing__band-detail-footer-value">
            基于当前关注主题「{concernLabel}」与年镜长程相位变化生成。
          </span>
        </div>
      </footer>

      <NianJingEventRecorder
        concernTag={tag}
        rangeStart={band.start_date}
        rangeEnd={band.end_date}
        onNavigatedAway={onClose}
        onOpenArchive={onOpenArchive}
      />
    </>
  );
}

function renderInflectionContent(
  inflection: NianJingInflectionPoint,
  tag: ConcernTag,
  onClose: () => void,
  onOpenArchive: () => void,
) {
  const kindLabel = INFLECTION_KIND_LABELS[inflection.kind];
  const description = INFLECTION_KIND_DESCRIPTIONS[inflection.kind];
  return (
    <>
      <header className="shijing-nianjing__inflection-head">
        <strong>{inflection.date}</strong>
        <small>
          <span
            className="shijing-nianjing__legend-marker"
            data-kind={inflection.kind}
            aria-hidden
          />
          {kindLabel} · {trimmedConcernLabel(tag)}
        </small>
      </header>

      <section className="shijing-nianjing__inflection-section">
        <h3>{kindLabel}是什么</h3>
        <p>{description}</p>
      </section>

      {inflection.summary ? (
        <section className="shijing-nianjing__inflection-section">
          <h3>本次提示</h3>
          <p>{inflection.summary}</p>
        </section>
      ) : null}

      {inflection.date_window ? (
        <section className="shijing-nianjing__inflection-section">
          <h3>影响窗口</h3>
          <p>
            {inflection.date_window.start_date}
            {' → '}
            {inflection.date_window.end_date}
          </p>
        </section>
      ) : null}

      <NianJingEventRecorder
        concernTag={tag}
        rangeStart={inflection.date}
        rangeEnd={inflection.date}
        fixedDate={inflection.date}
        heading="这个拐点前后发生过什么"
        onNavigatedAway={onClose}
        onOpenArchive={onOpenArchive}
      />
    </>
  );
}
