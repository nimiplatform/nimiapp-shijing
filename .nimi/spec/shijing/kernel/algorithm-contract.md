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
  | "qizheng_siyu_guolao_v1" // admitted — 七政四余 / 果老星宗
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

`qizheng_siyu_guolao_v1`: 七政四余 / 果老星宗 — 七政 uses astronomical
geocentric ecliptic longitudes for Sun, Moon, Mercury, Venus, Mars, Jupiter, and
Saturn; 四余 is admitted as a v1 virtual-point model: 罗喉 is the ascending lunar
node, 计都 is the descending lunar node, 月孛 is mean lunar apogee, and 紫气 is a
28-year virtual point with explicit epoch provenance. 宿度 is `28-equal-mansion-v1`,
an explicit v1 approximation and not a full traditional 距星 / 距度入宿 model.
Its implemented v1 product scope covers the MingJing natal route, RiJing,
YueJing, and NianJing common driver mappings, plus Relationship HePan
deterministic evidence. It strictly requires exact birth time and resolved birth
location/timezone. ShiJing consultation remains unsupported until its
method-specific deterministic driver mapping is admitted.

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
| `natal` | 命镜 whole-life scope: a deterministic 1-year window keyed to `anchor_year` (provenance only; the chart's real span is the DaYun sequence in `MingJingChart`, SJG-ALGO-16) |
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

The normative field-level shape for this envelope lives in [algorithm-feature-snapshot-shape.md](algorithm-feature-snapshot-shape.md). That appendix is part of SJG-ALGO-08 and carries no independent rule id.


Feature snapshots are not user-authored context and not AI output.
The appendix shapes are the minimal admitted shape for hashing, runtime AI wording
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

Display-authoritative on the 命镜 natal projection only (SJG-ALGO-16), and
tendency-neutral everywhere: 空亡 (旬空), 格局 label (月令取格), 五行分布. They are
surfaced for whole-life natal interpretation but must not drive any tendency
class, phase band, or inflection point, and are not part of the hashed
`AstrologyFeatureSnapshot` envelope the four time mirrors consume.

Non-authoritative v1 (computed-but-not-weighted, or omitted): 神煞, 岁运并临
flag. These must not drive tendency in v1.

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

## SJG-ALGO-16 - 命镜 Natal Projection (bazi_ziping_v1)

The 命镜 surface (SJG-IA-08) consumes a deterministic natal projection,
`MingJingChart`, derived by the `bazi_ziping_v1` engine from the self subject's
NatalCanonicalization. It is a live projection over already-persisted natal inputs
— NOT a persisted Reading (Reading remains the only persisted astrology output
entity) and NOT part of the hashed feature-snapshot envelope (SJG-ALGO-08). It
carries no tendency classes, luck scores, or rankable numeric series.

```text
MingJingChart {
  subject_ref: "self"
  canonicalization_hash: string
  natal_chart: NatalChartSnapshot          // four pillars + day master (SJG-ALGO-06)
  interpretation: BaziInterpretation        // 十神/藏干/纳音/十二长生/旺衰/用神/合冲 (SJG-ALGO-15)
  void: BaziVoid                            // 旬空 of the day pillar + per-pillar 空亡 flags
  five_elements: FiveElementDistribution    // weighted 五行 distribution (display only)
  pattern: BaziPattern                      // 月令取格 with 透干/通根/成破格 disposition
  dayun: DayunStructure                     // direction + 起运 + full period sequence
  liunian: LiuNianProjection                // salient future-year windows over a bounded horizon
  birth_precision: "exact"
}

BaziVoid {
  xun: string                               // the 旬 the day pillar belongs to (e.g. 甲子)
  void_branches: EarthBranch[]              // the two 旬空 branches
  void_positions: ("year"|"month"|"day"|"hour")[]   // natal pillars whose branch is 空亡
}

BaziPattern {
  name: string                              // 正官格 / 食神格 / 建禄格 / 阳刃格 / ...
  ten_god: string                           // 格 ten-god (月令本气/透出之神); empty for 禄刃
  source: "本气" | "透干" | "禄刃"           // how 月令取格 selected the 格
  transparent: boolean                      // 格神是否透干
  rooted: boolean                           // 格神是否通根月令
  disposition: "成格" | "假成" | "破格"
  basis: string[]
}

FiveElementDistribution {
  weighted: Record<Element, number>         // position-weighted scores (stems + 藏干)
  count: Record<Element, number>            // raw stem + 藏干 occurrences
  dominant: Element
  weakest: Element
  absent: Element[]                         // 五行缺
}

DayunStructure {
  required: true
  direction: "forward" | "reverse"          // 顺行 / 逆行
  start_age_years: number                   // 起运
  periods: DayunPeriodFeature[]             // full sequence (>= 8 steps)
}

DayunPeriodFeature {
  pillar: GanzhiPillar
  start_age: number; end_age: number
  start_year: number; end_year: number
  stem_ten_god: string                      // 十神 of the 大运 stem vs day master
  terrain: string                           // 日主 十二长生 at the 大运 branch
  nature: TendencyClass                     // 用神 favourability of the 大运 stem element
  favor: "喜" | "忌" | "平"
  natal_branch_relations: BaziBranchRelation[]   // 大运支 vs natal branches
  is_inflection: boolean                    // opens a 转折 (boundary / 冲提纲 / 冲日支)
  is_current: boolean
}

LiuNianProjection {
  horizon: { start_year: number; end_year: number }
  windows: LiuNianWindow[]                  // salient windows only — NOT every year
}

LiuNianWindow {
  start_year: number; end_year: number
  pillars: { year: number; pillar: GanzhiPillar }[]
  nature: TendencyClass
  favor: "喜" | "忌" | "平"
  salience: "high" | "medium"
  natal_branch_relations: BaziBranchRelation[]   // 流年支 vs 日支/月令
  dayun_pillar?: GanzhiPillar               // the 大运 the window sits in
  basis: string[]
}
```

Rules:

- 空亡 (旬空) is taken from the day pillar's 旬 (`getExtraEarthBranches`). A natal
  pillar is 空亡 when its branch is one of the two void branches.
- 格局 uses 月令取格: take the month-branch 本气 ten-god; when the 本气 is 比劫,
  classify 建禄格 (临官) or 阳刃格 (帝旺) by the day master's 十二长生 at the month
  branch; otherwise prefer a transparent (透干) 中/余气 over a non-transparent 本气.
  `disposition` is a deterministic 成/假成/破 heuristic from 透干 + 通根 + 月令逢冲.
- DaYun exposes the FULL sequence (>= 8 periods), not only the current period. Each
  period's `nature` is the 用神 favourability of its stem element (baziPeriodNature),
  never a blanket 转折.
- 流年 windows select only salient years over a bounded horizon (default: the anchor
  year through anchor + 12 years, clamped to the available DaYun span). Salience =
  strong 用神 favour/忌 of the year element, or 流年支 冲/合/三合/刑 with the 日支 or
  月令, or a DaYun boundary year. Non-salient years are omitted; the projection must
  not degrade into a year-by-year ledger (mirrors the SJG-ALGO-11 forbidden
  K-line/ledger constraint).
- The natal projection carries no tendency classes, K-line bars, numeric trend
  series, luck scores, or rankable numbers as authoritative data.

## SJG-ALGO-17 - Relationship HePan Evidence

Relationship HePan evidence is computed from the self subject and exactly one
related Person. The minimum evidence set is:

- both subject charts;
- pairwise branch interactions across year, month, day, and hour positions when
  available for the selected method;
- method-specific relationship direction evidence. For BaZi this is
  day-master element relation, ten-god direction, and yong-shen complement /
  depletion. For Ziwei this is 命宫 / 身宫 / 主星 / 五行局 relationship
  direction. For QiZheng SiYu this is ascendant, day/night luminary, house, and
  mansion relationship direction;
- anchor-year timing windows from both subjects' period markers when the method
  exposes them, or an explicit method-namespaced anchor-year fallback driver;
- uncertainty inputs for precision, location, consent, and related-person data.

Runtime AI must not compute or alter these evidence fields.

## SJG-ALGO-18 - Product Feature and MingJing Route Support

ShiJing has two support shapes. RiJing, YueJing, NianJing, and ShiJing
consultation are algorithm-neutral product features. MingJing is a route family:
the selected `MethodProfileId` resolves to a method-specific MingJing route.
This support declaration is product authority, not user data. Method switching
is allowed only inside these declared boundaries.

| Feature id | Product surface | Mirror kind | Scope kind | Supported method_profile_id values |
| --- | --- | --- | --- | --- |
| `rijing.daily_reading` | RiJing daily reading | `rijing` | `daily` | `bazi_ziping_v1`, `ziwei_sanhe_v1`, `qizheng_siyu_guolao_v1` |
| `yuejing.rolling_30_day_reading` | YueJing rolling-30-day reading | `yuejing` | `rolling_30_day` | `bazi_ziping_v1`, `ziwei_sanhe_v1`, `qizheng_siyu_guolao_v1` |
| `nianjing.long_horizon_reading` | NianJing long-horizon reading | `nianjing` | `long_horizon` | `bazi_ziping_v1`, `ziwei_sanhe_v1`, `qizheng_siyu_guolao_v1` |
| `shijing.consultation` | ShiJing consultation grounded in cited readings | `shijing` | `consultation` | `bazi_ziping_v1`, `ziwei_sanhe_v1` |

MingJing route registry:

| Route id | Method profile | Status | Supported route features |
| --- | --- | --- | --- |
| `mingjing.route.bazi_ziping_v1` | `bazi_ziping_v1` | `implemented` | `natal_projection`, `natal_reading`, `relationship_hepan` |
| `mingjing.route.ziwei_sanhe_v1` | `ziwei_sanhe_v1` | `implemented` | `natal_projection`, `natal_reading`, `relationship_hepan` |
| `mingjing.route.qizheng_siyu_guolao_v1` | `qizheng_siyu_guolao_v1` | `implemented` | `natal_projection`, `natal_reading`, `relationship_hepan` |

Rules:

- Before any deterministic feature snapshot or Runtime AI wording request for
  the four algorithm-neutral features, the implementation must resolve the
  active feature id from `mirror_kind` + `mirror_scope.kind` and validate it
  against the selected `method_profile_id`.
- If the selected method is admitted but unsupported for that feature,
  generation fails closed with stage `method_feature_support` and detail
  `method_feature_not_supported:<feature_id>:<method_profile_id>`, plus the
  supported alternatives when available. It must not continue to another
  method, synthesize a partial Reading, or ask Runtime AI to compensate.
- Before any MingJing live projection, MingJing Reading, or MingJing
  Relationship HePan generation, the implementation must resolve the selected
  MingJing route from `Settings.method_profile_id`.
- If the selected MingJing route is not implemented, generation fails closed
  with stage `mingjing_route_support` and detail
  `mingjing_route_not_implemented:<route_id>:<method_profile_id>`. It must not
  render another method's route, synthesize route output, or ask Runtime AI to
  compensate.
- If an implemented MingJing route does not support a specific route feature,
  generation fails closed with stage `mingjing_route_support` and detail
  `mingjing_route_feature_not_supported:<route_id>:<feature_id>`.
- A missing `Settings.method_profile_id` resolves to `bazi_ziping_v1`; an
  unadmitted persisted value is rejected by Settings validation before
  generation.
- Runtime AI model choice is orthogonal to both support declarations. A stronger
  or different AI model may change wording quality only; it cannot make an
  unsupported deterministic feature or unimplemented MingJing route supported.
- Historical Readings keep their frozen `inputs_summary.method_profile` and
  hashes. Switching the active method affects only new generation and live
  projections after the switch.
- `ziwei_sanhe_v1` is admitted for the three time-mirror readings,
  consultation over already-cited Ziwei readings, and MingJing Relationship
  HePan. Its MingJing route evidence comes from `ZiweiEvidence.self_subject`
  plus exactly one related `ZiweiSubjectChart`. Renderer modules may display
  the twelve-palace natal chart, decadal palace ranges, and method-namespaced
  `ziwei:relationship.*` HePan driver refs. Runtime AI may word only the
  admitted `ziwei_natal_brief` and `relationship_hepan` prose fields; it must
  not compute palaces, stars, 四化, 大限, or relationship evidence.
- `qizheng_siyu_guolao_v1` is admitted as a MingJing natal route and as a
  RiJing daily-reading and YueJing rolling-30-day method in this iteration. Its
  route evidence comes from
  `QizhengSiyuEvidence.self_subject`,
  renderer modules may display 七政四余星曜、十二宫落位、二十八宿区间 and the
  explicit 四余 model provenance. Renderer copy must translate raw model ids such
  as `equal-house-from-ascendant-v1` and `28-equal-mansion-v1` into product-facing
  labels, and must label `position_class` as 宫势 rather than a generic luck or
  score-like strength. Runtime AI may word only the admitted
  `qizheng_siyu_natal_brief` fields for MingJing. For RiJing and YueJing,
  `qizheng_siyu_guolao_v1` must derive deterministic per-concern tendency
  drivers from the selected concern domain's 七政四余 body, house, and 宫势.
  RiJing drivers target the daily scope date; YueJing drivers target the
  rolling-30-day scope `start_date` because YueJing generation is
  one-local-date-per-reading. NianJing drivers derive long-horizon phase bands
  and annual inflection markers from the selected concern domain's body, house,
  and position class without scores, curves, or rankable numeric series. These
  mirrors expose only method-namespaced opaque refs on the common driver
  surface. Relationship HePan derives deterministic
  `qizheng_siyu:relationship.*` driver refs from both subjects' ascendant,
  day/night luminary, houses, mansions, and key body evidence. Consultation
  generation fails closed until its method-specific deterministic driver mapping
  is admitted.
