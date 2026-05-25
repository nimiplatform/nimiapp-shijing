# SJG-ALGO — Astrology Algorithm Contract v1

> Product authority for how ShiJing generates a `Reading`. This contract
> freezes the deterministic astrology method stack and the AI boundary. It is
> not source implementation.

## SJG-ALGO-01 — V1 Method Stack

ShiJing v1 uses exactly one astrology method profile:

```text
AstrologyMethodProfile {
  id: "bazi_ganzhi_jieqi_dayun_v1"
  contract_version: "SJG-ALGO-v1"
  feature_schema_version: "SJG-FEATURE-v1"
}
```

The v1 method stack is:

1. BaZi / four pillars from canonicalized birth time;
2. sexagenary stem-branch cycles;
3. solar-term month and year boundaries;
4. DaYun for long-window and View Readings;
5. five ShiJing stage labels (`进时`, `收时`, `养时`, `转时`, `守时`) as
   product interpretation over deterministic cycle features.

Western astrology, Zi Wei Dou Shu, randomized fortune text, numeric scoring,
and provider/model-specific reasoning are not part of v1. Adding another method
stack is an admitted Algorithm Contract change.

## SJG-ALGO-02 — Generation Pipeline

A successful Reading generation MUST follow this pipeline:

```text
NatalInputs
  -> NatalCanonicalization
  -> NatalChartSnapshot
  -> CycleSnapshot
  -> AstrologyFeatureSnapshot
  -> Runtime AI wording
  -> validateReading
  -> persisted Reading
```

The deterministic stages own astrology calculation. Runtime AI owns wording
only. Runtime AI MUST NOT derive pillars, DaYun, cycle windows, stage labels, or
key windows directly from raw birth data.

If any deterministic stage cannot produce its required output, generation
fails with a typed error. ShiJing MUST NOT return substitute text, canned
fortune copy, partial success, or a successful Reading without deterministic
feature evidence.

## SJG-ALGO-03 — Reading Time Window

Every Reading carries a `ReadingTimeWindow`.

```text
ReadingTimeWindow {
  mode: "bounded" | "natal"
  start_utc?: string
  end_utc?: string
  basis_time_zone: string
  source: "kind_default" | "view_time_scope" | "user_selected" | "ad_hoc_question"
}
```

Invariants:

- `mode === "bounded"` requires `start_utc < end_utc`, both ISO-8601 UTC.
- `mode === "natal"` forbids `start_utc` and `end_utc`; it is allowed only
  for `kind === "sign"`.
- `basis_time_zone` is the user-facing local timezone used to interpret
  "today", month boundaries, and user-selected windows. It is captured at
  Reading creation time and never inferred later.

Default windows:

| Reading kind / scope | Default time window |
|---|---|
| `today / subject` | the local civil day in `basis_time_zone` |
| `sign / subject` | `mode="natal"` |
| `period_outlook / subject` | next 30 local days |
| `period_outlook / view` + `bounded` View | View bounded range |
| `period_outlook / view` + `rolling` View | next `rolling_window_days` local days |
| `period_outlook / view` + `open_ended` View | next 180 local days |
| `key_window / view` | next 90 local days unless View bounded range is shorter |
| `key_window / ad_hoc` | next 90 local days unless user states a narrower window |
| `consultation` | question-specified window; otherwise next 30 local days |

Persistence and AI prompt assembly MUST NOT create or reuse a Reading without
this window.

## SJG-ALGO-04 — Natal Canonicalization

`NatalInputs` stores both canonical calculation input and the raw user input
evidence.

```text
RawBirthInput {
  calendar_system: "gregorian" | "lunar_chinese"
  local_date_text: string
  local_time_text?: string
  lunar_year?: number
  lunar_month?: number
  lunar_day?: number
  lunar_is_leap_month?: boolean
  place_text?: string
}

NatalCanonicalization {
  raw_birth_input: RawBirthInput
  canonical_birth_datetime_utc: string
  canonical_birth_precision: BirthPrecision
  true_solar_time_utc?: string
  standard_meridian_longitude?: number
  longitude_correction_minutes?: number
  equation_of_time_minutes?: number
  calendar_conversion_source: "input_gregorian" | "lunar_to_gregorian"
  ephemeris_version: string
  status: "exact" | "approximate" | "insufficient"
}
```

Rules:

- Gregorian input is preserved as raw input and canonicalized to UTC.
- Chinese lunar input MUST preserve `lunar_is_leap_month`; lunar input without
  leap-month evidence is invalid when the lunar month is ambiguous.
- Lunar-to-Gregorian conversion uses the admitted ephemeris table named in
  `ephemeris_version`. If the table is unavailable, canonicalization fails
  closed.
- Canonicalization output is captured in `InputsSummary` by hash and by
  feature snapshot; source-of-truth subject changes do not mutate an existing
  Reading.

## SJG-ALGO-05 — True Solar Time

ShiJing v1 uses true solar time for pillar calculation.

For a birth instant with known longitude and IANA timezone:

```text
standard_meridian_longitude = utc_offset_hours_at_birth * 15
longitude_correction_minutes = (birth_longitude - standard_meridian_longitude) * 4
true_solar_time = local_standard_time
  + longitude_correction_minutes
  + equation_of_time_minutes
```

`equation_of_time_minutes` comes from the admitted ephemeris version, not from
AI or provider output.

If birth location, timezone, or ephemeris data is missing, any Reading that
requires exact pillars fails closed. Readings that can legally proceed with
approximate pillars MUST lower confidence and record the missing field in
`uncertainty.data_gaps`.

## SJG-ALGO-06 — Pillars

`NatalChartSnapshot` contains the deterministically derived four-pillar
evidence:

```text
NatalChartSnapshot {
  subject: SubjectRef
  method_profile: AstrologyMethodProfile
  canonicalization_hash: string
  year_pillar?: GanzhiPillar
  month_pillar?: GanzhiPillar
  day_pillar?: GanzhiPillar
  hour_pillar?: GanzhiPillar
  day_master?: HeavenlyStem
  missing_pillars: ("year" | "month" | "day" | "hour")[]
}

GanzhiPillar {
  stem: HeavenlyStem
  branch: EarthlyBranch
}
```

Rules:

- Year pillar changes at Li Chun, not at lunar new year.
- Month pillar changes at the twelve `jie` solar terms, not at civil month
  boundaries.
- Day pillar uses a deterministic sexagenary day index from the admitted
  ephemeris.
- Hour pillar uses true solar time two-hour branches; hour stem is derived
  from day stem.
- Missing hour precision removes only the hour pillar. Missing day precision
  removes day and hour pillars. Missing month precision removes month, day,
  and hour pillars.

## SJG-ALGO-07 — DaYun

DaYun is required for:

- every View-scoped `period_outlook`;
- every View-scoped `key_window`;
- every subject or ad-hoc `period_outlook` whose window is longer than
  90 days.

DaYun requires `calculation_sex`.

```text
calculation_sex: "male" | "female" | "unspecified"
```

If DaYun is required and `calculation_sex === "unspecified"`, generation fails
closed with a missing-input error. The UI may ask the user for this field; AI
must not infer it.

Direction rule:

```text
forward = (calculation_sex == "male" and birth_year_stem is yang)
       or (calculation_sex == "female" and birth_year_stem is yin)
reverse = otherwise
```

Start rule:

- Forward DaYun measures from canonical true solar birth time to the next
  `jie` solar term.
- Reverse DaYun measures from canonical true solar birth time to the previous
  `jie` solar term.
- Conversion uses `3 solar days = 1 DaYun year`.
- The computed start age, start timestamp, direction, and current DaYun pillar
  are stored in `AstrologyFeatureSnapshot`.

## SJG-ALGO-08 — Feature Snapshot

`AstrologyFeatureSnapshot` is deterministic evidence consumed by AI wording.

```text
AstrologyFeatureSnapshot {
  method_profile: AstrologyMethodProfile
  time_window: ReadingTimeWindow
  subjects: SubjectFeatureSnapshot[]
  relation_features: RelationFeatureSnapshot[]
  stage_label: "进时" | "收时" | "养时" | "转时" | "守时"
  key_windows: KeyWindowFeature[]
  uncertainty_inputs: UncertaintyInput[]
}

SubjectFeatureSnapshot {
  subject: SubjectRef
  natal_chart: NatalChartSnapshot
  dayun?: DayunSnapshot
  cycle_snapshot: CycleSnapshot
  stage_drivers: StageDriver[]
}

DayunSnapshot {
  required: boolean
  direction?: "forward" | "reverse"
  start_age_years?: number
  start_utc?: string
  current_period_start_utc?: string
  current_period_end_utc?: string
  current_pillar?: GanzhiPillar
  next_boundary_utc?: string
}

CycleSnapshot {
  window_start_utc: string
  window_end_utc: string
  annual_pillar?: GanzhiPillar
  monthly_pillars: TimedPillar[]
  daily_pillars: TimedPillar[]
  active_markers: CycleMarker[]
}

TimedPillar {
  start_utc: string
  end_utc: string
  pillar: GanzhiPillar
}

CycleMarker {
  kind:
    "dayun_boundary"
    | "annual_transition"
    | "monthly_transition"
    | "clash"
    | "combination"
    | "storage"
    | "resource"
    | "output"
    | "wealth"
    | "constraint"
  strength: "low" | "medium" | "high"
  start_utc: string
  end_utc: string
  subjects: SubjectRef[]
  source: "natal" | "dayun" | "annual" | "monthly" | "daily"
}

RelationFeatureSnapshot {
  from_subject: SubjectRef
  to_subject: SubjectRef
  relation_kind: string
  interaction_markers: CycleMarker[]
  anchor_relevance: "primary" | "context"
}

StageDriver {
  stage_label: "进时" | "收时" | "养时" | "转时" | "守时"
  marker_kind: CycleMarker.kind
  strength: "low" | "medium" | "high"
  explanation_key: string
}

KeyWindowFeature {
  start_utc: string
  end_utc: string
  label: "transition" | "support" | "closure" | "maintenance"
  driver: string
  subjects: SubjectRef[]
}

UncertaintyInput {
  code:
    "birth_precision_exact"
    | "birth_precision_rough_day"
    | "birth_precision_rough_month"
    | "birth_precision_rough_year"
    | "birth_precision_unknown"
    | "location_missing"
    | "timezone_missing"
    | "ephemeris_missing"
    | "calculation_sex_unspecified"
    | "consent_withheld"
    | "view_context_sparse"
    | "ai_parse_failed"
  severity: "info" | "caveat" | "degrade" | "fail_close"
  subject?: SubjectRef
}
```

Feature snapshots are not user-authored context and are not AI output. They are
deterministic calculation evidence. A persisted Reading stores the snapshot or
its immutable hash inside `inputs_summary`.

Nested feature snapshot types above are closed for v1. Additional marker kinds,
driver categories, or uncertainty input codes require an Algorithm Contract
change.

## SJG-ALGO-09 — Stage Label Assignment

Stage labels are product language over deterministic features. They are not
scores and do not form a curve.

Assignment priority:

1. `转时` when the time window contains a DaYun boundary, annual/monthly pillar
   transition, or major clash marker involving the anchor subject.
2. `收时` when closure, depletion, storage, or constraint markers dominate the
   anchor subject's cycle features.
3. `进时` when output, wealth, expansion, or forward-action markers dominate
   and no higher-priority transition/closure marker is active.
4. `养时` when resource, self-support, recovery, or low-action markers dominate.
5. `守时` when none of the above dominates and the feature snapshot is stable.

Tie-break order is exactly:

```text
转时 > 收时 > 进时 > 养时 > 守时
```

Renderer text MUST use qualified forms such as `守时阶段` or `守时·第 N 天`.

## SJG-ALGO-10 — Uncertainty Decision Table

The generator maps deterministic input quality to `UncertaintyAnnotation`.

| Condition | Result |
|---|---|
| `birth_precision === "exact"` and all required pillars available | max confidence `high`; add `birth_precision_exact` |
| `birth_precision === "rough_day"` | max confidence `medium`; omit hour pillar; add `birth_precision_rough_day` |
| `birth_precision === "rough_month"` | max confidence `low`; omit day/hour pillars; fail closed for DaYun-dependent Reading; add `birth_precision_rough_month` |
| `birth_precision === "rough_year"` | fail closed for every Reading except `sign`; add `birth_precision_rough_year` |
| `birth_precision === "unknown"` | fail closed for every Reading except manual data-entry repair flow; add `birth_precision_unknown` |
| missing location/timezone/ephemeris when exact pillars required | fail closed |
| DaYun required and `calculation_sex === "unspecified"` | fail closed |
| Person `consent_state === "withheld"` | max confidence `medium`; add consent caveat |
| View has empty `context_items` and empty `view_memory.summary` | max confidence `medium`; add `view_context_sparse` |
| AI parse fails or output violates Astrology Contract | fail closed |

Confidence can only be lowered by later stages, never raised beyond this table.

## SJG-ALGO-11 — Canonical Hashing

`input_hash` and `feature_snapshot_hash` use:

```text
hash_algorithm = "sha256"
canonical_serialization = "json-c14n-v1"
unicode_normalization = "NFC"
encoding = "utf-8"
digest_format = "hex-lowercase"
```

Canonical serialization rules:

1. Object keys are sorted lexicographically by Unicode code point.
2. Arrays preserve order.
3. Strings are normalized to NFC before encoding.
4. `undefined`, comments, and transient UI fields are omitted.
5. Numbers are finite JSON numbers; `NaN`, `Infinity`, and `-Infinity` are
   invalid.
6. Dates are ISO-8601 UTC strings with `Z`.

Hash inputs:

- `input_hash` covers `method_profile`, `time_window`,
  `NatalCanonicalization` for each subject, selected relation summaries,
  selected event summaries, and View/ad-hoc context snapshot.
- `feature_snapshot_hash` covers the entire `AstrologyFeatureSnapshot`.

Hash values are evidence, not security credentials. They exist so persistence,
expiry checks, and audit views can determine whether a Reading was generated
from the same contract inputs.

## SJG-ALGO-12 — Runtime AI Wording Boundary

Runtime AI receives only:

- the `AstrologyFeatureSnapshot`;
- allowed user/View context;
- response preferences;
- the Astrology Contract output schema.

Runtime AI returns JSON matching `AstrologyOutput`. The caller parses JSON,
validates it with `validateReading`, and persists only a valid Reading.

Forbidden:

- asking AI to calculate pillars, DaYun, true solar time, stage labels, or key
  windows;
- passing provider/model choices from ShiJing product code;
- accepting markdown/prose as a successful Reading payload;
- fallback copy when runtime is unavailable or JSON parse fails.

If Nimi runtime session projection is unavailable, Reading generation fails
with typed runtime-unavailable state. It must not render a fabricated Reading.

## SJG-ALGO-13 — Implementation Boundary

This contract is source-of-truth for future implementation. The current
spec-only wave does not modify source files. Any downstream persistence,
runtime, or renderer wave that consumes `Reading` MUST first synchronize source
contracts and validators with this Algorithm Contract.
