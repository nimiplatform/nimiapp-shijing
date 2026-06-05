# SJG-ALGO - Astrology Algorithm Contract v1

## SJG-ALGO-01 - Method Profile Registry

ShiJing is a multi-method 命理 platform. A `MethodProfile` identifies one
deterministic 命理 system. Profiles are a closed registry; user data never
defines, adds, or mutates a profile.

```text
MethodProfile {
  id: MethodProfileId
  contract_version: "SJG-ALGO-v1"
  feature_schema_version: "SJG-FEATURE-v2"
  ephemeris_version: string        // calendar/source provenance, e.g. "tyme4ts-1.5.0"
  interpretive_profile?: string    // e.g. "fuyi_tiaohou_v1" (admitted at Wave 2)
}

MethodProfileId =
  | "bazi_ziping_v1"   // admitted — 八字子平
  | "ziwei_sanhe_v1"   // admitted — 紫微斗数 (三合派)
```

`bazi_ziping_v1`: BaZi four pillars, ganzhi cycles, jieqi boundaries, DaYun,
stage labels, tendency classes, and NianJing phase/inflection derivation;
calendar provenance `tyme4ts-1.5.0`; interpretive profile `fuyi_tiaohou_v1`
(扶抑+调候 用神, SJG-ALGO-15); degrades gracefully on rough birth precision.

`ziwei_sanhe_v1`: 紫微斗数 三合派 — twelve palaces, major/minor stars with
brightness, 生年四化, 大限 (decadal), and 流年/流月/流日 飞星四化; calendar
provenance `iztro-2.5.x`. It strictly requires a birth time
(`requires_birth_time`) and fails closed when the hour is unknown, because 命宫
cannot otherwise be placed. Its long-horizon unit is 大限
(`horizon_unit = "daxian"`). The admitted v1 四化 school is 三合派 (iztro
default), captured as engine config and swappable without altering the common
surface.

Each profile is realized by a `MethodEngine` that (1) computes a method-private
deterministic chart (`method_evidence`) and (2) projects it onto the
algorithm-agnostic common driver surface (`SJG-ALGO-08`). Admitting a profile
must not alter the common surface, the runtime AI wording boundary, persistence,
or non-evidence UI. The selected profile id is part of `input_hash`
(`SJG-ALGO-12`), so the same inputs under different profiles are distinct,
independently reproducible Readings.

## SJG-ALGO-02 - Generation Pipeline

```text
NatalInputs
  -> NatalCanonicalization
  -> select MethodEngine            (by space method_profile_id; default bazi_ziping_v1)
  -> engine.computeEvidence         -> method_evidence (method-private chart)
  -> engine.deriveCommonDrivers     -> common (agnostic driver surface)
  -> AstrologyFeatureSnapshot { method_profile, common, method_evidence }
  -> MirrorProjection               (consumes common only)
  -> Runtime AI wording             (consumes common + allowed evidence projection)
  -> validateReading
  -> persisted Reading
```

Deterministic engines own all astrology calculation. Runtime AI owns wording
only. Any deterministic failure is a typed failure, never a successful Reading.

## SJG-ALGO-03 - Mirror Window Canonicalization

Mirror windows are derived from `MirrorScope`:

| Scope | Canonical window |
| --- | --- |
| `daily` | local civil day in `basis_time_zone` |
| `rolling_30_day` | exactly 30 local dates from `start_date` through `end_date` |
| `long_horizon` | admitted NianJing window from `tables/mirror-kind-scope-matrix.yaml` |
| `consultation` | union/summary of cited source reading scopes plus explicit question window when present |

All persisted hashes use ISO-8601 UTC instants derived from the local scope and
captured `basis_time_zone`.

NianJing does not admit arbitrary user-defined time containers. Its default
window is the next 10 years from the anchor year, and the only admitted
alternates are the presets listed in the mirror kind/scope table. A
consultation `question_window`, when present, is transient to that question and
must not become a reusable saved window.

## SJG-ALGO-04 - Natal Canonicalization

`NatalInputs` stores raw input evidence and canonical calculation input.

Rules:

- Gregorian input is preserved and canonicalized to UTC.
- Chinese lunar input must preserve leap-month evidence when ambiguous.
- Lunar conversion uses an admitted ephemeris table.
- True-solar correction is required where exact pillars are required.
- Source subject changes never mutate historical Reading summaries.

## SJG-ALGO-05 - True Solar Time

ShiJing v1 uses true solar time for pillar calculation:

```text
standard_meridian_longitude = utc_offset_hours_at_birth * 15
longitude_correction_minutes = (birth_longitude - standard_meridian_longitude) * 4
true_solar_time = local_standard_time
  + longitude_correction_minutes
  + equation_of_time_minutes
```

Missing location, timezone, or ephemeris data fails closed when exact pillars
are required.

## SJG-ALGO-06 - Pillars

Year pillar changes at Li Chun. Month pillar changes at the twelve `jie` solar
terms. Day pillar uses a deterministic sexagenary day index. Hour pillar uses
true-solar two-hour branches.

Missing precision removes dependent pillars according to `SJG-ALGO-10`.

## SJG-ALGO-07 - DaYun Predicate

DaYun is required for:

- every NianJing Reading;
- every YueJing Reading whose scope intersects a DaYun boundary;
- every ShiJing consultation that cites a DaYun-required source Reading;
- any mirror scope longer than 90 local days.

DaYun requires `calculation_sex`. If required and `calculation_sex` is
`unspecified`, generation fails closed.

## SJG-ALGO-08 - Feature Snapshot (Envelope)

`AstrologyFeatureSnapshot` is deterministic evidence. It is an envelope: an
algorithm-agnostic `common` driver surface plus a method-tagged, opaque
`method_evidence` container. Layer-3 consumers (MirrorProjection, runtime AI,
validators, persistence, non-evidence UI) bind to `common` and `method_profile`
only; `method_evidence` is opaque to them except dedicated evidence views that
switch on `method_id`. Every `subject_ref` a renderer needs is carried inside
`common.*`, so "who" is never read from `method_evidence`. `driver_refs` are
opaque, method-namespaced evidence keys (e.g. `bazi:branch.相冲@<utc>`) and must
not be parsed by Layer 3.

```text
AstrologyFeatureSnapshot {
  method_profile: MethodProfile
  mirror_kind: "rijing" | "yuejing" | "nianjing" | "shijing"
  canonical_window: CanonicalMirrorWindow
  common: CommonDrivers
  method_evidence: MethodEvidence
}

CommonDrivers {
  stage_drivers: StageDriver[]
  key_windows: KeyWindowFeature[]
  yuejing_tendency_drivers: YueJingTendencyDriver[]
  nianjing_phase_drivers: NianJingPhaseDriver[]
  nianjing_inflection_drivers: NianJingInflectionDriver[]
  uncertainty_inputs: UncertaintyInput[]
}

MethodEvidence =
  | { method_id: "bazi_ziping_v1"; bazi: BaziEvidence }
  | { method_id: "ziwei_sanhe_v1"; ziwei: ZiweiEvidence }

CanonicalMirrorWindow {
  start_utc: string
  end_utc: string
  basis_time_zone: string
  scope_kind: "daily" | "rolling_30_day" | "long_horizon" | "consultation"
}

BaziEvidence {
  self_subject: BaziSubjectChart
  related_persons: BaziSubjectChart[]
}

BaziSubjectChart {
  subject_ref: SubjectRef
  natal_chart: NatalChartSnapshot
  dayun?: DayunSnapshot
  cycle_snapshot: CycleSnapshot
  interpretation?: BaziInterpretation   // bazi_ziping_v1 interpretive layer (SJG-ALGO-15)
}

BaziInterpretation {
  pillars: BaziPillarFeatures[]         // present pillars only
  strength: BaziStrength
  yong_shen: YongShen
  natal_branch_relations: BaziBranchRelation[]   // 合冲刑害破 among natal branches
}

BaziPillarFeatures {
  position: "year" | "month" | "day" | "hour"
  ten_god: string                       // 十神 of the stem vs day master (日柱 → 比肩)
  hidden_stems: HiddenStem[]            // 藏干, primary → residual
  nayin: string                         // 纳音
  terrain: string                       // 日主 十二长生 at this branch
}

HiddenStem {
  stem: string
  weight_class: "primary" | "middle" | "residual"   // 本气 | 中气 | 余气
}

BaziStrength {
  band: "极弱" | "偏弱" | "中和" | "偏强" | "极强"
  support_ratio: number                 // bounded 0..1 ordinal evidence, NOT a luck score
  basis: string[]
}

YongShen {
  yong: Element[]                       // 用神
  xi: Element[]                         // 喜神
  ji: Element[]                         // 忌神
  tiaohou?: Element                     // 调候用神 when the season is extreme
  basis: string[]
}

BaziBranchRelation {
  kind: "六合" | "三合" | "相冲" | "相害" | "相刑" | "相破"
  positions: ("year" | "month" | "day" | "hour")[]
}

Element = "wood" | "fire" | "earth" | "metal" | "water"

ZiweiEvidence {
  self_subject: ZiweiSubjectChart
  related_persons: ZiweiSubjectChart[]
}

ZiweiSubjectChart {
  subject_ref: SubjectRef
  five_elements_class: string   // 五行局, e.g. "火六局"
  soul_star: string             // 命主
  body_star: string             // 身主
  soul_palace_branch: string    // 命宫地支
  palaces: ZiweiPalace[]        // twelve, in fixed branch order
}

ZiweiPalace {
  index: number
  name: string                  // 命宫 | 兄弟 | 夫妻 | ... | 父母
  heavenly_stem: string
  earthly_branch: string
  is_soul: boolean
  is_body: boolean
  major_stars: ZiweiStar[]
  minor_stars: ZiweiStar[]
  decadal_start_age: number     // 大限 start age for this palace
  decadal_end_age: number
}

ZiweiStar {
  name: string
  brightness: string            // 庙旺得利平不陷 (may be empty)
  mutagen: "" | "禄" | "权" | "科" | "忌"   // 生年四化
}

NatalChartSnapshot {
  subject_ref: SubjectRef
  canonicalization_hash: string
  year_pillar?: GanzhiPillar
  month_pillar?: GanzhiPillar
  day_pillar?: GanzhiPillar
  hour_pillar?: GanzhiPillar
  day_master?: string
  missing_pillars: ("year" | "month" | "day" | "hour")[]
}

GanzhiPillar {
  stem: string
  branch: string
}

DayunSnapshot {
  required: boolean
  direction?: "forward" | "reverse"
  start_age_years?: number
  current_period_start_utc?: string
  current_period_end_utc?: string
  current_pillar?: GanzhiPillar
}

CycleSnapshot {
  window_start_utc: string
  window_end_utc: string
  annual_pillar?: GanzhiPillar
  monthly_pillars: TimedPillar[]
  daily_pillars: TimedPillar[]
  markers: CycleMarker[]
}

TimedPillar {
  start_utc: string
  end_utc: string
  pillar: GanzhiPillar
}

CycleMarker {
  kind: string
  strength: "low" | "medium" | "high"
  start_utc: string
  end_utc: string
  subject_refs: SubjectRef[]
  source: "natal" | "dayun" | "annual" | "monthly" | "daily"
}

StageDriver {
  stage_label: "进时" | "收时" | "养时" | "转时" | "守时"
  marker_refs: string[]
  explanation_key: string
}

KeyWindowFeature {
  start_utc: string
  end_utc: string
  label: "transition" | "support" | "closure" | "maintenance"
  driver_refs: string[]
  subject_refs: SubjectRef[]
}

YueJingTendencyDriver {
  date: string
  concern_tag_ref: string
  tendency_class: "supportive" | "steady" | "watch" | "blocked" | "turning"
  driver_refs: string[]
}

NianJingPhaseDriver {
  concern_tag_ref: string
  start_date: string
  end_date: string
  nature: "supportive" | "steady" | "watch" | "blocked" | "turning"
  driver_refs: string[]
}

NianJingInflectionDriver {
  concern_tag_ref: string
  date: string
  date_window?: { start_date: string; end_date: string }
  kind: "dayun_boundary" | "annual_transition" | "monthly_transition" | "marker_cluster"
  driver_refs: string[]
}

UncertaintyInput {
  code: string
  severity: "info" | "caveat" | "degrade" | "fail_close"
  subject_ref?: SubjectRef
}
```

Feature snapshots are not user-authored context and not AI output.
The shapes above are the minimal admitted shape for hashing, runtime AI wording
input, validators, and evidence UI. `common` is the only algorithm-agnostic
surface; `method_evidence` shapes are owned by each engine and admitted with that
engine (BaZi here; 紫微 `ZiweiEvidence` is admitted with `ziwei_sanhe_v1`).
Implementations must not infer additional feature snapshot fields beyond the
admitted shapes.

## SJG-ALGO-09 - Stage Labels and YueJing Tendency Classes

Stage labels are product language over deterministic features:

- `进时`
- `收时`
- `养时`
- `转时`
- `守时`

YueJing tendency class is exactly one of:

- `supportive`
- `steady`
- `watch`
- `blocked`
- `turning`

Tendency classes are bounded ordinal labels for UI grouping. They are not
numeric scores, ranks, percentiles, or curve points.

## SJG-ALGO-10 - Uncertainty Decision Table

| Condition | Result |
| --- | --- |
| exact birth inputs and required pillars available | max confidence `high` |
| `rough_day` | max confidence `medium`; omit hour pillar |
| `rough_month` | max confidence `low`; fail closed for DaYun-required mirrors |
| `rough_year` | fail closed for RiJing, YueJing, NianJing, and runtime consultation |
| `unknown` | fail closed except data-entry repair |
| missing location/timezone/ephemeris when exact pillars required | fail closed |
| DaYun required and `calculation_sex === "unspecified"` | fail closed |
| related Person consent withheld | max confidence `medium`; add caveat |
| unresolved person mention in active ConcernTag | omit person chart and add caveat |
| incomplete related-person natal inputs | omit person chart or fail closed when relation-specific output is requested |
| no active concern tags | fail closed for mirror generation |
| memory retrieval unavailable | proceed only when memory is optional; disclose unavailability |
| Runtime AI parse or validation failure | fail closed |

Confidence can only be lowered by later stages.

This table is the `bazi_ziping_v1` baseline. Each engine may tighten it through
its `capabilities` (e.g. an engine with `requires_birth_time` fails closed when
the hour is unknown instead of degrading, because it cannot place its primary
palace). An engine must not loosen a fail-closed condition.

## SJG-ALGO-11 - NianJing Phase and Inflection Derivation

NianJing derives discrete phase bands and inflection points from deterministic
cycle, DaYun, annual, and monthly markers.

Rules:

- A phase band has `concern_tag_ref`, `start_date`, `end_date`, `nature`,
  `driver_refs`, and `summary`.
- An inflection point has `concern_tag_ref`, `date`, optional `date_window`,
  `kind`, `driver_refs`, and `summary`. `date_window` is allowed only for a
  bounded marker window and must not become a reusable time container.
- Phase bands and inflection points are authoritative.
- Curves, K-line bars, numeric trend series, luck scores, and rankable numbers
  are forbidden as authoritative data.

## SJG-ALGO-12 - Canonical Hashing

`input_hash` and `feature_snapshot_hash` use:

```text
hash_algorithm = "sha256"
canonical_serialization = "json-c14n-v1"
unicode_normalization = "NFC"
encoding = "utf-8"
digest_format = "hex-lowercase"
```

`input_hash` covers the selected `method_profile.id`, mirror scope, canonical
natal inputs, active concern tag snapshots, resolved person refs, eligible plan
refs, cited memory refs, response preference hash, and the deterministic mirror
window. The profile id is included so the same inputs under different profiles
hash distinctly.

`feature_snapshot_hash` covers the whole envelope (`method_profile`, `common`,
and `method_evidence`).

## SJG-ALGO-13 - Runtime AI Wording Boundary

Runtime AI receives only:

- the feature snapshot `common` driver surface,
- a read-only, method-namespaced evidence projection (display labels only; no
  recompute hooks),
- frozen MirrorContextSnapshot,
- allowed concern-tag prompt text as wording context,
- cited memory/plan summaries admitted by `memory-use-policy.yaml`,
- response preferences,
- the mirror output schema.

Runtime AI returns structured JSON matching the mirror output contract.

Forbidden:

- asking AI to calculate deterministic astrology features (pillars, palaces,
  DaYun/DaXian, solar terms, 四化, stage labels, tendency classes, phase bands,
  inflection points);
- reading raw `method_evidence` to re-derive any common driver;
- accepting prose/markdown as successful Reading output;
- fallback copy when runtime is unavailable or parsing fails;
- letting concern-tag prompt text alter deterministic calculation.

## SJG-ALGO-14 - Implementation Boundary

This contract is source-of-truth for downstream implementation. The
kernel-refactor waves (`.nimi/local/kernel-refactor/`) synchronize source
contracts, validators, state, persistence, runtime prompts/parsers, engine
adapters, renderer surfaces, and tests to this contract. Source and this contract
must not diverge at a wave checkpoint.

## SJG-ALGO-15 - BaZi Interpretive Layer (fuyi_tiaohou_v1)

The `bazi_ziping_v1` profile carries `interpretive_profile = "fuyi_tiaohou_v1"`
(扶抑为主 + 调候为辅). The layer is deterministic method evidence consumed by the
engine's tendency derivation; it never appears as a numeric luck score in Reading
output.

Authoritative v1 features (`BaziInterpretation`): 十神 per pillar; 藏干 with
本/中/余气 weight class; 纳音; 十二长生 (day-master terrain per branch); 日主旺衰 as
a bounded band 极弱..极强 with a 0..1 support_ratio; 用神/喜神/忌神; 合冲刑害破 among
natal branches.

Non-authoritative v1 (computed-but-not-weighted, or omitted): 神煞, 空亡, 格局
label, 岁运并临 flag. These must not drive tendency in v1.

Strength (扶抑): score each stem and each branch 藏干 by its element relation to the
day master (生我/同我 support; 我生/我克/克我 drain), weighted by position (月令
dominant, then 日支, then others) and 藏干 weight class; `support_ratio =
support / (support + drain)`; band by fixed thresholds.

用神 (扶抑 + 调候):
- 身强 (偏强/极强) → 用神 = 克泄耗 (官杀/食伤/财); 忌 = 生扶 (印/比劫);
- 身弱 (偏弱/极弱) → 用神 = 生扶 (印/比劫); 忌 = 克泄耗;
- 中和 → balancing element, 调候-led;
- 调候: extreme-season charts (冬→火 暖, 夏→水 润) add the climate element to 喜神
  unless it is the primary 忌神.

Tendency (用神-driven, replaces the v1 lookup tables): a transit element favourable
to 用神/喜神 → supportive; primary 忌神 → blocked; other 忌神 → watch; neutral →
steady; 冲提纲 / 岁运并临 / 大运·流年 boundary → turning. The concern's life domain
selects the relevant 十神 focus (per-concern, so two concerns may diverge on the
same date) but does not override 用神 favourability.

Correctness invariant: for a fixed transit element that is 财 to the day master, a
身强 chart yields a favourable tendency and a 身弱 chart an unfavourable one.
