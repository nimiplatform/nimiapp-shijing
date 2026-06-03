# SJG-ALGO - Astrology Algorithm Contract v1

## SJG-ALGO-01 - V1 Method Stack

ShiJing v1 uses exactly one method profile:

```text
AstrologyMethodProfile {
  id: "bazi_ganzhi_jieqi_dayun_v1"
  contract_version: "SJG-ALGO-v1"
  feature_schema_version: "SJG-FEATURE-v1"
}
```

The method stack includes BaZi four pillars, ganzhi cycles, jieqi boundaries,
DaYun where required, stage labels, YueJing tendency classes, and NianJing
phase/inflection derivation.

## SJG-ALGO-02 - Generation Pipeline

```text
NatalInputs
  -> NatalCanonicalization
  -> NatalChartSnapshot
  -> CycleSnapshot
  -> AstrologyFeatureSnapshot
  -> MirrorProjection
  -> Runtime AI wording
  -> validateReading
  -> persisted Reading
```

Deterministic stages own astrology calculation. Runtime AI owns wording only.
Any deterministic failure is a typed failure, never a successful Reading.

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

## SJG-ALGO-08 - Feature Snapshot

`AstrologyFeatureSnapshot` is deterministic evidence consumed by Runtime AI.

```text
AstrologyFeatureSnapshot {
  method_profile: AstrologyMethodProfile
  mirror_kind: "rijing" | "yuejing" | "nianjing" | "shijing"
  canonical_window: CanonicalMirrorWindow
  self_subject: SubjectFeatureSnapshot
  related_persons: SubjectFeatureSnapshot[]
  stage_drivers: StageDriver[]
  key_windows: KeyWindowFeature[]
  yuejing_tendency_drivers: YueJingTendencyDriver[]
  nianjing_phase_drivers: NianJingPhaseDriver[]
  nianjing_inflection_drivers: NianJingInflectionDriver[]
  uncertainty_inputs: UncertaintyInput[]
}

CanonicalMirrorWindow {
  start_utc: string
  end_utc: string
  basis_time_zone: string
  scope_kind: "daily" | "rolling_30_day" | "long_horizon" | "consultation"
}

SubjectFeatureSnapshot {
  subject_ref: SubjectRef
  natal_chart: NatalChartSnapshot
  dayun?: DayunSnapshot
  cycle_snapshot: CycleSnapshot
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
The field list above is the minimal admitted v1 shape for hashing, Runtime AI
wording input, validators, and evidence UI. W02 must not infer additional
feature snapshot fields from source code.

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

`input_hash` covers method profile, mirror scope, canonical natal inputs,
active concern tag snapshots, resolved person refs, eligible plan refs, cited
memory refs, response preference hash, and the deterministic mirror window.

`feature_snapshot_hash` covers the whole deterministic feature snapshot.

## SJG-ALGO-13 - Runtime AI Wording Boundary

Runtime AI receives only:

- deterministic feature snapshot,
- frozen MirrorContextSnapshot,
- allowed concern-tag prompt text as wording context,
- cited memory/plan summaries admitted by `memory-use-policy.yaml`,
- response preferences,
- the mirror output schema.

Runtime AI returns structured JSON matching the mirror output contract.

Forbidden:

- asking AI to calculate deterministic astrology features;
- accepting prose/markdown as successful Reading output;
- fallback copy when runtime is unavailable or parsing fails;
- letting concern-tag prompt text alter deterministic calculation.

## SJG-ALGO-14 - Implementation Boundary

This contract is source-of-truth for downstream implementation. This authority
cut does not modify source. W02+ must synchronize source contracts, validators,
state, persistence, runtime prompts/parsers, renderer surfaces, and tests.
