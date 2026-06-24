# SJG-ASTRO - Astrology Contract v1

## SJG-ASTRO-01 - Mirror Kinds

`Reading.mirror_kind` is exactly one of:

- `rijing`: daily mirror.
- `yuejing`: rolling 30-day mirror.
- `nianjing`: long-horizon phase and inflection mirror.
- `mingjing`: whole-life natal AI 解读 grounded in the deterministic natal
  projection (SJG-ALGO-16). Self-anchored; no concern tags required.
- `shijing`: consultation mirror grounded in cited readings.

## SJG-ASTRO-02 - Mirror Scopes

`Reading.mirror_scope.kind` is exactly one of:

- `daily`
- `rolling_30_day`
- `long_horizon`
- `natal` (命镜 only; whole-life, anchored by `anchor_year`, not a transit window)
- `relationship_natal`
- `consultation`

Valid kind/scope pairings are listed in
`tables/mirror-kind-scope-matrix.yaml`.

## SJG-ASTRO-03 - Output Structure

`Reading.output` is a discriminated `MirrorOutput` whose required shape is
listed in `tables/mirror-output-contract.yaml`.

Common invariants:

- Output must be structured JSON, not prose-only markdown.
- Output must cite any event memory or plan item it uses.
- Output must not include fields outside the admitted mirror output contract.
- Runtime AI wording may fill prose fields only after deterministic feature
  snapshots exist.

## SJG-ASTRO-04 - RiJing Output

RiJing output contains:

- daily overview,
- per-active-concern projection blocks,
- bounded tendency class,
- evidence citations,
- optional cited memory and plan refs.

RiJing is self-anchored and may include related persons only when active
concern tags or cited context resolve them.

## SJG-ASTRO-05 - YueJing Output

YueJing output is generated and persisted one local date at a time:

- `Reading.mirror_scope.kind` remains `rolling_30_day`; its `start_date`
  is the local date being generated and its `end_date` is the 30-day
  context boundary,
- each persisted YueJing Reading contains cells only for the scope
  `start_date`,
- one or more active concern-tag projections may exist for that local date,
- tendency class from the closed set in `SJG-ALGO-09`,
- detail payloads for the generated date,
- cited plan and memory refs when used.

The YueJing calendar surface is assembled by aggregating multiple persisted
YueJing Readings over the visible 30-day window. Empty dates remain ungenerated
until explicitly or automatically generated; Runtime AI must not be asked to
word 30 dates in a single request.

Tendency classes are not numeric scores, rankings, or curve inputs.

## SJG-ASTRO-06 - NianJing Output

NianJing output contains:

- phase bands by concern tag,
- inflection points by concern tag,
- deterministic reasons / citation keys,
- wording summaries.

NianJing must not output authoritative curves, K-line bars, trend charts,
numeric luck scores, rankable yearly/day-level numbers, or aggregatable
score series. Phase bands and inflection points are the only authoritative
visual data.

## SJG-ASTRO-07 - ShiJing Consultation Output

ShiJing consultation output is grounded in `source_reading_ids[]`.

It may:

- explain cited readings,
- compare cited mirror results,
- answer user questions using cited readings and eligible memory refs,
- propose reflection language.

It must not:

- create a new astrology output entity outside `Reading`,
- mutate deterministic facts,
- infer missing natal inputs,
- pretend uncited memory influenced the answer.

## SJG-ASTRO-08 - Forbidden Outputs

Reading output must not include:

- numeric luck scores, luck deltas, luck curves, percentiles, ranks, or 0-100 /
  0-10 scales;
- reports, monthly reports, yearly reports, report exports, or report-like
  aggregate entities;
- trend charts or subject-comparison trend charts;
- Huangli daily fortune calendar entries;
- Venture, project, task, milestone, deadline, overdue, board, dependency,
  Gantt, or progress payloads;
- customer, client, consultant booking, or commerce CTA payloads;
- placeholder, mock, randomized, substitute, empty-success, or completion-marker
  content.

A reading that would require a forbidden output must fail closed.

## SJG-ASTRO-09 - Uncertainty Surface

```text
UncertaintyAnnotation {
  confidence: "low" | "medium" | "high"
  caveats: string[]
  data_gaps: string[]
}
```

Invariants:

- Every ready Reading carries uncertainty.
- The deterministic uncertainty decision table in `SJG-ALGO-10` sets the
  maximum confidence.
- Runtime AI may lower confidence in wording but must not raise it.
- Missing natal precision, incomplete related-person inputs, unresolved
  mentions, unavailable memory, and withheld consent must be surfaced.

## SJG-ASTRO-10 - Inputs Summary Expiry

`InputsSummary.captured_at` defines freshness:

- RiJing expires after 24 hours.
- YueJing expires after 7 days or when the rolling 30-day scope changes.
- NianJing expires after 30 days or when active concern tags / natal inputs
  change.
- MingJing expires after 180 days or when cited events / natal inputs / response
  preferences change (the natal chart itself is fixed).
- MingJing Relationship HePan expires after 180 days or when the related
  Person's natal inputs, related Person consent posture, `anchor_year`, scope
  payload, self-plus-person deterministic relationship evidence, or response
  preferences change. Stale relationship evidence must fail closed before any
  Runtime AI wording is generated.
- ShiJing consultation expires after 7 days for new AI turns.

Expired snapshots are retained on historical readings but must not be reused to
generate new wording.

## SJG-ASTRO-11 - Runtime Boundary

All AI generation for Reading runs through the Nimi runtime via
`@nimiplatform/sdk/runtime`. Direct HTTP/gRPC calls, hardcoded provider/model
literals, and fallback paths that mask runtime failure are forbidden.

## SJG-ASTRO-12 - MingJing Output

命镜 AI 解读 (`mirror_kind = mingjing`, `scope = natal`) is grounded in the
selected MingJing route from SJG-ALGO-18. Output shape is in
`tables/mirror-output-contract.yaml`. Runtime AI may word admitted prose fields
only after deterministic route evidence exists.

The BaZi route (`bazi_ziping_v1`) contains:

- `summary`: one-line 命局 overview (AI wording over a deterministic seed);
- `core`: 命局核心特点 — `personality` (性格底色), `strengths` (优势能力),
  `long_term_themes` (长期课题), `relationship_pattern` (关系模式),
  `career_inclination` (事业倾向). All five are AI wording grounded in
  旺衰/用神/十神/格局;
- `life_stage_strategies`: 长期阶段策略 — one entry per current/upcoming 大运. Its
  `phase_label` / `age_range` / `dayun_pillar` are deterministic; `theme` /
  `strategy` are AI wording (life-stage strategy, never per-day advice);
- `event_validations`: 历史事件验证 — deterministic resonance of each cited
  EventMemory onto the 大运/流年 timeline. Never AI-patched.

It must not:

- recompute pillars / DaYun / 格局 / 用神 (those are read-only evidence);
- assert deterministic fate from a historical event ("注定/必然"); events only
  calibrate emphasis and build resonance;
- create an astrology output entity outside `Reading`;
- emit any SJG-ASTRO-08 forbidden output.

The Ziwei route (`ziwei_sanhe_v1`) contains `output_kind =
ziwei_natal_brief`:

- `chart_basis`: deterministic 命宫 / 身宫 / 五行局 / 命主身主 / palace-count and
  四化 references from `ZiweiEvidence`;
- `profile`: AI wording over deterministic Ziwei natal evidence;
- `decade_guidance`: one entry per admitted decadal palace range selected by
  the route seed. Its age range, palace name/branch, and major stars are
  deterministic; theme and strategy are AI wording.

It must not:

- compute or mutate palaces, stars, 四化, 大限 ranges, or route support through
  Runtime AI;
- output relationship HePan, compatibility scores, match percentages, relation
  graphs, or trend curves;
- degrade into a year-by-year ledger or rankable numeric series.

## SJG-ASTRO-13 - MingJing Relationship HePan Output

MingJing Relationship HePan (`mirror_kind = mingjing`,
`scope = relationship_natal`) is grounded in deterministic self-plus-person
relationship evidence. It contains stable relationship structure and
anchor-year timing windows.

It must not output compatibility scores, match percentages, fate claims, trend
curves, relation graphs, contact-management payloads, or a Runtime-AI-only
reading. Runtime AI may word admitted prose fields only after deterministic
relationship evidence exists.
